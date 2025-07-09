const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@pg-3c901dd1-hol619.b.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function testGetShiftById() {
  try {
    console.log('🔍 Testing getShiftById query...');
    
    // Get the shift ID we just created
    const shiftsResult = await pool.query(`
      SELECT id, job_id, date, start_time, end_time 
      FROM shifts 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    console.log('📊 Recent shifts:');
    console.table(shiftsResult.rows);
    
    const shiftId = shiftsResult.rows[0].id;
    console.log(`🎯 Testing with shift ID: ${shiftId}`);
    
    // Test the exact query from getShiftById
    const result = await pool.query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes, s.requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      WHERE s.id = $1
    `, [shiftId]);
    
    console.log('📋 getShiftById query result:');
    if (result.rows.length > 0) {
      console.table(result.rows);
    } else {
      console.log('❌ No rows returned!');
    }
    
    // Check client data specifically
    const clientResult = await pool.query(`
      SELECT id, name, company_name, role
      FROM users 
      WHERE id = (SELECT client_id FROM jobs WHERE id = (SELECT job_id FROM shifts WHERE id = $1))
    `, [shiftId]);
    
    console.log('👤 Client data:');
    console.table(clientResult.rows);
    
  } catch (error) {
    console.error('❌ Error testing getShiftById:', error);
  } finally {
    await pool.end();
  }
}

testGetShiftById();
