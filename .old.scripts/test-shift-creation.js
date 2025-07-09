const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function testShiftCreation() {
  try {
    console.log('🔍 Testing shift creation...');
    
    // Test data
    const shiftData = {
      jobId: '01e1b522-f0d8-45b5-a2df-66cd7a6e0a54',
      date: '2024-07-20',
      startTime: '09:00',
      endTime: '17:00',
      location: 'Test Location',
      crewChiefId: '56d1dcd6-00fc-480b-b125-bdd3bb77a0fd',
      requestedWorkers: 2,
      notes: 'Test shift'
    };
    
    console.log('📊 Test data:', shiftData);
    
    // Check if job exists
    const jobCheck = await pool.query('SELECT id, name FROM jobs WHERE id = $1', [shiftData.jobId]);
    console.log(`📋 Job exists: ${jobCheck.rows.length > 0}`);
    if (jobCheck.rows.length > 0) {
      console.log(`   Job: ${jobCheck.rows[0].name}`);
    }
    
    // Check if crew chief exists
    const crewChiefCheck = await pool.query('SELECT id, name, role FROM users WHERE id = $1', [shiftData.crewChiefId]);
    console.log(`👤 Crew chief exists: ${crewChiefCheck.rows.length > 0}`);
    if (crewChiefCheck.rows.length > 0) {
      console.log(`   Crew chief: ${crewChiefCheck.rows[0].name} (${crewChiefCheck.rows[0].role})`);
    }
    
    // Try to insert the shift
    console.log('🚀 Attempting to create shift...');
    
    const result = await pool.query(`
      INSERT INTO shifts (job_id, date, start_time, end_time, location, crew_chief_id, requested_workers, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Upcoming')
      RETURNING id, job_id, date, start_time, end_time, status
    `, [
      shiftData.jobId,
      shiftData.date,
      shiftData.startTime,
      shiftData.endTime,
      shiftData.location || '',
      shiftData.crewChiefId || null,
      shiftData.requestedWorkers,
      shiftData.notes || ''
    ]);
    
    console.log('✅ Shift created successfully!');
    console.log('📊 Created shift:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error creating shift:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
  } finally {
    await pool.end();
  }
}

testShiftCreation();
