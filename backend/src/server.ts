import 'dotenv/config';
import app from './app';
import { runMigration } from './db/migrate';
import { runSeed } from './db/seed';

const PORT = process.env.PORT ?? 4000;

async function main() {
  try {
    await runMigration();
    await runSeed();
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`\n🌵 Cactus Intelligence API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}

main();
