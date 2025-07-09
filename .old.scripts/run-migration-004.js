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

async function runMigration004() {
  try {
    console.log('🚀 Running migration 004: Restructure Client Model and Crew Chief Permissions');
    
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
      ['004_restructure_client_model_and_crew_chief_permissions.sql']
    );

    if (result.rows.length > 0) {
      console.log('Migration 004 already executed, skipping...');
      return;
    }

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '004_restructure_client_model_and_crew_chief_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(migrationSQL);
    
    // Record migration as completed
    await pool.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      ['004_restructure_client_model_and_crew_chief_permissions.sql']
    );
    
    console.log('✅ Migration 004 completed successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying migration results...');
    
    // Check clients table
    const clientsResult = await pool.query('SELECT COUNT(*) FROM clients');
    console.log(`📊 Clients table created with ${clientsResult.rows[0].count} records`);
    
    // Check crew_chief_permissions table
    const permissionsResult = await pool.query('SELECT COUNT(*) FROM crew_chief_permissions');
    console.log(`📊 Crew chief permissions table created with ${permissionsResult.rows[0].count} records`);
    
    // Check users table modifications
    const usersResult = await pool.query(`
      SELECT COUNT(*) as total_users,
             COUNT(CASE WHEN client_company_id IS NOT NULL THEN 1 END) as users_with_company
      FROM users WHERE role = 'Client'
    `);
    console.log(`📊 Client users: ${usersResult.rows[0].total_users} total, ${usersResult.rows[0].users_with_company} linked to companies`);
    
    // Check jobs table modifications
    const jobsResult = await pool.query(`
      SELECT COUNT(*) as total_jobs,
             COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) as jobs_with_client
      FROM jobs
    `);
    console.log(`📊 Jobs: ${jobsResult.rows[0].total_jobs} total, ${jobsResult.rows[0].jobs_with_client} linked to client companies`);
    
  } catch (error) {
    console.error('❌ Migration 004 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration004();
