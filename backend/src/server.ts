/** Local dev server — NOT used in Lambda */
import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`\n🌵 Cactus Intelligence API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
