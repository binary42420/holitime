const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@pg-3c901dd1-hol619.b.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function debugShiftsQuery() {
  try {
    console.log('🔍 Debugging shifts query...');
    
    // First, check if there are any shifts at all
    const allShiftsResult = await pool.query(`SELECT COUNT(*) as count FROM shifts`);
    console.log(`📊 Total shifts in database: ${allShiftsResult.rows[0].count}`);
    
    // Check if there are any jobs
    const allJobsResult = await pool.query(`SELECT COUNT(*) as count FROM jobs`);
    console.log(`📊 Total jobs in database: ${allJobsResult.rows[0].count}`);
    
    // Check if there are any clients
    const allClientsResult = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'Client'`);
    console.log(`📊 Total clients in database: ${allClientsResult.rows[0].count}`);
    
    // Test the exact query from getAllShifts
    console.log('\n🔍 Testing the exact getAllShifts query...');
    const result = await pool.query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        COUNT(ap.id) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      GROUP BY s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
               s.requested_workers, j.id, j.name, j.client_id, c.company_name, c.name,
               cc.id, cc.name, cc.avatar
      ORDER BY s.date DESC, s.start_time
    `);
    
    console.log(`📊 Query returned ${result.rows.length} rows`);
    if (result.rows.length > 0) {
      console.log('📋 First few results:');
      console.table(result.rows.slice(0, 3));
    }
    
    // Test each join separately to see where the issue is
    console.log('\n🔍 Testing joins separately...');
    
    // Test shifts -> jobs join
    const shiftsJobsResult = await pool.query(`
      SELECT s.id as shift_id, s.date, j.id as job_id, j.name as job_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
    `);
    console.log(`📊 Shifts with jobs: ${shiftsJobsResult.rows.length}`);
    
    // Test jobs -> clients join
    const jobsClientsResult = await pool.query(`
      SELECT j.id as job_id, j.name as job_name, j.client_id, c.id as client_user_id, c.name as client_name, c.role
      FROM jobs j
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
    `);
    console.log(`📊 Jobs with clients: ${jobsClientsResult.rows.length}`);
    
    // Test full join without assigned_personnel
    const fullJoinResult = await pool.query(`
      SELECT s.id, s.date, j.name as job_name, c.name as client_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
    `);
    console.log(`📊 Full join (shifts->jobs->clients): ${fullJoinResult.rows.length}`);
    if (fullJoinResult.rows.length > 0) {
      console.table(fullJoinResult.rows);
    }
    
  } catch (error) {
    console.error('❌ Error debugging shifts query:', error);
  } finally {
    await pool.end();
  }
}

debugShiftsQuery();
