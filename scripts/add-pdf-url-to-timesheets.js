require('dotenv').config({ path: '.env.local' });
const { getPool } = require('@/lib/db');

async function addPdfUrlColumn() {
  console.log('Starting migration script...');
  let client;
  try {
    console.log('Getting database pool...');
    const pool = getPool();
    if (!pool) {
      console.error('Failed to get database pool.');
      process.exit(1);
    }

    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Database connection successful.');

    console.log('Executing ALTER TABLE query...');
    await client.query(`
      ALTER TABLE timesheets
      ADD COLUMN IF NOT EXISTS pdf_url TEXT;
    `);
    console.log('Successfully added pdf_url column to timesheets table.');
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    if (client) {
      console.log('Releasing database client...');
      client.release();
    }
    console.log('Migration script finished.');
    // The pool should be ended by the calling process, not here.
  }
}

addPdfUrlColumn();