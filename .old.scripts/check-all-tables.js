const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@pg-3595fcb-hol619.b.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkAllTables() {
  try {
    console.log('🔍 Checking all tables in database...');
    
    // List all tables
    const allTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 All tables in database:');
    allTablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Check if timesheets table exists
    const timesheetsExists = allTablesResult.rows.some(row => row.table_name === 'timesheets');
    console.log(`\n⏰ Timesheets table exists: ${timesheetsExists}`);
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await pool.end();
  }
}

checkAllTables();
