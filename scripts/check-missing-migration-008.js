require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkMissingMigration008() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking Migration 008 Status...\n');

    // Check if migration 008 has been applied
    console.log('📋 Checking migrations table...');
    const migrationsResult = await pool.query('SELECT filename FROM migrations ORDER BY id');
    console.log('✅ Applied migrations:');
    migrationsResult.rows.forEach(row => console.log(`  - ${row.filename}`));

    const migration008Applied = migrationsResult.rows.some(row => 
      row.filename === '008_add_pending_user_support.sql'
    );

    console.log(`\n📊 Migration 008 applied: ${migration008Applied ? '✅ YES' : '❌ NO'}`);

    if (!migration008Applied) {
      console.log('\n🔧 Migration 008 needs to be applied!');
      console.log('This migration adds:');
      console.log('  - status column (active, pending_activation, inactive)');
      console.log('  - created_by column');
      console.log('  - requires_approval column');
      console.log('  - approval workflow columns');
      console.log('  - pending_employees view');

      // Apply migration 008
      console.log('\n📋 Applying Migration 008...');
      
      // Add status column
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' 
        CHECK (status IN ('active', 'pending_activation', 'inactive'))
      `);
      console.log('✅ Added status column');

      // Add other pending user support columns
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_notes TEXT');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT');
      console.log('✅ Added pending user support columns');

      // Update existing users to have 'active' status
      await pool.query("UPDATE users SET status = 'active' WHERE status IS NULL");
      console.log('✅ Updated existing users to active status');

      // Add comments
      await pool.query("COMMENT ON COLUMN users.status IS 'User account status: active, pending_activation, inactive'");
      await pool.query("COMMENT ON COLUMN users.created_by IS 'ID of the user who created this pending account'");
      await pool.query("COMMENT ON COLUMN users.requires_approval IS 'Whether this account requires manager approval before activation'");
      console.log('✅ Added column comments');

      // Create indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_users_requires_approval ON users(requires_approval)');
      console.log('✅ Created indexes');

      // Create pending employees view
      await pool.query(`
        CREATE OR REPLACE VIEW pending_employees AS
        SELECT 
            u.id,
            u.name,
            u.email,
            u.role,
            u.created_at,
            u.created_by,
            creator.name as created_by_name,
            u.approval_notes,
            COUNT(ap.id) as assigned_shifts_count
        FROM users u
        LEFT JOIN users creator ON u.created_by = creator.id
        LEFT JOIN assigned_personnel ap ON u.id = ap.employee_id
        WHERE u.status = 'pending_activation' AND u.requires_approval = true
        GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.created_by, creator.name, u.approval_notes
        ORDER BY u.created_at DESC
      `);
      console.log('✅ Created pending_employees view');

      // Record the migration
      await pool.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        ['008_add_pending_user_support.sql']
      );
      console.log('✅ Recorded migration in migrations table');

      console.log('\n✅ Migration 008 applied successfully!');
    } else {
      console.log('\n✅ Migration 008 already applied');
    }

    // Verify the status column now exists
    console.log('\n📋 Verifying status column...');
    const statusTest = await pool.query('SELECT id, name, status FROM users LIMIT 3');
    console.log('✅ Status column verified');
    console.log('📊 Sample users with status:');
    statusTest.rows.forEach(user => {
      console.log(`  - ${user.name}: ${user.status}`);
    });

    // Test the original failing query
    console.log('\n📋 Testing original users API query...');
    const originalQuery = `
      SELECT
        id, name, email, role, avatar, location,
        certifications, performance, crew_chief_eligible, fork_operator_eligible, osha_compliant,
        company_name, contact_person, contact_email, contact_phone,
        created_at, updated_at, last_login, is_active, status
      FROM users
      WHERE status IN ('active', 'pending_activation')
      ORDER BY
        CASE WHEN status = 'active' THEN 0 ELSE 1 END,
        name ASC
    `;

    const originalResult = await pool.query(originalQuery);
    console.log('✅ Original users API query now works!');
    console.log(`📊 Retrieved ${originalResult.rows.length} users`);

    // Show status distribution
    const statusCounts = {};
    originalResult.rows.forEach(user => {
      statusCounts[user.status] = (statusCounts[user.status] || 0) + 1;
    });

    console.log('📊 User status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    console.log('\n✅ Migration 008 verification completed!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Migration 008 applied successfully');
    console.log('  ✅ Status column added to users table');
    console.log('  ✅ Pending user support features enabled');
    console.log('  ✅ Original API query now works');
    console.log('  ✅ User status tracking functional');

  } catch (error) {
    console.error('❌ Migration 008 check failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
  } finally {
    await pool.end();
  }
}

checkMissingMigration008();
