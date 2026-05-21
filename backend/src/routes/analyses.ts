import { Router, type Response } from 'express';
import { query, queryOne } from '../db/client';
import { verifyToken, requireAnalyst } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import type { AuthRequest, DbAnalysis } from '../types';

export const analysesRouter = Router();
analysesRouter.use(verifyToken);

// ── Helpers ──────────────────────────────────────────────────

function slug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
}

// ── GET /api/analyses — list (admin=all, others=own) ────────
analysesRouter.get('/', async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === 'admin';
  const rows = await query<DbAnalysis>(
    `SELECT a.id, a.company_name, a.company_slug, a.status, a.pipeline_step,
            a.created_at, a.updated_at, a.created_by, a.error_message,
            a.company_profile->'sector' AS sector,
            a.investment_signals->'signal' AS signal,
            u.name AS created_by_name, u.email AS created_by_email
     FROM analyses a
     LEFT JOIN users u ON u.id = a.created_by
     ${isAdmin ? '' : 'WHERE a.created_by = $1'}
     ORDER BY a.created_at DESC
     LIMIT 100`,
    isAdmin ? [] : [req.user!.sub]
  );
  res.json({ analyses: rows });
});

// ── GET /api/analyses/:id ────────────────────────────────────
analysesRouter.get('/:id', async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === 'admin';
  const a = await queryOne<DbAnalysis>(
    `SELECT * FROM analyses WHERE id = $1 ${isAdmin ? '' : 'AND created_by = $2'}`,
    isAdmin ? [req.params.id] : [req.params.id, req.user!.sub]
  );
  if (!a) { res.status(404).json({ error: 'Analysis not found' }); return; }

  // Attach due-diligence checks
  const checks = await query(
    'SELECT * FROM due_diligence_checks WHERE analysis_id = $1 ORDER BY created_at',
    [req.params.id]
  );
  const notes = await query(
    `SELECT n.*, u.name AS user_name, u.email AS user_email
     FROM team_notes n LEFT JOIN users u ON u.id = n.user_id
     WHERE n.analysis_id = $1 ORDER BY n.created_at DESC`,
    [req.params.id]
  );

  res.json({ analysis: a, checks, notes });
});

// ── POST /api/analyses — create new ─────────────────────────
analysesRouter.post('/', requireAnalyst, async (req: AuthRequest, res) => {
  const { company_name } = req.body as { company_name: string };
  if (!company_name?.trim()) { res.status(400).json({ error: 'company_name is required' }); return; }

  const company_slug = slug(company_name);

  // Check 24h cache
  const cached = await queryOne<DbAnalysis>(
    `SELECT * FROM analyses
     WHERE company_slug = $1 AND status = 'complete'
       AND created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC LIMIT 1`,
    [company_slug]
  );
  if (cached) {
    res.json({ analysis: cached, cached: true });
    return;
  }

  const [a] = await query<DbAnalysis>(
    `INSERT INTO analyses (company_name, company_slug, status, created_by)
     VALUES ($1, $2, 'pending', $3) RETURNING *`,
    [company_name.trim(), company_slug, req.user!.sub]
  );
  res.status(201).json({ analysis: a, cached: false });
});

// ── Granular PATCH endpoints — each section editable independently ──

