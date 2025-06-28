const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkShiftsTable() {
  try {
    console.log('🔍 Checking if shifts table exists...');
    
    // Check if shifts table exists
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shifts'
      );
    `);
    
    const shiftsTableExists = tableExistsResult.rows[0].exists;
    console.log(`📊 Shifts table exists: ${shiftsTableExists}`);
    
    if (shiftsTableExists) {
      // Check shifts table structure
      const schemaResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'shifts'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Shifts table schema:');
      console.table(schemaResult.rows);
      
      // Check sample data
      const dataResult = await pool.query(`SELECT COUNT(*) as count FROM shifts`);
      console.log(`📈 Number of shifts in table: ${dataResult.rows[0].count}`);
    }
    
    // List all tables
    const allTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 All tables in database:');
    allTablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } catch (error) {
    console.error('❌ Error checking shifts table:', error);
  } finally {
    await pool.end();
  }
}

checkShiftsTable();
