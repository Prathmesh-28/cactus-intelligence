/** Runs schema.sql against the configured DATABASE_URL. Usage: npm run migrate */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from './client';

export async function runMigration(): Promise<void> {
  const sqlPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.warn('schema.sql not found at', sqlPath, '— skipping migration');
    return;
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✓ Schema applied successfully');
  } finally {
    client.release();
  }
}

// Run directly: npm run migrate
if (require.main === module) {
  runMigration().then(() => pool.end()).catch(err => { console.error(err); process.exit(1); });
}
