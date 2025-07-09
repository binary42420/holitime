const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@pg-3595fcb-hol619.b.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function checkShiftIds() {
  try {
    console.log('🔍 Checking shift IDs in database...');
    
    // Check all shifts and their IDs
    const shiftsResult = await pool.query(`
      SELECT id, job_id, date, start_time, end_time, location, status, created_at
      FROM shifts 
      ORDER BY created_at DESC
    `);
    
    console.log('📊 All shifts in database:');
    console.table(shiftsResult.rows);
    
    // Check assigned personnel and their shift references
    const assignedResult = await pool.query(`
      SELECT ap.id, ap.shift_id, ap.employee_id, ap.role_on_shift, ap.role_code, ap.status
      FROM assigned_personnel ap
      ORDER BY ap.shift_id
    `);
    
    console.log('👥 All assigned personnel:');
    console.table(assignedResult.rows);
    
    // Check for any non-UUID shift IDs
    const nonUuidShifts = shiftsResult.rows.filter(row => 
      !row.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    );
    
    console.log(`🔍 Non-UUID shift IDs found: ${nonUuidShifts.length}`);
    if (nonUuidShifts.length > 0) {
      console.table(nonUuidShifts);
    }
    
    // Check for orphaned assigned personnel (referencing non-existent shifts)
    const orphanedAssignments = await pool.query(`
      SELECT ap.id, ap.shift_id, ap.employee_id, ap.role_on_shift
      FROM assigned_personnel ap
      LEFT JOIN shifts s ON ap.shift_id = s.id
      WHERE s.id IS NULL
    `);
    
    console.log(`🚨 Orphaned assignments found: ${orphanedAssignments.rows.length}`);
    if (orphanedAssignments.rows.length > 0) {
      console.table(orphanedAssignments.rows);
    }
    
  } catch (error) {
    console.error('❌ Error checking shift IDs:', error);
  } finally {
    await pool.end();
  }
}

checkShiftIds();
