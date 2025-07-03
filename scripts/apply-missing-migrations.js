require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Database connection using the same configuration as the app
function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  let sslConfig = false;
  if (connectionString.includes('sslmode=require')) {
    if (connectionString.includes('aivencloud.com') || process.env.DATABASE_PROVIDER === 'aiven') {
      sslConfig = {
        rejectUnauthorized: false, // Allow self-signed certificates for Aiven
      };
    } else {
      sslConfig = {
        rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
      };
    }
  }

  return new Pool({
    connectionString,
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

const pool = getPool();

async function query(text, params = []) {
  return await pool.query(text, params);
}

async function applyMissingMigrations() {
  console.log('🚀 Applying Missing Database Migrations...\n');

  try {
    // First, ensure migrations table exists
    console.log('📋 Ensuring migrations table exists...');
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Migrations table ready');

    // Check what migrations have been run
    console.log('\n📋 Checking executed migrations...');
    let existingMigrations;
    try {
      existingMigrations = await query('SELECT filename FROM migrations ORDER BY created_at');
    } catch (error) {
      // If created_at doesn't exist, try without it
      existingMigrations = await query('SELECT filename FROM migrations');
    }
    console.log('✅ Previously executed migrations:');
    existingMigrations.rows.forEach(row => console.log(`  - ${row.filename}`));

    // Migration 006: Add Company Logos
    console.log('\n📋 Checking Migration 006: Company Logos...');
    const migration006Exists = existingMigrations.rows.some(row => row.filename === '006_add_company_logos.sql');
    
    if (!migration006Exists) {
      console.log('🔧 Applying Migration 006: Add Company Logos...');
      
      // Add logo_url field to clients table
      await query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)');
      
      // Add index for logo_url
      await query('CREATE INDEX IF NOT EXISTS idx_clients_logo_url ON clients(logo_url)');
      
      // Add comment
      await query("COMMENT ON COLUMN clients.logo_url IS 'URL or file path to the company logo image'");
      
      // Record migration
      await query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        ['006_add_company_logos.sql']
      );
      
      console.log('✅ Migration 006 completed successfully');
    } else {
      console.log('✅ Migration 006 already applied');
    }

    // Migration 009: Add OSHA Compliant Trait
    console.log('\n📋 Checking Migration 009: OSHA Compliant Trait...');
    const migration009Exists = existingMigrations.rows.some(row => row.filename === '009_add_osha_compliant_trait.sql');
    
    if (!migration009Exists) {
      console.log('🔧 Applying Migration 009: OSHA Compliant Trait...');
      
      // Add osha_compliant column to users table
      await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS osha_compliant BOOLEAN DEFAULT false');
      
      // Create index for better performance
      await query('CREATE INDEX IF NOT EXISTS idx_users_osha_compliant ON users(osha_compliant)');
      
      // Add comment for documentation
      await query("COMMENT ON COLUMN users.osha_compliant IS 'Whether this user is OSHA compliant and certified'");
      
      // Record migration
      await query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        ['009_add_osha_compliant_trait.sql']
      );
      
      console.log('✅ Migration 009 completed successfully');
    } else {
      console.log('✅ Migration 009 already applied');
    }

    // Verify the schema changes
    console.log('\n📋 Verifying schema changes...');

    // Check clients table
    try {
      const clientsTest = await query('SELECT id, company_name, logo_url FROM clients LIMIT 1');
      console.log('✅ Clients table logo_url column verified');
    } catch (error) {
      console.error('❌ Clients table verification failed:', error.message);
    }

    // Check users table
    try {
      const usersTest = await query('SELECT id, name, osha_compliant FROM users LIMIT 1');
      console.log('✅ Users table osha_compliant column verified');
    } catch (error) {
      console.error('❌ Users table verification failed:', error.message);
    }

    // Show current table structures
    console.log('\n📋 Current table structures:');
    
    // Clients table columns
    const clientsColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `);
    console.log('\n✅ Clients table columns:');
    clientsColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})${row.column_default ? ` default: ${row.column_default}` : ''}`);
    });

    // Users table certification-related columns
    const usersColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('osha_compliant', 'fork_operator_eligible', 'crew_chief_eligible')
      ORDER BY column_name
    `);
    console.log('\n✅ Users table certification columns:');
    usersColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})${row.column_default ? ` default: ${row.column_default}` : ''}`);
    });

    console.log('\n✅ Database migrations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Added logo_url column to clients table');
    console.log('  ✅ Added osha_compliant column to users table');
    console.log('  ✅ Created appropriate indexes for performance');
    console.log('  ✅ Added documentation comments');
    console.log('  ✅ Recorded migrations in migrations table');
    console.log('\n🚀 The application should now work without database schema errors!');
    console.log('\n📋 Next steps:');
    console.log('  1. Restart your development server');
    console.log('  2. Test /api/clients endpoint');
    console.log('  3. Test /api/users endpoint');
    console.log('  4. Verify company logo and OSHA compliance features work');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  applyMissingMigrations().catch(console.error);
}

module.exports = { applyMissingMigrations };
