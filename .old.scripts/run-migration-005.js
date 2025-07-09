const { config } = require('dotenv');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration005() {
  try {
    console.log('🚀 Running migration 005: Add Audit Log Table');
    
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Check if migration has already been run
    const result = await pool.query(
      'SELECT id FROM migrations WHERE filename = $1',
      ['005_add_audit_log_table.sql']
    );

    if (result.rows.length > 0) {
      console.log('Migration 005 already executed, skipping...');
      return;
    }

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '005_add_audit_log_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(migrationSQL);
    
    // Record migration as completed
    await pool.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      ['005_add_audit_log_table.sql']
    );
    
    console.log('✅ Migration 005 completed successfully!');
    
    // Verify the audit log table
    console.log('\n🔍 Verifying audit log table...');
    
    const auditLogResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_log' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Audit log table structure:');
    auditLogResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check indexes
    const indexResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'audit_log'
    `);
    
    console.log('\n📊 Audit log indexes:');
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    console.log('\n🎉 Audit log table ready for cascade deletion tracking!');
    
  } catch (error) {
    console.error('❌ Migration 005 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration005();
