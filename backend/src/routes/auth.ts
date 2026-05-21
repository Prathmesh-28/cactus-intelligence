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
