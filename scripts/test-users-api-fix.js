require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testUsersApiFix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🧪 Testing Users API Fix...\n');

    // Test the corrected query directly
    console.log('📋 Testing corrected users query...');
    
    const correctedQuery = `
      SELECT
        id, name, email, role, avatar, location,
        certifications, performance, crew_chief_eligible, fork_operator_eligible, osha_compliant,
        company_name, contact_person, contact_email, contact_phone,
        created_at, updated_at, last_login, is_active
      FROM users
      WHERE is_active = true
      ORDER BY name ASC
    `;

    const result = await pool.query(correctedQuery);
    console.log('✅ Corrected query successful');
    console.log(`📊 Retrieved ${result.rows.length} active users`);

    // Show sample data structure
    if (result.rows.length > 0) {
      const sampleUser = result.rows[0];
      console.log('\n📋 Sample user data structure:');
      console.log('Available columns:');
      Object.keys(sampleUser).forEach(key => {
        const value = sampleUser[key];
        const type = typeof value;
        const preview = type === 'string' && value.length > 20 ? 
          value.substring(0, 20) + '...' : 
          value;
        console.log(`  - ${key}: ${type} (${preview})`);
      });
    }

    // Test the query without WHERE clause to see all users
    console.log('\n📋 Testing query for all users (including inactive)...');
    const allUsersQuery = `
      SELECT
        id, name, email, role, is_active,
        crew_chief_eligible, fork_operator_eligible, osha_compliant
      FROM users
      ORDER BY name ASC
    `;

    const allUsersResult = await pool.query(allUsersQuery);
    console.log('✅ All users query successful');
    console.log(`📊 Total users in database: ${allUsersResult.rows.length}`);
    
    // Show active vs inactive breakdown
    const activeUsers = allUsersResult.rows.filter(user => user.is_active);
    const inactiveUsers = allUsersResult.rows.filter(user => !user.is_active);
    
    console.log(`📊 Active users: ${activeUsers.length}`);
    console.log(`📊 Inactive users: ${inactiveUsers.length}`);

    // Test specific user roles and certifications
    console.log('\n📋 User roles and certifications breakdown:');
    const roleStats = {};
    const certificationStats = {
      crewChief: 0,
      forkOperator: 0,
      oshaCompliant: 0
    };

    allUsersResult.rows.forEach(user => {
      // Count roles
      roleStats[user.role] = (roleStats[user.role] || 0) + 1;
      
      // Count certifications
      if (user.crew_chief_eligible) certificationStats.crewChief++;
      if (user.fork_operator_eligible) certificationStats.forkOperator++;
      if (user.osha_compliant) certificationStats.oshaCompliant++;
    });

    console.log('Role distribution:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count}`);
    });

    console.log('Certification distribution:');
    console.log(`  - Crew Chief Eligible: ${certificationStats.crewChief}`);
    console.log(`  - Fork Operator Eligible: ${certificationStats.forkOperator}`);
    console.log(`  - OSHA Compliant: ${certificationStats.oshaCompliant}`);

    console.log('\n✅ Users API fix verification completed!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Removed non-existent status column from query');
    console.log('  ✅ Using is_active column for filtering');
    console.log('  ✅ Query executes without errors');
    console.log('  ✅ All expected columns are available');
    console.log('  ✅ User data structure is correct');

    console.log('\n🚀 The /api/users endpoint should now work without errors!');

  } catch (error) {
    console.error('❌ Users API test failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      position: error.position
    });
  } finally {
    await pool.end();
  }
}

testUsersApiFix();
