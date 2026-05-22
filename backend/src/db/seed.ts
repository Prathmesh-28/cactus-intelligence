/**
 * Seed script — run once after schema migration.
 * Creates admin user + default settings.
 *
 * Usage: npm run seed
 * Default admin password: CactusVC@2025!  ← change immediately after first login
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './client';

const ADMIN_EMAIL = 'prathamesh.walimbe@cactuspartners.in';
const ADMIN_NAME = 'Prathamesh Walimbe';
const ADMIN_PASSWORD = 'CactusVC@2025!';

const DEFAULT_SETTINGS = [
  {
    key: 'firm_name',
    value: '"Cactus Partners"',
    description: 'Firm display name shown on reports and emails',
  },
  {
    key: 'firm_website',
    value: '"cactusvp.com"',
    description: 'Firm website URL',
  },
  {
    key: 'ai_provider',
    value: '"google"',
    description: 'AI provider for the pipeline: anthropic | openai | google',
  },
  {
    key: 'ai_model',
    value: '"gemini-2.0-flash"',
    description: 'Model ID for the selected provider. Must match the provider\'s model catalog.',
  },
  {
    key: 'anthropic_model',
    value: '"claude-sonnet-4-6"',
    description: '(Legacy) Anthropic model — superseded by ai_provider + ai_model',
  },
  {
    key: 'analysis_cache_hours',
    value: '24',
    description: 'How many hours before a cached analysis is considered stale',
  },
  {
    key: 'max_competitors',
    value: '5',
    description: 'Number of competitors to identify per analysis',
  },
  {
    key: 'lusha_enabled',
    value: 'true',
    description: 'Whether to enrich org charts with Lusha data',
  },
  {
    key: 'lusha_seniority_levels',
    value: '["c_level","vp","director"]',
    description: 'Seniority levels to fetch from Lusha for org charts',
  },
  {
    key: 'investment_focus',
    value: '"India-focused VC backing advanced manufacturing, technology, and consumer companies"',
    description: 'Investment mandate injected into AI prompts — edit to adjust analysis tone',
  },
  {
    key: 'report_disclaimer',
    value: '"This report is generated using AI-powered public data research. Cactus Partners recommends independent verification of all data prior to investment decisions."',
    description: 'Disclaimer printed on PDF exports',
  },
  {
    key: 'allowed_email_domains',
    value: '["cactuspartners.in"]',
    description: 'Email domains allowed to self-register. Leave empty to require admin invite.',
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Admin user ────────────────────────────────────────────
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      // Update password in case it was reset
      await client.query(
        'UPDATE users SET password_hash = $1, role = $2, is_active = TRUE WHERE email = $3',
        [hash, 'admin', ADMIN_EMAIL]
      );
      console.log(`✓ Admin user already exists — password reset to default`);
    } else {
      await client.query(
        `INSERT INTO users (email, name, password_hash, role)
         VALUES ($1, $2, $3, 'admin')`,
        [ADMIN_EMAIL, ADMIN_NAME, hash]
      );
      console.log(`✓ Admin user created: ${ADMIN_EMAIL}`);
    }

    // ── Default settings ──────────────────────────────────────
    for (const s of DEFAULT_SETTINGS) {
      await client.query(
        `INSERT INTO settings (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description`,
        [s.key, s.value, s.description]
      );
    }
    console.log(`✓ ${DEFAULT_SETTINGS.length} default settings upserted`);

    await client.query('COMMIT');
    console.log('\n🌵 Seed complete!');
    console.log(`\nAdmin login:\n  Email:    ${ADMIN_EMAIL}\n  Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  Change the admin password immediately after first login!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
