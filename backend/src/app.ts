import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { analysesRouter } from './routes/analyses';
import { pipelineRouter } from './routes/pipeline';
import { usersRouter } from './routes/users';
import { settingsRouter } from './routes/settings';

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://cactus-b40b1.web.app',
  'https://cactus-b40b1.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean) as string[];

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(express.json({ limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      authRouter);
app.use('/api/analyses',  analysesRouter);
app.use('/api/pipeline',  pipelineRouter);
app.use('/api/users',     usersRouter);
app.use('/api/settings',  settingsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Cactus Intelligence API' });
});

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

export default app;
