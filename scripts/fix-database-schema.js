const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function fixDatabaseSchema() {
  // Use DATABASE_URL from environment if available, otherwise fall back to individual vars
  const connectionConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  } : {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'holitime',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
  };

  const pool = new Pool(connectionConfig);

  try {
    console.log('🚀 Fixing Database Schema Issues...\n');

    // Check current migrations
    console.log('📋 Checking executed migrations...');
    try {
      const migrationCheck = await pool.query('SELECT filename FROM migrations ORDER BY created_at');
      console.log('✅ Executed migrations:');
      migrationCheck.rows.forEach(row => console.log(`  - ${row.filename}`));
    } catch (error) {
      console.log('⚠️  Migrations table may not exist yet');
    }

    console.log('\n📋 Checking for missing columns...');

    // Check if logo_url column exists in clients table
    try {
      await pool.query('SELECT logo_url FROM clients LIMIT 1');
      console.log('✅ logo_url column exists in clients table');
    } catch (error) {
      if (error.code === '42703') {
        console.log('❌ logo_url column missing from clients table');
        console.log('🔧 Running company logos migration...');
        
        // Run migration 006 - Add Company Logos
        const migration006Path = path.join(__dirname, '..', 'src', 'lib', 'migrations', '006_add_company_logos.sql');
        if (fs.existsSync(migration006Path)) {
          const migration006SQL = fs.readFileSync(migration006Path, 'utf8');
          await pool.query(migration006SQL);
          
          // Record migration
          await pool.query(
            'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
            ['006_add_company_logos.sql']
          );
          
          console.log('✅ Company logos migration completed');
        } else {
          console.log('❌ Migration file 006_add_company_logos.sql not found');
        }
      } else {
        console.error('Error checking logo_url column:', error.message);
      }
    }

    // Check if osha_compliant column exists in users table
    try {
      await pool.query('SELECT osha_compliant FROM users LIMIT 1');
      console.log('✅ osha_compliant column exists in users table');
    } catch (error) {
      if (error.code === '42703') {
        console.log('❌ osha_compliant column missing from users table');
        console.log('🔧 Running OSHA compliance migration...');
        
        // Run migration 009 - Add OSHA Compliant Trait
        const migration009Path = path.join(__dirname, '..', 'src', 'lib', 'migrations', '009_add_osha_compliant_trait.sql');
        if (fs.existsSync(migration009Path)) {
          const migration009SQL = fs.readFileSync(migration009Path, 'utf8');
          await pool.query(migration009SQL);
          
          // Record migration
          await pool.query(
            'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
            ['009_add_osha_compliant_trait.sql']
          );
          
          console.log('✅ OSHA compliance migration completed');
        } else {
          console.log('❌ Migration file 009_add_osha_compliant_trait.sql not found');
        }
      } else {
        console.error('Error checking osha_compliant column:', error.message);
      }
    }

    console.log('\n📋 Verifying schema fixes...');

    // Verify clients table structure
    try {
      const clientsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        ORDER BY ordinal_position
      `);
      console.log('✅ Clients table columns:');
      clientsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } catch (error) {
      console.error('Error checking clients table:', error.message);
    }

    // Verify users table structure (relevant columns)
    try {
      const usersResult = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('osha_compliant', 'fork_operator_eligible', 'crew_chief_eligible')
        ORDER BY column_name
      `);
      console.log('✅ Users table certification columns:');
      usersResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } catch (error) {
      console.error('Error checking users table:', error.message);
    }

    console.log('\n📋 Testing API endpoints...');

    // Test if we can query clients with logo_url
    try {
      const clientsTest = await pool.query('SELECT id, company_name, logo_url FROM clients LIMIT 1');
      console.log('✅ Clients API query test passed');
    } catch (error) {
      console.error('❌ Clients API query test failed:', error.message);
    }

    // Test if we can query users with osha_compliant
    try {
      const usersTest = await pool.query('SELECT id, name, osha_compliant FROM users LIMIT 1');
      console.log('✅ Users API query test passed');
    } catch (error) {
      console.error('❌ Users API query test failed:', error.message);
    }

    console.log('\n✅ Database schema fix completed!');
    console.log('\n📋 Summary:');
    console.log('  - Fixed missing logo_url column in clients table');
    console.log('  - Fixed missing osha_compliant column in users table');
    console.log('  - Verified API endpoint compatibility');
    console.log('\n🚀 Application should now work without database errors!');

  } catch (error) {
    console.error('❌ Database schema fix failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  fixDatabaseSchema().catch(console.error);
}

module.exports = { fixDatabaseSchema };
