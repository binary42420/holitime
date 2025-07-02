const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testNewStructure() {
  try {
    console.log('🧪 Testing new client data model and crew chief permission structure...\n');
    
    // Test 1: Check clients table
    console.log('1️⃣ Testing clients table:');
    const clientsResult = await pool.query('SELECT id, company_name FROM clients LIMIT 3');
    console.table(clientsResult.rows);
    
    // Test 2: Check users with client_company_id
    console.log('2️⃣ Testing client users with company references:');
    const clientUsersResult = await pool.query(`
      SELECT u.id, u.name, u.role, u.client_company_id, c.company_name
      FROM users u
      LEFT JOIN clients c ON u.client_company_id = c.id
      WHERE u.role = 'Client'
      LIMIT 3
    `);
    console.table(clientUsersResult.rows);
    
    // Test 3: Check jobs referencing client companies
    console.log('3️⃣ Testing jobs referencing client companies:');
    const jobsResult = await pool.query(`
      SELECT j.id, j.name, j.client_id, c.company_name
      FROM jobs j
      JOIN clients c ON j.client_id = c.id
      LIMIT 3
    `);
    console.table(jobsResult.rows);
    
    // Test 4: Check crew chief permissions table
    console.log('4️⃣ Testing crew chief permissions table:');
    const permissionsResult = await pool.query('SELECT COUNT(*) as permission_count FROM crew_chief_permissions');
    console.log(`Crew chief permissions table exists with ${permissionsResult.rows[0].permission_count} records`);
    
    // Test 5: Test a sample shift query with new structure
    console.log('5️⃣ Testing shift query with new client structure:');
    const shiftsResult = await pool.query(`
      SELECT s.id, j.name as job_name, c.company_name as client_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      LIMIT 3
    `);
    console.table(shiftsResult.rows);
    
    // Test 6: Check crew chief eligibility
    console.log('6️⃣ Testing crew chief eligible users:');
    const crewChiefUsersResult = await pool.query(`
      SELECT id, name, role, crew_chief_eligible
      FROM users
      WHERE role IN ('Employee', 'Crew Chief')
      LIMIT 5
    `);
    console.table(crewChiefUsersResult.rows);
    
    console.log('\n✅ All tests completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${clientsResult.rows.length} client companies found`);
    console.log(`   - ${clientUsersResult.rows.length} client contact users found`);
    console.log(`   - ${jobsResult.rows.length} jobs properly linked to client companies`);
    console.log(`   - ${shiftsResult.rows.length} shifts properly linked through new structure`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testNewStructure();
