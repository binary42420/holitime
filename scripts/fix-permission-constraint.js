const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixPermissionConstraint() {
  try {
    console.log('🔧 Fixing crew chief permission constraint...');
    
    // Drop the existing trigger and function
    await pool.query('DROP TRIGGER IF EXISTS trigger_validate_crew_chief_permission ON crew_chief_permissions');
    await pool.query('DROP FUNCTION IF EXISTS validate_crew_chief_permission()');
    
    // Create updated function that allows both Employee and Crew Chief roles
    await pool.query(`
      CREATE OR REPLACE FUNCTION validate_crew_chief_permission()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Check if user is an employee or crew chief (both can receive admin-granted permissions)
          IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id AND role IN ('Employee', 'Crew Chief')) THEN
              RAISE EXCEPTION 'Crew chief permissions can only be granted to employees and crew chiefs';
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Recreate the trigger
    await pool.query(`
      CREATE TRIGGER trigger_validate_crew_chief_permission
          BEFORE INSERT OR UPDATE ON crew_chief_permissions
          FOR EACH ROW EXECUTE FUNCTION validate_crew_chief_permission();
    `);
    
    console.log('✅ Crew chief permission constraint updated successfully!');
    console.log('📝 Both Employee and Crew Chief role users can now receive admin-granted permissions');
    
  } catch (error) {
    console.error('❌ Failed to fix crew chief constraint:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixPermissionConstraint();
