/*
 * Seed the world only when the database has no content yet, so that
 * redeploys never clobber admin-edited content or player accounts.
 * Executed by Fly's release_command after `prisma migrate deploy`.
 */
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('node:child_process');

(async () => {
  const prisma = new PrismaClient();
  try {
    const planetCount = await prisma.planet.count();
    if (planetCount > 0) {
      console.log(`World already seeded (${planetCount} planets present) — skipping seed.`);
      return;
    }
    console.log('Empty database detected — seeding world content...');
    execSync('npm run db:seed', { stdio: 'inherit' });
    console.log('Seed complete.');
  } finally {
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error('seed-if-empty failed:', error);
  process.exit(1);
});
