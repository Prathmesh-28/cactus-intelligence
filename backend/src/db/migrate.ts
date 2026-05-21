/** Runs schema.sql against the configured DATABASE_URL. Usage: npm run migrate */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from './client';

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✓ Schema applied successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
