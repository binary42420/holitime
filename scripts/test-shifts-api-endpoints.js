const { Pool } = require('pg');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const API_BASE_URL = 'http://localhost:3001';

async function testShiftsAPIEndpoints() {
  try {
    console.log('🧪 Testing Shifts API Endpoints...\n');

    // Step 1: Get test users for different roles
    console.log('1️⃣ Getting test users for different roles...');
    
    const usersResult = await pool.query(`
      SELECT id, name, email, role, client_company_id
      FROM users 
      WHERE is_active = true
      ORDER BY role, name
      LIMIT 10
    `);
    
    console.log('📊 Available test users:');
    console.table(usersResult.rows);

    // Step 2: Test database queries directly
    console.log('\n2️⃣ Testing database queries directly...');
    
    // Test the corrected shifts query
    const shiftsQueryResult = await pool.query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status,
        j.id as job_id, j.name as job_name,
        c.company_name as client_name,
        cc.name as crew_chief_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      ORDER BY s.date DESC
      LIMIT 5
    `);
    
    console.log(`✅ Direct database query returned ${shiftsQueryResult.rows.length} shifts`);
    if (shiftsQueryResult.rows.length > 0) {
      console.table(shiftsQueryResult.rows);
    }

    // Step 3: Test API endpoints without authentication (should fail)
    console.log('\n3️⃣ Testing API endpoints without authentication...');
    
    const endpoints = [
      '/api/shifts',
      '/api/shifts/by-date?filter=today',
      '/api/shifts/today'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const data = await response.json();
        
        if (response.status === 401) {
          console.log(`✅ ${endpoint}: Correctly requires authentication (401)`);
        } else {
          console.log(`⚠️ ${endpoint}: Unexpected response (${response.status}):`, data);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: Network error:`, error.message);
      }
    }

    // Step 4: Test data structure consistency
    console.log('\n4️⃣ Testing data structure consistency...');
    
    // Check if shifts have all required fields
    const shiftFieldsResult = await pool.query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        c.company_name as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        COUNT(ap.id) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id AND ap.is_placeholder = false
      GROUP BY s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
               s.requested_workers, j.id, j.name, j.client_id, c.company_name,
               cc.id, cc.name, cc.avatar
      ORDER BY s.date DESC
      LIMIT 3
    `);

    console.log('✅ Shift data structure validation:');
    if (shiftFieldsResult.rows.length > 0) {
      const shift = shiftFieldsResult.rows[0];
      const requiredFields = [
        'id', 'date', 'start_time', 'end_time', 'location', 'status',
        'job_id', 'job_name', 'client_name', 'requested_workers', 'assigned_count'
      ];
      
      const missingFields = requiredFields.filter(field => shift[field] === undefined);
      if (missingFields.length === 0) {
        console.log('✅ All required fields present in shift data');
      } else {
        console.log('❌ Missing fields:', missingFields);
      }
      
      console.log('📊 Sample shift data:');
      console.table([shift]);
    } else {
      console.log('⚠️ No shifts found in database');
    }

    // Step 5: Test client company data integrity
    console.log('\n5️⃣ Testing client company data integrity...');
    
    const clientIntegrityResult = await pool.query(`
      SELECT 
        j.id as job_id,
        j.name as job_name,
        j.client_id,
        c.id as client_company_id,
        c.company_name,
        COUNT(s.id) as shift_count
      FROM jobs j
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN shifts s ON j.id = s.job_id
      GROUP BY j.id, j.name, j.client_id, c.id, c.company_name
      ORDER BY shift_count DESC
      LIMIT 5
    `);

    console.log('✅ Client company data integrity:');
    console.table(clientIntegrityResult.rows);

    // Step 6: Test role-based filtering logic
    console.log('\n6️⃣ Testing role-based filtering logic...');
    
    // Test crew chief filtering
    const crewChiefs = usersResult.rows.filter(u => u.role === 'Crew Chief');
    if (crewChiefs.length > 0) {
      const crewChief = crewChiefs[0];
      const crewChiefShiftsResult = await pool.query(`
        SELECT s.id, s.date, j.name as job_name, c.company_name as client_name
        FROM shifts s
        JOIN jobs j ON s.job_id = j.id
        JOIN clients c ON j.client_id = c.id
        WHERE s.crew_chief_id = $1
        ORDER BY s.date DESC
        LIMIT 3
      `, [crewChief.id]);
      
      console.log(`✅ Crew Chief ${crewChief.name} has ${crewChiefShiftsResult.rows.length} shifts`);
    }

    // Test client filtering
    const clients = usersResult.rows.filter(u => u.role === 'Client');
    if (clients.length > 0) {
      const client = clients[0];
      if (client.client_company_id) {
        const clientShiftsResult = await pool.query(`
          SELECT s.id, s.date, j.name as job_name, c.company_name as client_name
          FROM shifts s
          JOIN jobs j ON s.job_id = j.id
          JOIN clients c ON j.client_id = c.id
          WHERE j.client_id = $1
          ORDER BY s.date DESC
          LIMIT 3
        `, [client.client_company_id]);
        
        console.log(`✅ Client ${client.name} company has ${clientShiftsResult.rows.length} shifts`);
      }
    }

    console.log('\n🎉 Shifts API endpoints testing completed!');

  } catch (error) {
    console.error('❌ Error testing shifts API endpoints:', error);
  } finally {
    await pool.end();
  }
}

testShiftsAPIEndpoints();
