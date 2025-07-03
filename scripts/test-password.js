const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables from .env.production
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function testPassword() {
  try {
    console.log('Testing password verification...');
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      ['manager@handson.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ User found:', user.name, '-', user.role);
    console.log('Password hash:', user.password_hash.substring(0, 20) + '...');
    
    // Test password verification
    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    
    if (isValid) {
      console.log('✅ Password verification successful');
    } else {
      console.log('❌ Password verification failed');
      
      // Try creating a new hash to compare
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('New hash would be:', newHash.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testPassword();
