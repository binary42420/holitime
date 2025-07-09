const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@pg-3c901dd1-hol619.b.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkShiftConstraints() {
  try {
    console.log('🔍 Checking shift table constraints...');
    
    // Get constraint information
    const constraintsResult = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'shifts'
      AND tc.table_schema = 'public'
    `);
    
    console.log('📊 Shift table constraints:');
    console.table(constraintsResult.rows);
    
    // Get column information
    const columnsResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'shifts'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Shift table columns:');
    console.table(columnsResult.rows);
    
    // Check current shift statuses
    const statusesResult = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM shifts 
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('\n📊 Current shift statuses in database:');
    console.table(statusesResult.rows);
    
  } catch (error) {
    console.error('❌ Error checking shift constraints:', error);
  } finally {
    await pool.end();
  }
}

checkShiftConstraints();
