import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Aiven's self-signed certificates
    }
  });

  try {
    // Create a test user if it doesn't exist
    const hashedPassword = await bcrypt.hash('password123', 10);
    await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role
    `, ['test@example.com', hashedPassword, 'Test User', 'Manager/Admin']);

    // Create demo accounts
    const demoAccounts = [
      { email: 'alex.j@handson.com', name: 'Alex Johnson', role: 'Employee' },
      { email: 'maria.g@handson.com', name: 'Maria Garcia', role: 'Crew Chief' },
      { email: 'sam.c@handson.com', name: 'Sam Chen', role: 'Manager/Admin' },
      { email: 'jsmith@constructo.com', name: 'John Smith', role: 'Client' }
    ];

    for (const account of demoAccounts) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await pool.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          name = EXCLUDED.name,
          role = EXCLUDED.role
      `, [account.email, hashedPassword, account.name, account.role]);
    }

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase().catch(console.error);
