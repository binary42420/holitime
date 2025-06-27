const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fixCrewChiefConstraint() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Fixing crew_chief_id constraint in shifts table...');
    
    // Remove NOT NULL constraint from crew_chief_id
    await pool.query(`
      ALTER TABLE shifts ALTER COLUMN crew_chief_id DROP NOT NULL
    `);
    
    console.log('✅ Successfully removed NOT NULL constraint from crew_chief_id');

    // Check current schema
    const schemaResult = await pool.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'shifts' AND column_name = 'crew_chief_id'
    `);

    console.log('Current crew_chief_id column info:');
    console.table(schemaResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixCrewChiefConstraint();