async function patchSection(
  req: AuthRequest,
  res: Response,
  column: string,
  label: string
) {
  const { id } = req.params;
  const isAdmin = req.user!.role === 'admin';

  const existing = await queryOne<DbAnalysis>(
    `SELECT id FROM analyses WHERE id = $1 ${isAdmin ? '' : 'AND created_by = $2'}`,
    isAdmin ? [id] : [id, req.user!.sub]
  );
  if (!existing) { res.status(404).json({ error: 'Analysis not found' }); return; }

  // Log old value for audit
  const old = await queryOne(`SELECT ${column} FROM analyses WHERE id = $1`, [id]);

  await query(
    `UPDATE analyses SET ${column} = $1::jsonb, last_edited_by = $2, updated_at = NOW() WHERE id = $3`,
    [JSON.stringify(req.body.data), req.user!.sub, id]
  );

  // Audit
  await query(
    `INSERT INTO audit_log (user_id, user_email, action, analysis_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      req.user!.sub, req.user!.email, `edit_${label}`, id,
      JSON.stringify((old as Record<string, unknown>)?.[column] ?? null),
      JSON.stringify(req.body.data),
    ]
  );

  res.json({ message: `${label} updated` });
}

analysesRouter.patch('/:id/profile',   requireAnalyst, (req: AuthRequest, res) => patchSection(req, res, 'company_profile', 'profile'));
analysesRouter.patch('/:id/competitors', requireAnalyst, (req: AuthRequest, res) => patchSection(req, res, 'competitors', 'competitors'));
analysesRouter.patch('/:id/orgcharts', requireAnalyst, (req: AuthRequest, res) => patchSection(req, res, 'org_charts', 'orgcharts'));
analysesRouter.patch('/:id/talent',    requireAnalyst, (req: AuthRequest, res) => patchSection(req, res, 'talent_insights', 'talent'));
analysesRouter.patch('/:id/signals',   requireAnalyst, (req: AuthRequest, res) => patchSection(req, res, 'investment_signals', 'signals'));

// PATCH /api/analyses/:id/orgcharts/:companyKey — update a single company's org chart
analysesRouter.patch('/:id/orgcharts/:companyKey', requireAnalyst, auditLog('edit_orgchart_node'), async (req: AuthRequest, res) => {
  const { id, companyKey } = req.params;
  const { data } = req.body as { data: Record<string, unknown> };

  const existing = await queryOne<DbAnalysis>('SELECT org_charts FROM analyses WHERE id = $1', [id]);
  if (!existing) { res.status(404).json({ error: 'Analysis not found' }); return; }

  const orgCharts = (existing.org_charts as Record<string, unknown>) ?? {};
  orgCharts[companyKey] = data;

  await query(
    `UPDATE analyses SET org_charts = $1::jsonb, last_edited_by = $2, updated_at = NOW() WHERE id = $3`,
    [JSON.stringify(orgCharts), req.user!.sub, id]
  );
  res.json({ message: `Org chart for ${companyKey} updated` });
});

// ── Due diligence checks ──────────────────────────────────────

analysesRouter.post('/:id/checks', requireAnalyst, async (req: AuthRequest, res) => {
  const { item_text } = req.body as { item_text: string };
  const [check] = await query(
    `INSERT INTO due_diligence_checks (analysis_id, item_text) VALUES ($1, $2) RETURNING *`,
    [req.params.id, item_text]
  );
  res.status(201).json({ check });
});

analysesRouter.patch('/:id/checks/:checkId', requireAnalyst, async (req: AuthRequest, res) => {
  const { completed } = req.body as { completed: boolean };
  const [check] = await query(
    `UPDATE due_diligence_checks SET completed = $1, completed_at = $2, completed_by = $3
     WHERE id = $4 AND analysis_id = $5 RETURNING *`,
    [completed, completed ? new Date() : null, req.user!.sub, req.params.checkId, req.params.id]
  );
  res.json({ check });
});

// ── Team notes ────────────────────────────────────────────────

analysesRouter.post('/:id/notes', requireAnalyst, async (req: AuthRequest, res) => {
  const { content } = req.body as { content: string };
  const [note] = await query(
    `INSERT INTO team_notes (analysis_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [req.params.id, req.user!.sub, content]
  );
  res.status(201).json({ note });
});

analysesRouter.delete('/:id/notes/:noteId', requireAnalyst, async (req: AuthRequest, res) => {
  await query(
    `DELETE FROM team_notes WHERE id = $1 AND (user_id = $2 OR $3 = 'admin')`,
    [req.params.noteId, req.user!.sub, req.user!.role]
  );
  res.json({ message: 'Note deleted' });
});

// ── Audit log for an analysis (admin only) ────────────────────
analysesRouter.get('/:id/audit', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
  const log = await query(
    'SELECT * FROM audit_log WHERE analysis_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.params.id]
  );
  res.json({ log });
});

// ── DELETE /api/analyses/:id ──────────────────────────────────
analysesRouter.delete('/:id', async (req: AuthRequest, res) => {
  const isAdmin = req.user!.role === 'admin';
  const result = await query(
    `DELETE FROM analyses WHERE id = $1 ${isAdmin ? '' : 'AND created_by = $2'} RETURNING id`,
    isAdmin ? [req.params.id] : [req.params.id, req.user!.sub]
  );
  if (!result.length) { res.status(404).json({ error: 'Analysis not found' }); return; }
  res.json({ message: 'Analysis deleted' });
});
