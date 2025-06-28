const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

async function resetDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Allow self-signed certificates for Aiven
    }
  });

  try {
    console.log('🗑️  Starting complete database reset...');
    
    // Step 1: Drop all existing tables in correct order (reverse dependency)
    console.log('📋 Dropping all existing tables...');
    
    const dropTables = [
      'DROP TABLE IF EXISTS client_user_links CASCADE',
      'DROP TABLE IF EXISTS job_authorizations CASCADE', 
      'DROP TABLE IF EXISTS announcements CASCADE',
      'DROP TABLE IF EXISTS documents CASCADE',
      'DROP TABLE IF EXISTS time_entries CASCADE',
      'DROP TABLE IF EXISTS assigned_personnel CASCADE',
      'DROP TABLE IF EXISTS timesheets CASCADE',
      'DROP TABLE IF EXISTS shifts CASCADE',
      'DROP TABLE IF EXISTS jobs CASCADE',
      'DROP TABLE IF EXISTS employees CASCADE',
      'DROP TABLE IF EXISTS clients CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TABLE IF EXISTS migrations CASCADE'
    ];

    for (const dropSql of dropTables) {
      try {
        await pool.query(dropSql);
        console.log(`✅ ${dropSql}`);
      } catch (error) {
        console.log(`⚠️  ${dropSql} - ${error.message}`);
      }
    }

    console.log('\n🏗️  Creating fresh database schema...');
    
    // Step 2: Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Step 3: Create migrations table
    await pool.query(`
      CREATE TABLE migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Migrations table created');

    // Step 4: Create consolidated users table with all fields
    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('Employee', 'Crew Chief', 'Manager/Admin', 'Client')),
        avatar VARCHAR(500),
        
        -- Employee fields
        certifications TEXT[],
        performance DECIMAL(3,2) DEFAULT 0.0 CHECK (performance >= 0.0 AND performance <= 5.0),
        location VARCHAR(255),
        
        -- Client fields  
        company_name VARCHAR(255),
        company_address TEXT,
        contact_person VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        
        -- Common fields
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      )
    `);
    console.log('✅ Consolidated users table created');

    // Step 5: Create jobs table
    await pool.query(`
      CREATE TABLE jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Jobs table created');

    // Step 6: Create shifts table
    await pool.query(`
      CREATE TABLE shifts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location VARCHAR(255),
        crew_chief_id UUID REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Cancelled')),
        notes TEXT,
        requested_workers INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Shifts table created');

    console.log('\n🎉 Database reset completed successfully!');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

resetDatabase();
