import { Router } from 'express';
import { query, queryOne } from '../db/client';
import { verifyToken, requireAdmin } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import type { AuthRequest, DbSetting } from '../types';

export const settingsRouter = Router();
settingsRouter.use(verifyToken);

// GET /api/settings — all settings (all authenticated users can read)
settingsRouter.get('/', async (_req, res) => {
  const rows = await query<DbSetting>('SELECT key, value, description, updated_at FROM settings ORDER BY key');
  // Return as a flat key→value map for convenience
  const map: Record<string, unknown> = {};
  const meta: Record<string, { description: string | null; updated_at: Date }> = {};
  for (const r of rows) {
    map[r.key] = r.value;
    meta[r.key] = { description: r.description, updated_at: r.updated_at };
  }
  res.json({ settings: map, meta });
});

// GET /api/settings/:key — single setting
settingsRouter.get('/:key', async (req, res) => {
  const s = await queryOne<DbSetting>('SELECT * FROM settings WHERE key = $1', [req.params.key]);
  if (!s) { res.status(404).json({ error: 'Setting not found' }); return; }
  res.json({ key: s.key, value: s.value, description: s.description });
});

// PUT /api/settings/:key — update a setting (admin only)
settingsRouter.put('/:key', requireAdmin, auditLog('update_setting'), async (req: AuthRequest, res) => {
  const { value } = req.body as { value: unknown };
  if (value === undefined) { res.status(400).json({ error: 'value is required' }); return; }

  const [updated] = await query<DbSetting>(
    `INSERT INTO settings (key, value, updated_by)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by
     RETURNING key, value, description, updated_at`,
    [req.params.key, JSON.stringify(value), req.user!.sub]
  );

  res.json({ setting: updated });
});

// PATCH /api/settings — bulk update multiple settings (admin only)
settingsRouter.patch('/', requireAdmin, auditLog('bulk_update_settings'), async (req: AuthRequest, res) => {
  const updates = req.body as Record<string, unknown>;
  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Body must be a key-value object' });
    return;
  }

  const entries = Object.entries(updates);
  if (entries.length === 0) { res.status(400).json({ error: 'No settings provided' }); return; }

  const results: DbSetting[] = [];
  for (const [key, value] of entries) {
    const [row] = await query<DbSetting>(
      `INSERT INTO settings (key, value, updated_by)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by
       RETURNING key, value, description, updated_at`,
      [key, JSON.stringify(value), req.user!.sub]
    );
    results.push(row);
  }

  res.json({ updated: results.length, settings: results });
});
