const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL not found in environment');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✓ Database connection successful!');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✓ Query test successful:', result.rows[0].current_time);
    
    // Test if users table exists
    try {
      const usersResult = await client.query('SELECT COUNT(*) as user_count FROM users');
      console.log('✓ Users table exists, found', usersResult.rows[0].user_count, 'users');
    } catch (tableError) {
      console.log('⚠ Users table may not exist:', tableError.message);
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
  }
}

testConnection();
