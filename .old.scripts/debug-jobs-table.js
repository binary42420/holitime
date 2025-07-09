const { Pool } = require('pg');
const path = require('path');

// Load environment variables from .env.production
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function debugJobsTable() {
  try {
    console.log('🔍 Debugging jobs table structure...');
    
    // Check jobs table structure
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'jobs'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Jobs table structure:');
    console.table(tableStructure.rows);
    
    // Check if there are any jobs
    const jobsCount = await pool.query('SELECT COUNT(*) as count FROM jobs');
    console.log(`📊 Total jobs in database: ${jobsCount.rows[0].count}`);
    
    // Get sample jobs
    const sampleJobs = await pool.query(`
      SELECT j.*, c.name as client_name, c.company_name
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      LIMIT 5
    `);
    
    console.log('📊 Sample jobs:');
    console.table(sampleJobs.rows);
    
    // Test the problematic query step by step
    console.log('\n🔍 Testing the jobs query step by step...');
    
    // Test basic jobs query
    const basicJobs = await pool.query('SELECT * FROM jobs LIMIT 5');
    console.log(`✅ Basic jobs query: ${basicJobs.rows.length} rows`);
    
    // Test jobs with users join
    const jobsWithUsers = await pool.query(`
      SELECT j.id, j.name, j.client_id, c.name as client_name, c.company_name
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      LIMIT 5
    `);
    console.log(`✅ Jobs with users join: ${jobsWithUsers.rows.length} rows`);
    
    // Test shifts table
    const shiftsCount = await pool.query('SELECT COUNT(*) as count FROM shifts');
    console.log(`📊 Total shifts in database: ${shiftsCount.rows[0].count}`);
    
    // Test shifts with job_id
    const shiftsWithJobs = await pool.query(`
      SELECT s.id, s.job_id, s.date, j.name as job_name
      FROM shifts s
      LEFT JOIN jobs j ON s.job_id = j.id
      LIMIT 5
    `);
    console.log(`✅ Shifts with jobs: ${shiftsWithJobs.rows.length} rows`);
    console.table(shiftsWithJobs.rows);
    
  } catch (error) {
    console.error('❌ Error debugging jobs table:', error);
  } finally {
    await pool.end();
  }
}

debugJobsTable();
