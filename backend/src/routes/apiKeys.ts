import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { verifyToken, requireAdmin } from '../middleware/auth';
import type { AuthRequest } from '../types';

export const apiKeysRouter = Router();
apiKeysRouter.use(verifyToken, requireAdmin);

const ENV_FILE = path.join(__dirname, '../../.env');

const KEY_MAP: Record<string, string> = {
  anthropic:  'ANTHROPIC_API_KEY',
  openai:     'OPENAI_API_KEY',
  google:     'GOOGLE_AI_API_KEY',
  lusha:      'LUSHA_API_KEY',
};

function readEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_FILE)) return {};
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split('\n');
  const out: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

function writeEnvFile(vars: Record<string, string>): void {
  const existing = readEnvFile();
  const merged = { ...existing, ...vars };
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
}

// GET /api/admin/api-keys — return which keys are set (masked values)
apiKeysRouter.get('/', (_req, res) => {
  const env = readEnvFile();
  const status: Record<string, { set: boolean; preview: string }> = {};
  for (const [id, envKey] of Object.entries(KEY_MAP)) {
    const val = process.env[envKey] ?? env[envKey] ?? '';
    status[id] = {
      set: val.length > 4,
      preview: val.length > 4 ? val.slice(0, 6) + '…' + val.slice(-4) : '',
    };
  }
  res.json({ keys: status, isLocalhost: process.env.NODE_ENV !== 'production' });
});

// POST /api/admin/api-keys — write keys to .env and set on process.env
apiKeysRouter.post('/', async (req: AuthRequest, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'API keys cannot be set via UI in production. Use Render environment variables.' });
    return;
  }

  const updates = req.body as Record<string, string>;
  const envUpdates: Record<string, string> = {};

  for (const [id, value] of Object.entries(updates)) {
    const envKey = KEY_MAP[id];
    if (!envKey || typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    envUpdates[envKey] = trimmed;
    process.env[envKey] = trimmed; // live-reload without restart
  }

  if (Object.keys(envUpdates).length === 0) {
    res.status(400).json({ error: 'No valid keys provided' });
    return;
  }

  writeEnvFile(envUpdates);
  res.json({ updated: Object.keys(envUpdates).length, message: 'Keys saved to .env and applied immediately' });
});
