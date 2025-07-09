const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

console.log('🔧 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('🔧 JWT Secret:', process.env.JWT_SECRET ? 'Set' : 'Not set');

async function testClientAuth() {
  try {
    console.log('🧪 Testing Client Authentication Flow...\n');

    // Step 1: Check if we have any client users and client companies
    console.log('1️⃣ Checking existing client data...');
    
    const clientCompaniesResult = await pool.query(`
      SELECT id, company_name FROM clients ORDER BY company_name LIMIT 5
    `);
    console.log(`📊 Client companies found: ${clientCompaniesResult.rows.length}`);
    if (clientCompaniesResult.rows.length > 0) {
      console.table(clientCompaniesResult.rows);
    }

    const clientUsersResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.client_company_id, c.company_name
      FROM users u
      LEFT JOIN clients c ON u.client_company_id = c.id
      WHERE u.role = 'Client'
      LIMIT 5
    `);
    console.log(`📊 Client users found: ${clientUsersResult.rows.length}`);
    if (clientUsersResult.rows.length > 0) {
      console.table(clientUsersResult.rows);
    }

    // Step 2: Test authentication for a client user
    if (clientUsersResult.rows.length > 0) {
      const testClient = clientUsersResult.rows[0];
      console.log(`\n2️⃣ Testing authentication for client: ${testClient.name} (${testClient.email})`);

      // Simulate getUserByEmail function
      const authResult = await pool.query(`
        SELECT id, email, password_hash, name, role, avatar, client_company_id, is_active 
        FROM users 
        WHERE email = $1 AND is_active = true
      `, [testClient.email]);

      if (authResult.rows.length > 0) {
        const user = authResult.rows[0];
        console.log('✅ User found in database');
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - Name: ${user.name}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Client Company ID: ${user.client_company_id}`);

        // Step 3: Test JWT token generation
        console.log('\n3️⃣ Testing JWT token generation...');
        const tokenPayload = {
          id: user.id,
          email: user.email,
          role: user.role,
          clientCompanyId: user.client_company_id,
        };
        
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
        console.log('✅ JWT token generated successfully');

        // Step 4: Test JWT token verification
        console.log('\n4️⃣ Testing JWT token verification...');
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          console.log('✅ JWT token verified successfully');
          console.log(`   - User ID: ${decoded.id}`);
          console.log(`   - Email: ${decoded.email}`);
          console.log(`   - Role: ${decoded.role}`);
          console.log(`   - Client Company ID: ${decoded.clientCompanyId}`);

          // Step 5: Test client company data retrieval
          if (decoded.clientCompanyId) {
            console.log('\n5️⃣ Testing client company data retrieval...');
            const companyResult = await pool.query(`
              SELECT id, company_name, company_address, contact_phone, contact_email
              FROM clients
              WHERE id = $1
            `, [decoded.clientCompanyId]);

            if (companyResult.rows.length > 0) {
              const company = companyResult.rows[0];
              console.log('✅ Client company data retrieved successfully');
              console.log(`   - Company ID: ${company.id}`);
              console.log(`   - Company Name: ${company.company_name}`);
              console.log(`   - Address: ${company.company_address || 'N/A'}`);
              console.log(`   - Phone: ${company.contact_phone || 'N/A'}`);
              console.log(`   - Email: ${company.contact_email || 'N/A'}`);
            } else {
              console.log('❌ Client company not found');
            }
          } else {
            console.log('⚠️ No client company ID in token');
          }

          // Step 6: Test jobs retrieval for client company
          if (decoded.clientCompanyId) {
            console.log('\n6️⃣ Testing jobs retrieval for client company...');
            const jobsResult = await pool.query(`
              SELECT j.id, j.name, j.description, c.company_name as client_name
              FROM jobs j
              JOIN clients c ON j.client_id = c.id
              WHERE j.client_id = $1
              LIMIT 5
            `, [decoded.clientCompanyId]);

            console.log(`📊 Jobs found for client company: ${jobsResult.rows.length}`);
            if (jobsResult.rows.length > 0) {
              console.table(jobsResult.rows);
            }
          }

        } catch (tokenError) {
          console.log('❌ JWT token verification failed:', tokenError.message);
        }

      } else {
        console.log('❌ User not found in database');
      }
    } else {
      console.log('⚠️ No client users found to test');
    }

    console.log('\n🎉 Client authentication flow test completed!');

  } catch (error) {
    console.error('❌ Error testing client authentication:', error);
  } finally {
    await pool.end();
  }
}

testClientAuth();
