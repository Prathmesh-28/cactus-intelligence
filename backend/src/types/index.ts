import type { Request } from 'express';

export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  invited_by: string | null;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: UserRole;
  name: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface DbAnalysis {
  id: string;
  company_name: string;
  company_slug: string;
  company_profile: Record<string, unknown> | null;
  competitors: Record<string, unknown> | null;
  org_charts: Record<string, unknown> | null;
  talent_insights: Record<string, unknown> | null;
  investment_signals: Record<string, unknown> | null;
  status: 'pending' | 'processing' | 'complete' | 'error';
  pipeline_step: number;
  error_message: string | null;
  created_by: string | null;
  last_edited_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: Date;
  updated_by: string | null;
}
