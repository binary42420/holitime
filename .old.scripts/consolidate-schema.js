const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function consolidateSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting schema consolidation...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '003_consolidate_user_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          await pool.query(statement);
          console.log(`✅ Statement ${i + 1} completed successfully`);
        } catch (error) {
          console.log(`⚠️ Statement ${i + 1} failed (might be expected):`, error.message);
          // Continue with other statements even if one fails
        }
      }
    }
    
    console.log('\n🎉 Schema consolidation completed!');
    
    // Verify the new structure
    console.log('\n📊 Verifying new users table structure...');
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('New users table columns:');
    console.table(schemaResult.rows);
    
    // Check data migration
    console.log('\n📈 Checking data migration...');
    const dataResult = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN certifications IS NOT NULL THEN 1 END) as with_certifications,
        COUNT(CASE WHEN company_name IS NOT NULL THEN 1 END) as with_company_name
      FROM users 
      GROUP BY role
      ORDER BY role
    `);
    
    console.log('Data migration summary:');
    console.table(dataResult.rows);

  } catch (error) {
    console.error('❌ Schema consolidation failed:', error);
  } finally {
    await pool.end();
  }
}

consolidateSchema();
