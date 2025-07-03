require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addRequestedWorkersColumn() {
  try {
    console.log('Adding requested_workers column to shifts table...');
    
    await pool.query(`
      ALTER TABLE shifts 
      ADD COLUMN IF NOT EXISTS requested_workers INTEGER DEFAULT 1;
    `);
    
    console.log('✅ Successfully added requested_workers column');
    
    // Update existing shifts with a default value
    await pool.query(`
      UPDATE shifts 
      SET requested_workers = 1 
      WHERE requested_workers IS NULL;
    `);
    
    console.log('✅ Updated existing shifts with default requested_workers value');
    
  } catch (error) {
    console.error('❌ Error adding column:', error);
  } finally {
    await pool.end();
  }
}

addRequestedWorkersColumn();
