const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testDbConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV !== 'production' || process.env.DATABASE_PROVIDER === 'aiven' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0].now);
    client.release();
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    await pool.end();
  }
}

async function testUserAuthentication(email, password) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV !== 'production' || process.env.DATABASE_PROVIDER === 'aiven' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const client = await pool.connect();
    const res = await client.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    client.release();

    if (res.rows.length === 0) {
      console.log('User not found');
      return;
    }

    const hashedPassword = res.rows[0].password_hash;
    const isValid = await bcrypt.compare(password, hashedPassword);
    if (isValid) {
      console.log('User authentication successful');
    } else {
      console.log('User authentication failed: Incorrect password');
    }
  } catch (err) {
    console.error('User authentication test failed:', err);
  } finally {
    await pool.end();
  }
}

async function runTests() {
  console.log('Starting database connection test...');
  await testDbConnection();

  console.log('\nStarting user authentication test...');
  // Replace with valid test user credentials
  const testEmail = 'test@example.com';
  const testPassword = 'testpassword';
  await testUserAuthentication(testEmail, testPassword);
}

runTests();
