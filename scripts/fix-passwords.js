require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const fixPasswords = async () => {
  const client = await pool.connect();
  try {
    // Fix existing passwords
    const { rows: users } = await client.query('SELECT id, password_hash FROM users');
    for (const user of users) {
      if (user.password_hash && !user.password_hash.startsWith('$2a$')) {
        console.log(`Fixing password for user ${user.id}...`);
        const hashedPassword = await bcrypt.hash('password123', 10);
        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user.id]);
      }
    }
    console.log('Finished fixing existing passwords.');

    // Create test users
    const testUsers = [
      { email: 'admin@test.com', role: 'Manager/Admin', name: 'Test Admin' },
      { email: 'employee@test.com', role: 'Employee', name: 'Test Employee' },
      { email: 'client@test.com', role: 'Client', name: 'Test Client' },
    ];

    for (const userData of testUsers) {
      const { email, role, name } = userData;
      const { rows: existingUsers } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUsers.length === 0) {
        console.log(`Creating user ${email}...`);
        const hashedPassword = await bcrypt.hash('password123', 10);
        await client.query(
          'INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, true)',
          [email, hashedPassword, name, role]
        );
      } else {
        console.log(`User ${email} already exists.`);
      }
    }
    console.log('Finished creating test users.');

  } catch (error) {
    console.error('Error during script execution:', error);
  } finally {
    await client.release();
    await pool.end();
  }
};

fixPasswords();
