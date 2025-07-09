import { execSync } from 'child_process';

async function globalSetup() {
  console.log('Running global setup: seeding database...');
  try {
    execSync('cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/seed-database.js', { stdio: 'inherit' });
    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
}

export default globalSetup;