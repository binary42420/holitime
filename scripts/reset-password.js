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

const email = 'manager@handson.com';
const newPassword = 'password123';

async function resetPassword() {
  try {
    console.log(`🚀 Resetting password for ${email}...`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password hash in the database
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      console.error(`❌ User ${email} not found.`);
    } else {
      console.log(`✅ Password for ${result.rows[0].email} has been reset successfully.`);
    }
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
resetPassword();
