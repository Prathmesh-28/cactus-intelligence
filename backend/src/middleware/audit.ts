import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { pool } from '../db/client';

export function auditLog(action: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    // Fire-and-forget — don't block the request
    const analysisId = req.params.id ?? req.body?.analysisId ?? null;
    pool.query(
      `INSERT INTO audit_log (user_id, user_email, action, analysis_id, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.sub ?? null,
        req.user?.email ?? null,
        action,
        analysisId,
        req.body ? JSON.stringify(req.body) : null,
        req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null,
      ]
    ).catch(() => {}); // silently ignore audit failures
    next();
  };
}
