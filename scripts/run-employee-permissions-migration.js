const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runEmployeePermissionsMigration() {
  try {
    console.log('🔍 Running employee permissions migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '006_add_employee_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Employee permissions migration completed successfully');

    // Verify the columns were added
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('crew_chief_eligible', 'fork_operator_eligible')
      ORDER BY column_name
    `);

    if (schemaCheck.rows.length === 2) {
      console.log('✅ Permission columns verified:');
      console.table(schemaCheck.rows);
    } else {
      console.log('❌ Permission columns not found');
    }

    // Check how many users have each permission
    const permissionStats = await pool.query(`
      SELECT 
        role,
        COUNT(*) as total_users,
        SUM(CASE WHEN crew_chief_eligible THEN 1 ELSE 0 END) as crew_chief_eligible_count,
        SUM(CASE WHEN fork_operator_eligible THEN 1 ELSE 0 END) as fork_operator_eligible_count
      FROM users 
      GROUP BY role
      ORDER BY role
    `);

    console.log('📊 Permission statistics by role:');
    console.table(permissionStats.rows);

  } catch (error) {
    console.error('❌ Error running employee permissions migration:', error);
  } finally {
    await pool.end();
  }
}

runEmployeePermissionsMigration();
