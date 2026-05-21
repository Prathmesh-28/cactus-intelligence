const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

function getToken(): string | null {
  return localStorage.getItem('cactus_token');
}

export function setToken(token: string) {
  localStorage.setItem('cactus_token', token);
}

export function clearToken() {
  localStorage.removeItem('cactus_token');
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: res.statusText })) as { error?: string } & T;

  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data;
}

const get  = <T>(path: string)              => request<T>('GET',    path);
const post = <T>(path: string, body: unknown) => request<T>('POST',   path, body);
const put  = <T>(path: string, body: unknown) => request<T>('PUT',    path, body);
const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);
const del  = <T>(path: string)              => request<T>('DELETE', path);

// ── Auth ──────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string, rememberMe?: boolean) =>
    post<{ token: string; user: ApiUser }>('/api/auth/login', { email, password, rememberMe }),

  register: (email: string, name: string, password: string) =>
    post<{ token: string; user: ApiUser }>('/api/auth/register', { email, name, password }),

  firebaseSync: (idToken: string) =>
    post<{ token: string; user: ApiUser }>('/api/auth/firebase-sync', { idToken }),

  me: () => get<{ user: ApiUser }>('/api/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    put<{ message: string }>('/api/auth/password', { currentPassword, newPassword }),
};

// ── Analyses ──────────────────────────────────────────────────
export const analyses = {
  list: () => get<{ analyses: ApiAnalysis[] }>('/api/analyses'),

  get: (id: string) =>
    get<{ analysis: ApiAnalysis; checks: ApiCheck[]; notes: ApiNote[] }>(`/api/analyses/${id}`),

  create: (company_name: string) =>
    post<{ analysis: ApiAnalysis; cached: boolean }>('/api/analyses', { company_name }),

  delete: (id: string) => del(`/api/analyses/${id}`),

  patchProfile: (id: string, data: unknown) =>
    patch(`/api/analyses/${id}/profile`, { data }),

  patchCompetitors: (id: string, data: unknown) =>
    patch(`/api/analyses/${id}/competitors`, { data }),

  patchOrgCharts: (id: string, data: unknown) =>
    patch(`/api/analyses/${id}/orgcharts`, { data }),

  patchOrgChart: (id: string, companyKey: string, data: unknown) =>
    patch(`/api/analyses/${id}/orgcharts/${encodeURIComponent(companyKey)}`, { data }),

  patchTalent: (id: string, data: unknown) =>
    patch(`/api/analyses/${id}/talent`, { data }),

  patchSignals: (id: string, data: unknown) =>
    patch(`/api/analyses/${id}/signals`, { data }),

  addCheck: (id: string, item_text: string) =>
    post(`/api/analyses/${id}/checks`, { item_text }),

  toggleCheck: (id: string, checkId: string, completed: boolean) =>
    patch(`/api/analyses/${id}/checks/${checkId}`, { completed }),

  addNote: (id: string, content: string) =>
    post(`/api/analyses/${id}/notes`, { content }),

  deleteNote: (id: string, noteId: string) =>
    del(`/api/analyses/${id}/notes/${noteId}`),

  getAuditLog: (id: string) =>
    get<{ log: AuditEntry[] }>(`/api/analyses/${id}/audit`),
};

// ── Pipeline ──────────────────────────────────────────────────
export const pipeline = {
  runStep: (analysisId: string, action: PipelineAction, companyName: string) =>
    post<{ success: boolean; action: string; analysis: ApiAnalysis }>('/api/pipeline/step', {
      analysisId, action, companyName,
    }),

  getStatus: (analysisId: string) =>
    get<{ status: string; step: number; error: string | null }>(`/api/pipeline/status/${analysisId}`),
};

// ── Users (admin) ─────────────────────────────────────────────
export const users = {
  list: () => get<{ users: ApiUser[] }>('/api/users'),

  create: (email: string, name?: string, role?: string, password?: string) =>
    post<{ user: ApiUser; tempPassword: string; message: string }>('/api/users', {
      email, name, role, password,
    }),

  update: (id: string, updates: Partial<{ name: string; role: string; is_active: boolean }>) =>
    put<{ user: ApiUser }>(`/api/users/${id}`, updates),

  resetPassword: (id: string, newPassword?: string) =>
    post<{ tempPassword: string; message: string }>(`/api/users/${id}/reset-password`, { newPassword }),

  deactivate: (id: string) => del(`/api/users/${id}`),
};

// ── Settings (admin) ──────────────────────────────────────────
export const settings = {
  getAll: () => get<{ settings: Record<string, unknown>; meta: Record<string, unknown> }>('/api/settings'),
  get: (key: string) => get<{ key: string; value: unknown; description: string }>(`/api/settings/${key}`),
  set: (key: string, value: unknown) => put(`/api/settings/${key}`, { value }),
  bulkUpdate: (updates: Record<string, unknown>) => patch('/api/settings', updates),
};

// ── Types ─────────────────────────────────────────────────────
export type UserRole = 'admin' | 'analyst' | 'viewer';
export type PipelineAction = 'profile' | 'competitors' | 'orgcharts' | 'talent' | 'signals';

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  is_active?: boolean;
  last_login?: string | null;
  created_at?: string;
  invited_by?: string | null;
}

export interface ApiAnalysis {
  id: string;
  company_name: string;
  company_slug: string;
  company_profile: Record<string, unknown> | null;
  competitors: { competitors: Record<string, unknown>[] } | null;
  org_charts: Record<string, unknown> | null;
  talent_insights: Record<string, unknown> | null;
  investment_signals: Record<string, unknown> | null;
  status: 'pending' | 'processing' | 'complete' | 'error';
  pipeline_step: number;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined fields from list view
  sector?: unknown;
  signal?: unknown;
  created_by_name?: string;
  created_by_email?: string;
}

export interface ApiCheck {
  id: string;
  analysis_id: string;
  item_text: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export interface ApiNote {
  id: string;
  analysis_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

export interface AuditEntry {
  id: string;
  user_email: string | null;
  action: string;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
  ip_address: string | null;
}

export { ApiError };
