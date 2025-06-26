const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function runMigrations() {
  try {
    // Import the migration function
    const { runMigrations, seedDatabase } = require('../src/lib/migrate.ts');
    
    console.log('Starting database migrations...');
    await runMigrations();
    
    console.log('Starting database seeding...');
    await seedDatabase();
    
    console.log('Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

runMigrations();
