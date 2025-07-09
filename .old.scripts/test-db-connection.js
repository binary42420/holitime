const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Import the query function
    const { query } = require('../src/lib/db.ts');
    
    // Test basic connection
    const result = await query('SELECT NOW() as current_time, version() as db_version');
    console.log('✓ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].db_version.split(' ')[0]);
    
    // Test if users table exists and has data
    const usersResult = await query('SELECT COUNT(*) as user_count FROM users');
    console.log('✓ Users table accessible, found', usersResult.rows[0].user_count, 'users');
    
    // Test a sample user
    const sampleUser = await query('SELECT email, name, role FROM users LIMIT 1');
    if (sampleUser.rows.length > 0) {
      console.log('✓ Sample user:', sampleUser.rows[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
