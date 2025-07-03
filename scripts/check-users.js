const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Checking users in database...');
    
    // Get all users
    const usersResult = await pool.query(`
      SELECT id, email, name, role, created_at
      FROM users 
      ORDER BY created_at
    `);

    if (usersResult.rows.length === 0) {
      console.log('❌ No users found in database. Database needs to be seeded.');
      console.log('Run: node scripts/migrate.js');
    } else {
      console.log('✅ Users found in database:');
      console.table(usersResult.rows);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
