const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

async function testSSLFix() {
  console.log('Testing SSL configuration fix...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Allow self-signed certificates for Aiven
    }
  });

  try {
    console.log('Attempting database connection...');
    
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].db_version.split(' ')[0]);
    
    // Test if users table exists and has data
    const usersResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
    console.log('✅ Users table accessible, found', usersResult.rows[0].user_count, 'users');
    
    // Test a sample user
    const sampleUser = await pool.query('SELECT email, name, role FROM users LIMIT 1');
    if (sampleUser.rows.length > 0) {
      console.log('✅ Sample user:', sampleUser.rows[0]);
    }
    
    console.log('\n🎉 SSL configuration fix successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testSSLFix();
