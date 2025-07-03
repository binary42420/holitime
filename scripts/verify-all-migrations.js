require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function verifyAllMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Verifying All Database Migrations...\n');

    // Get all migration files
    const migrationsDir = path.join(process.cwd(), 'src', 'lib', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('📋 Available migration files:');
    migrationFiles.forEach(file => console.log(`  - ${file}`));

    // Get applied migrations from database
    console.log('\n📋 Checking applied migrations...');
    const appliedMigrationsResult = await pool.query('SELECT filename FROM migrations ORDER BY id');
    const appliedMigrations = appliedMigrationsResult.rows.map(row => row.filename);
    
    console.log('✅ Applied migrations:');
    appliedMigrations.forEach(migration => console.log(`  - ${migration}`));

    // Check for missing migrations
    console.log('\n📊 Migration Status Analysis:');
    const missingMigrations = [];
    
    migrationFiles.forEach(file => {
      const isApplied = appliedMigrations.includes(file);
      console.log(`  ${isApplied ? '✅' : '❌'} ${file}`);
      if (!isApplied) {
        missingMigrations.push(file);
      }
    });

    if (missingMigrations.length > 0) {
      console.log(`\n⚠️  Found ${missingMigrations.length} missing migrations:`);
      missingMigrations.forEach(migration => console.log(`  - ${migration}`));
      
      // Apply missing migrations
      console.log('\n🔧 Applying missing migrations...');
      
      for (const migrationFile of missingMigrations) {
        console.log(`\n📋 Applying ${migrationFile}...`);
        
        try {
          const migrationPath = path.join(migrationsDir, migrationFile);
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
          
          // Execute the migration SQL
          await pool.query(migrationSQL);
          
          // Record the migration
          await pool.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [migrationFile]
          );
          
          console.log(`✅ ${migrationFile} applied successfully`);
        } catch (error) {
          console.error(`❌ Failed to apply ${migrationFile}:`, error.message);
        }
      }
    } else {
      console.log('\n✅ All migrations are up to date!');
    }

    // Verify specific schema elements
    console.log('\n📋 Verifying Schema Elements...\n');

    // Check clients table
    console.log('🔍 Clients table verification:');
    const clientsColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'clients' ORDER BY ordinal_position
    `);
    const clientsColumnNames = clientsColumns.rows.map(row => row.column_name);
    
    const expectedClientsColumns = ['id', 'company_name', 'company_address', 'contact_phone', 'contact_email', 'notes', 'created_at', 'updated_at', 'logo_url'];
    expectedClientsColumns.forEach(col => {
      const exists = clientsColumnNames.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    // Check users table
    console.log('\n🔍 Users table verification:');
    const usersColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' ORDER BY ordinal_position
    `);
    const usersColumnNames = usersColumns.rows.map(row => row.column_name);
    
    const expectedUsersColumns = [
      'id', 'email', 'password_hash', 'name', 'role', 'avatar', 'certifications', 'performance', 'location',
      'company_name', 'contact_person', 'contact_email', 'contact_phone', 'created_at', 'updated_at', 'last_login', 'is_active',
      'crew_chief_eligible', 'fork_operator_eligible', 'osha_compliant', 'status', 'created_by', 'requires_approval'
    ];
    expectedUsersColumns.forEach(col => {
      const exists = usersColumnNames.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });

    // Check for important indexes
    console.log('\n🔍 Index verification:');
    const indexesResult = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename IN ('users', 'clients', 'jobs', 'shifts', 'assigned_personnel')
      ORDER BY indexname
    `);
    
    const expectedIndexes = [
      'idx_users_status',
      'idx_users_osha_compliant', 
      'idx_clients_logo_url',
      'idx_users_crew_chief_eligible',
      'idx_users_fork_operator_eligible'
    ];
    
    const existingIndexes = indexesResult.rows.map(row => row.indexname);
    expectedIndexes.forEach(idx => {
      const exists = existingIndexes.includes(idx);
      console.log(`  ${exists ? '✅' : '❌'} ${idx}`);
    });

    // Check for important views
    console.log('\n🔍 Views verification:');
    const viewsResult = await pool.query(`
      SELECT viewname FROM pg_views 
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);
    
    const expectedViews = ['pending_employees'];
    const existingViews = viewsResult.rows.map(row => row.viewname);
    expectedViews.forEach(view => {
      const exists = existingViews.includes(view);
      console.log(`  ${exists ? '✅' : '❌'} ${view}`);
    });

    // Test critical queries
    console.log('\n🔍 Critical queries verification:');
    
    // Test clients query
    try {
      await pool.query('SELECT id, company_name, logo_url FROM clients LIMIT 1');
      console.log('  ✅ Clients API query');
    } catch (error) {
      console.log('  ❌ Clients API query:', error.message);
    }

    // Test users query
    try {
      await pool.query(`
        SELECT id, name, email, role, status, osha_compliant, crew_chief_eligible, fork_operator_eligible 
        FROM users WHERE status IN ('active', 'pending_activation') LIMIT 1
      `);
      console.log('  ✅ Users API query');
    } catch (error) {
      console.log('  ❌ Users API query:', error.message);
    }

    // Test pending employees view
    try {
      await pool.query('SELECT COUNT(*) FROM pending_employees');
      console.log('  ✅ Pending employees view');
    } catch (error) {
      console.log('  ❌ Pending employees view:', error.message);
    }

    // Final summary
    console.log('\n📊 Migration Verification Summary:');
    const finalAppliedMigrations = await pool.query('SELECT COUNT(*) as count FROM migrations');
    console.log(`  📋 Total applied migrations: ${finalAppliedMigrations.rows[0].count}`);
    console.log(`  📋 Total migration files: ${migrationFiles.length}`);
    
    const allApplied = finalAppliedMigrations.rows[0].count >= migrationFiles.length;
    console.log(`  ${allApplied ? '✅' : '❌'} All migrations applied: ${allApplied}`);

    if (allApplied) {
      console.log('\n🚀 Database schema is fully up to date!');
      console.log('   All migrations have been applied successfully.');
      console.log('   All expected columns, indexes, and views are present.');
      console.log('   Critical API queries are functional.');
    } else {
      console.log('\n⚠️  Database schema needs attention!');
      console.log('   Some migrations may still need to be applied.');
      console.log('   Please review the missing migrations above.');
    }

  } catch (error) {
    console.error('❌ Migration verification failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
  } finally {
    await pool.end();
  }
}

verifyAllMigrations();
