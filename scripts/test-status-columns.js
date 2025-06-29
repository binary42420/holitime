const { Pool } = require('pg');
const path = require('path');

// Load environment variables from .env.production
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function testStatusColumns() {
  try {
    console.log('🔍 Testing status columns and counts...\n');

    // Test 1: Jobs with shift counts
    console.log('📊 Testing Jobs with Shift Counts:');
    const jobsResult = await pool.query(`
      SELECT 
        j.id, j.name,
        COALESCE(c.name, c.company_name) as client_name,
        COUNT(s.id) as shift_count,
        CASE 
          WHEN COUNT(CASE WHEN s.status = 'Completed' THEN 1 END) = COUNT(s.id) AND COUNT(s.id) > 0 THEN 'Completed'
          WHEN COUNT(CASE WHEN s.status IN ('In Progress', 'Upcoming') THEN 1 END) > 0 THEN 'Active'
          ELSE 'Planning'
        END as status
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN shifts s ON j.id = s.job_id
      GROUP BY j.id, j.name, c.name, c.company_name
      ORDER BY j.created_at DESC
      LIMIT 5
    `);
    
    console.table(jobsResult.rows);

    // Test 2: Clients with job counts
    console.log('\n📊 Testing Clients with Job Counts:');
    const clientsResult = await pool.query(`
      SELECT
        u.id, u.name, u.company_name,
        COALESCE(job_counts.job_count, 0) as job_count,
        completed_shift.job_name as recent_completed_job
      FROM users u
      LEFT JOIN (
        SELECT client_id, COUNT(*) as job_count
        FROM jobs
        GROUP BY client_id
      ) job_counts ON u.id = job_counts.client_id
      LEFT JOIN (
        SELECT DISTINCT ON (j.client_id)
          j.client_id,
          j.name as job_name
        FROM shifts s
        JOIN jobs j ON s.job_id = j.id
        WHERE s.status = 'Completed'
        ORDER BY j.client_id, s.date DESC, s.start_time DESC
      ) completed_shift ON u.id = completed_shift.client_id
      WHERE u.role = 'Client'
      ORDER BY u.name
      LIMIT 5
    `);
    
    console.table(clientsResult.rows);

    // Test 3: Recent Jobs API query
    console.log('\n📊 Testing Recent Jobs API Query:');
    const recentJobsResult = await pool.query(`
      SELECT 
        j.id,
        j.name,
        COALESCE(c.name, c.company_name) as client_name,
        COUNT(s.id) as shift_count,
        COUNT(CASE WHEN s.date >= CURRENT_DATE THEN 1 END) as upcoming_shifts,
        COUNT(CASE WHEN s.date = CURRENT_DATE THEN 1 END) as active_shifts,
        CASE 
          WHEN COUNT(CASE WHEN s.status = 'Completed' THEN 1 END) = COUNT(s.id) AND COUNT(s.id) > 0 THEN 'Completed'
          WHEN COUNT(CASE WHEN s.status IN ('In Progress', 'Upcoming') THEN 1 END) > 0 THEN 'Active'
          ELSE 'Planning'
        END as status
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN shifts s ON j.id = s.job_id
      GROUP BY j.id, j.name, c.name, c.company_name
      ORDER BY j.created_at DESC
      LIMIT 5
    `);
    
    console.table(recentJobsResult.rows);

    // Test 4: Shifts with assigned counts
    console.log('\n📊 Testing Shifts with Assigned Counts:');
    const shiftsResult = await pool.query(`
      SELECT
        s.id, s.date, s.status,
        j.name as job_name,
        COALESCE(c.company_name, c.name) as client_name,
        COALESCE(s.requested_workers, 1) as requested_workers,
        COUNT(CASE WHEN ap.is_placeholder = false THEN ap.id END) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      GROUP BY s.id, s.date, s.status, j.name, c.company_name, c.name, s.requested_workers
      ORDER BY s.date DESC
      LIMIT 5
    `);
    
    console.table(shiftsResult.rows);

    // Test 5: Users for team overview
    console.log('\n📊 Testing Users for Team Overview:');
    const usersResult = await pool.query(`
      SELECT id, name, role, location, avatar
      FROM users
      WHERE role IN ('Employee', 'Crew Chief', 'Manager/Admin')
      AND is_active = true
      ORDER BY name
      LIMIT 5
    `);
    
    console.table(usersResult.rows);

    console.log('\n✅ All status column tests completed!');

  } catch (error) {
    console.error('❌ Error testing status columns:', error);
  } finally {
    await pool.end();
  }
}

testStatusColumns();
