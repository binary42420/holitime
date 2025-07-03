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
    console.log('🚀 Running Migration 009: Add OSHA Compliant Trait...');

    // Check if migration has already been run
    const migrationCheck = await pool.query(
      'SELECT * FROM migrations WHERE filename = $1',
      ['009_add_osha_compliant_trait.sql']
    );

    if (migrationCheck.rows.length > 0) {
      console.log('✅ Migration 009 has already been executed');
      return;
    }

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '009_add_osha_compliant_trait.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(migrationSQL);
    
    // Record migration as completed
    await pool.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      ['009_add_osha_compliant_trait.sql']
    );

    console.log('✅ Migration 009 completed successfully');
    console.log('📝 Added osha_compliant column to users table');

    // Verify the column was added
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'osha_compliant'
    `);

    if (schemaCheck.rows.length === 1) {
      console.log('✅ OSHA compliant column verified:');
      console.table(schemaCheck.rows);
    } else {
      console.log('❌ OSHA compliant column not found');
    }

  } catch (error) {
    console.error('❌ Migration 009 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
