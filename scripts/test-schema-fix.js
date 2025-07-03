require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testSchemaFix() {
  try {
    console.log('🧪 Testing Database Schema Fix...\n');
    
    // Test clients query (from the original error)
    console.log('📋 Testing clients query...');
    const clientsResult = await pool.query('SELECT id, company_name, logo_url FROM clients LIMIT 3');
    console.log('✅ Clients query successful');
    console.log('📊 Sample clients data:');
    clientsResult.rows.forEach(row => {
      console.log(`  - ${row.company_name} (logo: ${row.logo_url || 'none'})`);
    });
    
    // Test users query (from the original error)
    console.log('\n📋 Testing users query...');
    const usersResult = await pool.query('SELECT id, name, osha_compliant, fork_operator_eligible FROM users LIMIT 3');
    console.log('✅ Users query successful');
    console.log('📊 Sample users data:');
    usersResult.rows.forEach(row => {
      console.log(`  - ${row.name} (OSHA: ${row.osha_compliant}, Forklift: ${row.fork_operator_eligible})`);
    });
    
    // Test the specific queries that were failing
    console.log('\n📋 Testing specific failing queries...');
    
    // Test the getAllClients query from clients.ts:167
    const getAllClientsQuery = `
      SELECT 
        c.id, c.company_name, c.company_address, c.contact_phone, 
        c.contact_email, c.notes, c.created_at, c.updated_at, c.logo_url
      FROM clients c
      ORDER BY c.company_name ASC
      LIMIT 1
    `;
    const clientsTestResult = await pool.query(getAllClientsQuery);
    console.log('✅ getAllClients query successful');
    
    // Test the users API query from users/route.ts:25
    const getUsersQuery = `
      SELECT 
        id, name, email, role, avatar, location, 
        certifications, performance, crew_chief_eligible, fork_operator_eligible, osha_compliant,
        company_name, contact_person, contact_email, contact_phone,
        created_at, updated_at, last_login, is_active
      FROM users 
      LIMIT 1
    `;
    const usersTestResult = await pool.query(getUsersQuery);
    console.log('✅ Users API query successful');
    
    console.log('\n✅ All database schema issues have been resolved!');
    console.log('\n📋 Summary:');
    console.log('  ✅ logo_url column added to clients table');
    console.log('  ✅ osha_compliant column added to users table');
    console.log('  ✅ /api/clients endpoint queries work');
    console.log('  ✅ /api/users endpoint queries work');
    console.log('\n🚀 The application should now work without 500 errors!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.detail);
  } finally {
    await pool.end();
  }
}

testSchemaFix();
