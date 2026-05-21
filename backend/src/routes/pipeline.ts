import { Router } from 'express';
import { query, queryOne } from '../db/client';
import { verifyToken, requireAnalyst } from '../middleware/auth';
import { runStep } from '../services/pipeline';
import type { AuthRequest, DbAnalysis } from '../types';

export const pipelineRouter = Router();
pipelineRouter.use(verifyToken, requireAnalyst);

/**
 * POST /api/pipeline/step
 * Body: { analysisId, action: 'profile'|'competitors'|'orgcharts'|'talent'|'signals', companyName }
 *
 * Each step call runs synchronously and writes results to DB.
 * Frontend calls steps sequentially, polling after each.
 */
pipelineRouter.post('/step', async (req: AuthRequest, res) => {
  const { analysisId, action, companyName } = req.body as {
    analysisId: string;
    action: 'profile' | 'competitors' | 'orgcharts' | 'talent' | 'signals';
    companyName: string;
  };

  if (!analysisId || !action || !companyName) {
    res.status(400).json({ error: 'analysisId, action, and companyName are required' });
    return;
  }

  const validActions = ['profile', 'competitors', 'orgcharts', 'talent', 'signals'];
  if (!validActions.includes(action)) {
    res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
    return;
  }

  // Verify ownership
  const isAdmin = req.user!.role === 'admin';
  const existing = await queryOne<DbAnalysis>(
    `SELECT id, status FROM analyses WHERE id = $1 ${isAdmin ? '' : 'AND created_by = $2'}`,
    isAdmin ? [analysisId] : [analysisId, req.user!.sub]
  );
  if (!existing) { res.status(404).json({ error: 'Analysis not found' }); return; }

  try {
    await runStep(action, analysisId, companyName);

    const updated = await queryOne<DbAnalysis>(
      'SELECT id, status, pipeline_step, company_profile, competitors, org_charts, talent_insights, investment_signals FROM analyses WHERE id = $1',
      [analysisId]
    );
    res.json({ success: true, action, analysis: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pipeline step failed';
    await query(
      `UPDATE analyses SET status = 'error', error_message = $1 WHERE id = $2`,
      [message, analysisId]
    );
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/pipeline/status/:analysisId
 * Poll to get current pipeline step and status.
 */
pipelineRouter.get('/status/:analysisId', async (req: AuthRequest, res) => {
  const a = await queryOne<DbAnalysis>(
    'SELECT id, status, pipeline_step, error_message, updated_at FROM analyses WHERE id = $1',
    [req.params.analysisId]
  );
  if (!a) { res.status(404).json({ error: 'Analysis not found' }); return; }
  res.json({ status: a.status, step: a.pipeline_step, error: a.error_message });
});
