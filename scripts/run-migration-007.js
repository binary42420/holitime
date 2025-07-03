const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'holitime',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('🚀 Running Migration 007: Add No Show Status Support...');

    // Check if migration has already been run
    const migrationCheck = await pool.query(
      'SELECT * FROM migrations WHERE filename = $1',
      ['007_add_no_show_status.sql']
    );

    if (migrationCheck.rows.length > 0) {
      console.log('✅ Migration 007 has already been executed');
      return;
    }

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '007_add_no_show_status.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(migrationSQL);
    
    // Record migration as completed
    await pool.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      ['007_add_no_show_status.sql']
    );

    console.log('✅ Migration 007 completed successfully');
    console.log('📝 Added no_show status to assigned_personnel table');
    console.log('📝 Created shift_logs table for action logging');

  } catch (error) {
    console.error('❌ Migration 007 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
