import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db/client';
import { signToken, verifyToken } from '../middleware/auth';
import type { AuthRequest, DbUser } from '../types';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body as {
      email: string; password: string; rememberMe?: boolean;
    };

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await queryOne<DbUser>(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase().trim()]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = signToken(
      { sub: user.id, email: user.email, role: user.role, name: user.name },
      rememberMe
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register — self-registration (domain-restricted)
authRouter.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body as {
      email: string; name: string; password: string;
    };

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, name and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const domain = normalizedEmail.split('@')[1];

    // Check allowed domains from settings
    const setting = await queryOne<{ value: unknown }>(
      "SELECT value FROM settings WHERE key = 'allowed_email_domains'"
    );
    const allowedDomains = (setting?.value as string[] | null) ?? ['cactuspartners.in'];
    if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
      res.status(403).json({
        error: `Registration is restricted to: ${allowedDomains.join(', ')}`,
      });
      return;
    }

    const existing = await queryOne<DbUser>(
      'SELECT id FROM users WHERE email = $1', [normalizedEmail]
    );
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const [user] = await query<DbUser>(
      `INSERT INTO users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'analyst', TRUE) RETURNING id, email, name, role`,
      [normalizedEmail, name.trim(), hash]
    );

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/firebase-sync — exchange Firebase ID token for our JWT
authRouter.post('/firebase-sync', async (req, res) => {
  try {
    const { idToken } = req.body as { idToken: string };
    if (!idToken) { res.status(400).json({ error: 'idToken required' }); return; }

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'Firebase not configured on server' }); return; }

    // Verify with Google
    const googleRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!googleRes.ok) { res.status(401).json({ error: 'Invalid Firebase token' }); return; }

    const googleData = await googleRes.json() as {
      users?: Array<{ email: string; displayName?: string; localId: string }>;
    };
    const fbUser = googleData.users?.[0];
    if (!fbUser?.email) { res.status(401).json({ error: 'Could not retrieve Firebase user' }); return; }

    const email = fbUser.email.toLowerCase();
    const displayName = fbUser.displayName || email.split('@')[0];

    // Find or auto-create in PostgreSQL
    let dbUser = await queryOne<DbUser>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (!dbUser) {
      const domain = email.split('@')[1];
      const setting = await queryOne<{ value: unknown }>(
        "SELECT value FROM settings WHERE key = 'allowed_email_domains'"
      );
      const allowed = (setting?.value as string[]) ?? ['cactuspartners.in'];
      if (allowed.length > 0 && !allowed.includes(domain)) {
        res.status(403).json({ error: `Registration not allowed for domain: ${domain}` });
        return;
      }

      const [created] = await query<DbUser>(
        `INSERT INTO users (email, name, password_hash, role, is_active)
         VALUES ($1, $2, '', 'analyst', TRUE)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, is_active = TRUE
         RETURNING *`,
        [email, displayName]
      );
      dbUser = created;
    }

    if (!dbUser.is_active) {
      res.status(403).json({ error: 'Account is deactivated. Contact your admin.' });
      return;
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [dbUser.id]);

    const token = signToken({ sub: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.name });
    res.json({ token, user: { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role } });
  } catch (err) {
    console.error('Firebase sync error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me — validate token + return current user
authRouter.get('/me', verifyToken, async (req: AuthRequest, res) => {
  const user = await queryOne<DbUser>(
    'SELECT id, email, name, role, last_login, created_at FROM users WHERE id = $1 AND is_active = TRUE',
    [req.user!.sub]
  );
  if (!user) { res.status(401).json({ error: 'User not found' }); return; }
  res.json({ user });
});

// PUT /api/auth/password — change own password
authRouter.put('/password', verifyToken, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string; newPassword: string;
  };

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  const user = await queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [req.user!.sub]);
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    res.status(401).json({ error: 'Current password is incorrect' });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
  res.json({ message: 'Password updated successfully' });
});
