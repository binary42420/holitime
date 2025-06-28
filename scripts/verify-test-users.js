const { Pool } = require('pg');
const path = require('path');

// Load environment variables from .env.production
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const testEmails = [
  'employee@handson.com',
  'cc@handson.com', 
  'manager@handson.com',
  'client@clientco.com',
  'tmginsd@gmail.com',
  'paul@handsonlabor.com',
  'tavasci62019@gmail.com',
  'labor@handsonlabor.com'
];

async function verifyTestUsers() {
  try {
    console.log('🔍 Verifying test users...\n');

    for (const email of testEmails) {
      try {
        const result = await pool.query(
          'SELECT id, name, email, role, created_at FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length > 0) {
          const user = result.rows[0];
          console.log(`✅ ${user.name} (${user.email})`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Created: ${user.created_at}`);
          console.log(`   ID: ${user.id}\n`);
        } else {
          console.log(`❌ User not found: ${email}\n`);
        }
      } catch (error) {
        console.error(`❌ Error checking user ${email}:`, error.message);
      }
    }

    // Get total user count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log(`📊 Total users in database: ${countResult.rows[0].total}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Run the verification
verifyTestUsers();
