import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/client';
import { verifyToken, requireAdmin } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import type { AuthRequest, DbUser } from '../types';

export const usersRouter = Router();
usersRouter.use(verifyToken);

// GET /api/users — list all team members (admin only)
usersRouter.get('/', requireAdmin, async (_req, res) => {
  const users = await query<Omit<DbUser, 'password_hash'>>(
    `SELECT id, email, name, role, is_active, last_login, created_at, invited_by
     FROM users ORDER BY created_at DESC`
  );
  res.json({ users });
});

// POST /api/users — admin creates / invites a new team member
usersRouter.post('/', requireAdmin, auditLog('create_user'), async (req: AuthRequest, res) => {
  const { email, name, role = 'analyst', password } = req.body as {
    email: string; name?: string; role?: string; password?: string;
  };

  if (!email) { res.status(400).json({ error: 'Email is required' }); return; }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing) { res.status(409).json({ error: 'User with this email already exists' }); return; }

  // If no password provided, generate a temporary one
  const tempPassword = password ?? `Temp${uuidv4().slice(0, 8)}!`;
  const hash = await bcrypt.hash(tempPassword, 12);

  const [user] = await query<DbUser>(
    `INSERT INTO users (email, name, password_hash, role, invited_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role, is_active, created_at`,
    [email.toLowerCase(), name ?? null, hash, role, req.user!.sub]
  );

  res.status(201).json({
    user,
    tempPassword,
    message: `User created. Share the temporary password: ${tempPassword}`,
  });
});

// PUT /api/users/:id — update name, role, or active status (admin only)
usersRouter.put('/:id', requireAdmin, auditLog('update_user'), async (req: AuthRequest, res) => {
  const { name, role, is_active } = req.body as {
    name?: string; role?: string; is_active?: boolean;
  };

  // Prevent admin from demoting themselves
  if (req.params.id === req.user!.sub && role && role !== 'admin') {
    res.status(400).json({ error: 'Cannot change your own role' });
    return;
  }

  const updates: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (name !== undefined)      { updates.push(`name = $${i++}`);      vals.push(name); }
  if (role !== undefined)      { updates.push(`role = $${i++}`);      vals.push(role); }
  if (is_active !== undefined) { updates.push(`is_active = $${i++}`); vals.push(is_active); }

  if (updates.length === 0) { res.status(400).json({ error: 'Nothing to update' }); return; }

  vals.push(req.params.id);
  const [user] = await query<DbUser>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, name, role, is_active`,
    vals
  );

  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user });
});

// POST /api/users/:id/reset-password — admin resets another user's password
usersRouter.post('/:id/reset-password', requireAdmin, auditLog('reset_password'), async (req, res) => {
  const { newPassword } = req.body as { newPassword?: string };
  const tempPassword = newPassword ?? `Cactus${uuidv4().slice(0, 8)}!`;
  const hash = await bcrypt.hash(tempPassword, 12);

  const result = await query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id', [hash, req.params.id]);
  if (!result.length) { res.status(404).json({ error: 'User not found' }); return; }

  res.json({ tempPassword, message: 'Password reset. Share the new temporary password with the user.' });
});

// DELETE /api/users/:id — deactivate (soft delete) (admin only)
usersRouter.delete('/:id', requireAdmin, auditLog('deactivate_user'), async (req: AuthRequest, res) => {
  if (req.params.id === req.user!.sub) {
    res.status(400).json({ error: 'Cannot deactivate your own account' });
    return;
  }
  await query('UPDATE users SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'User deactivated' });
});
