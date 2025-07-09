const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function addIsActiveColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'time_entries' AND column_name = 'is_active'
    `);

    if (checkResult.rows.length === 0) {
      console.log('Adding is_active column to time_entries table...');
      
      await pool.query(`
        ALTER TABLE time_entries ADD COLUMN is_active BOOLEAN DEFAULT false
      `);
      
      console.log('Successfully added is_active column!');
    } else {
      console.log('is_active column already exists.');
    }

    // Show current schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'time_entries'
      ORDER BY ordinal_position
    `);

    console.log('Current time_entries table schema:');
    console.table(schemaResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addIsActiveColumn();
