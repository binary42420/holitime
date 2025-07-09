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

async function fixPasswords() {
  try {
    console.log('🔧 Fixing user passwords...');
    
    // Get all users with plain text passwords
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE password_hash NOT LIKE \'$2%\''
    );
    
    console.log(`Found ${result.rows.length} users with plain text passwords`);
    
    for (const user of result.rows) {
      const plainPassword = user.password_hash; // This is the plain text password
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      console.log(`✅ Updated password for ${user.email}`);
    }
    
    console.log('🎉 All passwords have been properly hashed!');
    
  } catch (error) {
    console.error('❌ Error fixing passwords:', error.message);
  } finally {
    await pool.end();
  }
}

fixPasswords();
