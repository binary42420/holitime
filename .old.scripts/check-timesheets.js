const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTimesheets() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('🔍 Checking timesheets in database...\n');

    // Check if timesheets table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'timesheets'
      )
    `);
    
    console.log('✅ Timesheets table exists:', tableExists.rows[0].exists);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Timesheets table does not exist!');
      return;
    }

    // Get all timesheets
    const allTimesheets = await pool.query(`
      SELECT 
        t.id,
        t.status,
        t.shift_id,
        t.created_at,
        s.date as shift_date,
        j.name as job_name,
        c.company_name as client_name
      FROM timesheets t
      LEFT JOIN shifts s ON t.shift_id = s.id
      LEFT JOIN jobs j ON s.job_id = j.id
      LEFT JOIN clients c ON j.client_id = c.id
      ORDER BY t.created_at DESC
    `);

    console.log(`📊 Total timesheets found: ${allTimesheets.rows.length}\n`);

    if (allTimesheets.rows.length === 0) {
      console.log('ℹ️  No timesheets found in database.');
      
      // Check if there are any shifts that could have timesheets
      const shiftsResult = await pool.query(`
        SELECT 
          s.id,
          s.date,
          s.status,
          j.name as job_name,
          c.company_name as client_name
        FROM shifts s
        JOIN jobs j ON s.job_id = j.id
        JOIN clients c ON j.client_id = c.id
        WHERE s.status IN ('Completed', 'Pending Client Approval', 'Pending Approval')
        ORDER BY s.date DESC
        LIMIT 10
      `);
      
      console.log(`\n📋 Recent completed/pending shifts (${shiftsResult.rows.length}):`);
      shiftsResult.rows.forEach(shift => {
        console.log(`   - ${shift.id}: ${shift.job_name} (${shift.client_name}) - ${shift.date} [${shift.status}]`);
      });
      
    } else {
      console.log('📋 Existing timesheets:');
      allTimesheets.rows.forEach(timesheet => {
        console.log(`   - ${timesheet.id}`);
        console.log(`     Status: ${timesheet.status}`);
        console.log(`     Shift: ${timesheet.shift_date} - ${timesheet.job_name} (${timesheet.client_name})`);
        console.log(`     Created: ${timesheet.created_at}`);
        console.log('');
      });
    }

    // Check the specific timesheet ID from the error
    const specificId = '12234c93-a6ce-4bcf-81e6-a100985c5d4d';
    console.log(`🔍 Checking specific timesheet ID: ${specificId}`);
    
    const specificResult = await pool.query(`
      SELECT * FROM timesheets WHERE id = $1
    `, [specificId]);
    
    if (specificResult.rows.length === 0) {
      console.log('❌ Specific timesheet ID not found in database');
      
      // Check if this ID exists in any other table
      const shiftCheck = await pool.query(`
        SELECT id, date, status FROM shifts WHERE id = $1
      `, [specificId]);
      
      if (shiftCheck.rows.length > 0) {
        console.log('ℹ️  This ID exists as a shift, not a timesheet');
        console.log('   Shift details:', shiftCheck.rows[0]);
        
        // Check if this shift has a timesheet
        const shiftTimesheetCheck = await pool.query(`
          SELECT id, status FROM timesheets WHERE shift_id = $1
        `, [specificId]);
        
        if (shiftTimesheetCheck.rows.length > 0) {
          console.log('✅ Found timesheet for this shift:');
          console.log('   Timesheet ID:', shiftTimesheetCheck.rows[0].id);
          console.log('   Status:', shiftTimesheetCheck.rows[0].status);
        } else {
          console.log('ℹ️  No timesheet exists for this shift yet');
        }
      } else {
        console.log('❌ This ID does not exist in shifts table either');
      }
    } else {
      console.log('✅ Found specific timesheet:');
      console.log(specificResult.rows[0]);
    }

    // Check assigned personnel for the shift (if it's a shift ID)
    const assignedPersonnelCheck = await pool.query(`
      SELECT 
        ap.id,
        ap.status,
        u.name as employee_name
      FROM assigned_personnel ap
      JOIN users u ON ap.employee_id = u.id
      WHERE ap.shift_id = $1
    `, [specificId]);
    
    if (assignedPersonnelCheck.rows.length > 0) {
      console.log('\n👥 Assigned personnel for this shift:');
      assignedPersonnelCheck.rows.forEach(person => {
        console.log(`   - ${person.employee_name}: ${person.status}`);
      });
    }

    // Check time entries
    const timeEntriesCheck = await pool.query(`
      SELECT 
        te.id,
        te.clock_in,
        te.clock_out,
        u.name as employee_name
      FROM time_entries te
      JOIN assigned_personnel ap ON te.assigned_personnel_id = ap.id
      JOIN users u ON ap.employee_id = u.id
      WHERE ap.shift_id = $1
    `, [specificId]);
    
    if (timeEntriesCheck.rows.length > 0) {
      console.log('\n⏰ Time entries for this shift:');
      timeEntriesCheck.rows.forEach(entry => {
        console.log(`   - ${entry.employee_name}: ${entry.clock_in} → ${entry.clock_out}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking timesheets:', error);
  } finally {
    await pool.end();
  }
}

checkTimesheets();
