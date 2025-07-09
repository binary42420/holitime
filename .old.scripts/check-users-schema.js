const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkUsersSchema() {
  try {
    console.log('🔍 Checking users table schema...');
    
    // Check users table structure
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Users table schema:');
    console.table(schemaResult.rows);
    
    // Check client data
    const clientsResult = await pool.query(`
      SELECT id, name, email, role
      FROM users 
      WHERE role = 'Client'
    `);
    
    console.log('👥 Client users:');
    console.table(clientsResult.rows);
    
    // Check the specific job and client relationship
    const jobResult = await pool.query(`
      SELECT j.id, j.name, j.client_id, u.name as client_name, u.role
      FROM jobs j
      JOIN users u ON j.client_id = u.id
      WHERE j.id = '01e1b522-f0d8-45b5-a2df-66cd7a6e0a54'
    `);
    
    console.log('🏢 Job and client relationship:');
    console.table(jobResult.rows);
    
  } catch (error) {
    console.error('❌ Error checking users schema:', error);
  } finally {
    await pool.end();
  }
}

checkUsersSchema();
