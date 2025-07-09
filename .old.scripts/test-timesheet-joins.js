const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testTimesheetJoins() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    const timesheetId = '12234c93-a6ce-4bcf-81e6-a100985c5d4d';
    console.log(`🔍 Testing JOIN queries for timesheet: ${timesheetId}\n`);

    // Test 1: Basic timesheet query (no JOINs)
    console.log('📋 Test 1: Basic timesheet query...');
    const basicResult = await pool.query(`
      SELECT * FROM timesheets WHERE id = $1
    `, [timesheetId]);
    
    if (basicResult.rows.length > 0) {
      console.log('✅ Basic timesheet found');
      console.log('   Shift ID:', basicResult.rows[0].shift_id);
    } else {
      console.log('❌ Basic timesheet not found');
      return;
    }

    const shiftId = basicResult.rows[0].shift_id;

    // Test 2: Check if shift exists
    console.log('\n📋 Test 2: Check if shift exists...');
    const shiftResult = await pool.query(`
      SELECT * FROM shifts WHERE id = $1
    `, [shiftId]);
    
    if (shiftResult.rows.length > 0) {
      console.log('✅ Shift found');
      console.log('   Job ID:', shiftResult.rows[0].job_id);
      console.log('   Crew Chief ID:', shiftResult.rows[0].crew_chief_id);
    } else {
      console.log('❌ Shift not found');
      return;
    }

    const jobId = shiftResult.rows[0].job_id;

    // Test 3: Check if job exists
    console.log('\n📋 Test 3: Check if job exists...');
    const jobResult = await pool.query(`
      SELECT * FROM jobs WHERE id = $1
    `, [jobId]);
    
    if (jobResult.rows.length > 0) {
      console.log('✅ Job found');
      console.log('   Client ID:', jobResult.rows[0].client_id);
    } else {
      console.log('❌ Job not found');
      return;
    }

    // Test 4: Test the exact JOIN query from the approve endpoint
    console.log('\n📋 Test 4: Testing exact JOIN query from approve endpoint...');
    const joinResult = await pool.query(`
      SELECT t.*, s.crew_chief_id, j.client_id
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      WHERE t.id = $1
    `, [timesheetId]);
    
    if (joinResult.rows.length > 0) {
      console.log('✅ JOIN query successful');
      console.log('   Timesheet status:', joinResult.rows[0].status);
      console.log('   Crew chief ID:', joinResult.rows[0].crew_chief_id);
      console.log('   Client ID:', joinResult.rows[0].client_id);
    } else {
      console.log('❌ JOIN query failed - this is the issue!');
      
      // Let's debug step by step
      console.log('\n🔍 Debugging JOIN failure...');
      
      // Test timesheet + shift join
      const tsShiftJoin = await pool.query(`
        SELECT t.id as timesheet_id, s.id as shift_id, s.job_id
        FROM timesheets t
        JOIN shifts s ON t.shift_id = s.id
        WHERE t.id = $1
      `, [timesheetId]);
      
      if (tsShiftJoin.rows.length > 0) {
        console.log('✅ Timesheet + Shift JOIN works');
        
        // Test shift + job join
        const shiftJobJoin = await pool.query(`
          SELECT s.id as shift_id, j.id as job_id
          FROM shifts s
          JOIN jobs j ON s.job_id = j.id
          WHERE s.id = $1
        `, [shiftId]);
        
        if (shiftJobJoin.rows.length > 0) {
          console.log('✅ Shift + Job JOIN works');
        } else {
          console.log('❌ Shift + Job JOIN fails');
          console.log('   This means the job_id in shifts table is invalid');
        }
      } else {
        console.log('❌ Timesheet + Shift JOIN fails');
        console.log('   This means the shift_id in timesheets table is invalid');
      }
    }

    // Test 5: Check for NULL values that might break JOINs
    console.log('\n📋 Test 5: Checking for NULL values...');
    const nullCheck = await pool.query(`
      SELECT 
        t.id as timesheet_id,
        t.shift_id,
        s.id as actual_shift_id,
        s.job_id,
        j.id as actual_job_id
      FROM timesheets t
      LEFT JOIN shifts s ON t.shift_id = s.id
      LEFT JOIN jobs j ON s.job_id = j.id
      WHERE t.id = $1
    `, [timesheetId]);
    
    if (nullCheck.rows.length > 0) {
      const row = nullCheck.rows[0];
      console.log('📊 NULL check results:');
      console.log('   Timesheet ID:', row.timesheet_id);
      console.log('   Shift ID in timesheet:', row.shift_id);
      console.log('   Actual shift found:', row.actual_shift_id ? 'Yes' : 'No');
      console.log('   Job ID in shift:', row.job_id);
      console.log('   Actual job found:', row.actual_job_id ? 'Yes' : 'No');
      
      if (!row.actual_shift_id) {
        console.log('❌ ISSUE: Shift referenced by timesheet does not exist');
      } else if (!row.actual_job_id) {
        console.log('❌ ISSUE: Job referenced by shift does not exist');
      } else {
        console.log('✅ All references are valid');
      }
    }

  } catch (error) {
    console.error('❌ Error testing timesheet JOINs:', error);
  } finally {
    await pool.end();
  }
}

testTimesheetJoins();
