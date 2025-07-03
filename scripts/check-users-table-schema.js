require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkUsersTableSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking Users Table Schema...\n');

    // Get all columns in the users table
    const columnsResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);

    console.log('📋 Current users table columns:');
    console.table(columnsResult.rows);

    // Check if status column exists
    const hasStatusColumn = columnsResult.rows.some(row => row.column_name === 'status');
    console.log(`\n📊 Status column exists: ${hasStatusColumn ? '✅ YES' : '❌ NO'}`);

    // Check what the current query is trying to select
    console.log('\n📋 Query analysis:');
    console.log('The failing query is trying to select:');
    console.log('  - id, name, email, role, avatar, location');
    console.log('  - certifications, performance, crew_chief_eligible, fork_operator_eligible, osha_compliant');
    console.log('  - company_name, contact_person, contact_email, contact_phone');
    console.log('  - created_at, updated_at, last_login, is_active, status ← MISSING');

    // Check which columns from the query actually exist
    const queryColumns = [
      'id', 'name', 'email', 'role', 'avatar', 'location',
      'certifications', 'performance', 'crew_chief_eligible', 'fork_operator_eligible', 'osha_compliant',
      'company_name', 'contact_person', 'contact_email', 'contact_phone',
      'created_at', 'updated_at', 'last_login', 'is_active', 'status'
    ];

    const existingColumns = columnsResult.rows.map(row => row.column_name);
    
    console.log('\n📊 Column existence check:');
    queryColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    // Suggest the corrected query
    const validColumns = queryColumns.filter(col => existingColumns.includes(col));
    
    console.log('\n🔧 Suggested corrected query:');
    console.log('SELECT');
    console.log('  ' + validColumns.join(',\n  '));
    console.log('FROM users');
    console.log('ORDER BY name ASC');

    // Check if there's an alternative to status column
    console.log('\n📋 Possible alternatives to status column:');
    const statusAlternatives = existingColumns.filter(col => 
      col.includes('active') || col.includes('status') || col.includes('enabled') || col.includes('pending')
    );
    
    if (statusAlternatives.length > 0) {
      console.log('Found potential status-related columns:');
      statusAlternatives.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('No status-related columns found. Consider using is_active for filtering.');
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTableSchema();
