import 'dotenv/config';
import app from './app';
import { runMigration } from './db/migrate';

const PORT = process.env.PORT ?? 4000;

async function main() {
  try {
    await runMigration();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`\n🌵 Cactus Intelligence API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}

main();
