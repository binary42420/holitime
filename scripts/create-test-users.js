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

const testUsers = [
  // Test users with specific roles
  {
    name: 'Test Employee',
    email: 'employee@handson.com',
    password: 'password123',
    role: 'Employee',
    location: 'Main Office',
    performance: 4.5,
    crewChiefEligible: false,
    forkOperatorEligible: true,
    certifications: ['Basic Safety', 'Equipment Operation']
  },
  {
    name: 'Test Crew Chief',
    email: 'cc@handson.com',
    password: 'password123',
    role: 'Crew Chief',
    location: 'Main Office',
    performance: 4.8,
    crewChiefEligible: true,
    forkOperatorEligible: true,
    certifications: ['Basic Safety', 'Equipment Operation', 'Leadership', 'Advanced Safety']
  },
  {
    name: 'Test Manager',
    email: 'manager@handson.com',
    password: 'password123',
    role: 'Manager/Admin',
    location: 'Main Office',
    performance: 5.0,
    crewChiefEligible: true,
    forkOperatorEligible: true,
    certifications: ['Basic Safety', 'Equipment Operation', 'Leadership', 'Advanced Safety', 'Management']
  },
  {
    name: 'Test Client',
    email: 'client@clientco.com',
    password: 'password123',
    role: 'Client',
    companyName: 'ClientCo Inc.',
    companyAddress: '123 Business St, City, State 12345',
    contactPerson: 'Test Client',
    contactEmail: 'client@clientco.com',
    contactPhone: '(555) 123-4567'
  },
  // Admin users
  {
    name: 'TMG Admin',
    email: 'tmginsd@gmail.com',
    password: 'password123',
    role: 'Manager/Admin',
    location: 'Main Office',
    performance: 5.0,
    crewChiefEligible: true,
    forkOperatorEligible: true,
    certifications: ['Basic Safety', 'Equipment Operation', 'Leadership', 'Advanced Safety', 'Management', 'Admin']
  },
  {
    name: 'Paul Admin',
    email: 'paul@handsonlabor.com',
    password: 'password123',
    role: 'Manager/Admin',
    location: 'Main Office',
    performance: 5.0,
    crewChiefEligible: true,
    forkOperatorEligible: true,
    certifications: ['Basic Safety', 'Equipment Operation', 'Leadership', 'Advanced Safety', 'Management', 'Admin']
  },
  {
    name: 'Tavasci Admin',
    email: 'tavasci62019@gmail.com',
    password: 'password123',
    role: 'Manager/Admin',
    location: 'Main Office',
    performance: 5.0,
    crewChiefEligible: true,
    forkOperatorEligible: true,
    certifications: ['Basic Safety', 'Equipment Operation', 'Leadership', 'Advanced Safety', 'Management', 'Admin']
  },
  {
    name: 'Labor Admin',
    email: 'labor@handsonlabor.com',
    password: 'password123',
    role: 'Manager/Admin',
    location: 'Main Office',
    performance: 5.0,
    crewChiefEligible: true,
    forkOperatorEligible: true,
    certifications: ['Basic Safety', 'Equipment Operation', 'Leadership', 'Advanced Safety', 'Management', 'Admin']
  }
];

async function createTestUsers() {
  try {
    console.log('🚀 Starting test user creation...');

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [userData.email]);
        
        if (existingUser.rows.length > 0) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Prepare insert query based on role
        let insertQuery, values;

        if (userData.role === 'Client') {
          insertQuery = `
            INSERT INTO users (
              name, email, password_hash, role, avatar,
              company_name, company_address, contact_person, contact_email, contact_phone,
              created_at, updated_at, is_active
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), true
            ) RETURNING id, name, email, role
          `;
          values = [
            userData.name,
            userData.email,
            hashedPassword,
            userData.role,
            `https://i.pravatar.cc/32?u=${userData.email}`,
            userData.companyName,
            userData.companyAddress,
            userData.contactPerson,
            userData.contactEmail,
            userData.contactPhone
          ];
        } else {
          // Employee, Crew Chief, or Manager/Admin
          insertQuery = `
            INSERT INTO users (
              name, email, password_hash, role, avatar,
              location, performance, crew_chief_eligible, fork_operator_eligible, certifications,
              created_at, updated_at, is_active
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), true
            ) RETURNING id, name, email, role
          `;
          values = [
            userData.name,
            userData.email,
            hashedPassword,
            userData.role,
            `https://i.pravatar.cc/32?u=${userData.email}`,
            userData.location,
            userData.performance,
            userData.crewChiefEligible,
            userData.forkOperatorEligible,
            userData.certifications
          ];
        }

        const result = await pool.query(insertQuery, values);
        const newUser = result.rows[0];

        console.log(`✅ Created user: ${newUser.name} (${newUser.email}) - Role: ${newUser.role}`);

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log('🎉 Test user creation completed!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createTestUsers();
