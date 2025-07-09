const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function addSampleShifts() {
  try {
    // Import the query function
    const { query } = require('../src/lib/db.ts');
    
    console.log('Adding sample shifts...');
    
    // Get user and job IDs
    const usersResult = await query('SELECT id, email FROM users');
    const jobsResult = await query('SELECT id, name FROM jobs');
    
    const userIds = {};
    usersResult.rows.forEach(row => {
      userIds[row.email] = row.id;
    });
    
    const jobIds = {};
    jobsResult.rows.forEach(row => {
      jobIds[row.name] = row.id;
    });
    
    // Check if shifts already exist
    const existingShifts = await query('SELECT COUNT(*) FROM shifts');
    if (parseInt(existingShifts.rows[0].count) > 0) {
      console.log('Shifts already exist, skipping...');
      return;
    }
    
    // Create some sample shifts
    if (Object.keys(jobIds).length > 0 && userIds['maria.g@handson.com']) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await query(`
        INSERT INTO shifts (job_id, crew_chief_id, date, start_time, end_time, location, status)
        VALUES 
          ($1, $2, $3, '08:00', '16:00', 'Downtown Construction Site', 'Upcoming'),
          ($4, $2, $5, '09:00', '17:00', 'Suburban Office Building', 'Upcoming')
      `, [
        jobIds['Downtown Core Project'],
        userIds['maria.g@handson.com'],
        tomorrow.toISOString().split('T')[0],
        jobIds['Suburban Office Complex'],
        today.toISOString().split('T')[0]
      ]);
      
      console.log('Sample shifts added successfully!');
    } else {
      console.log('Required data not found, skipping shift creation');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to add sample shifts:', error);
    process.exit(1);
  }
}

addSampleShifts();
