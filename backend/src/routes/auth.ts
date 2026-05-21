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
