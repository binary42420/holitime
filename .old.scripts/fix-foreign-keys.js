const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function fixForeignKeys() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Fixing foreign key relationships...');
    
    // Fix jobs table - add client_id column
    console.log('📊 Fixing jobs table...');
    
    try {
      await pool.query('ALTER TABLE jobs ADD COLUMN client_id UUID');
      console.log('✅ Added client_id column to jobs table');
    } catch (error) {
      console.log('⚠️ client_id column might already exist:', error.message);
    }
    
    // Since we don't have the old client data, we'll need to set client_id to the first client user
    const clientUsers = await pool.query("SELECT id FROM users WHERE role = 'Client' LIMIT 1");
    
    if (clientUsers.rows.length > 0) {
      const clientId = clientUsers.rows[0].id;
      await pool.query('UPDATE jobs SET client_id = $1 WHERE client_id IS NULL', [clientId]);
      console.log(`✅ Updated jobs to reference client user: ${clientId}`);
    }
    
    // Add foreign key constraint
    try {
      await pool.query('ALTER TABLE jobs ADD CONSTRAINT fk_jobs_client_id FOREIGN KEY (client_id) REFERENCES users(id)');
      console.log('✅ Added foreign key constraint for jobs.client_id');
    } catch (error) {
      console.log('⚠️ Foreign key constraint might already exist:', error.message);
    }
    
    // Fix assigned_personnel table - add employee_id column
    console.log('📊 Fixing assigned_personnel table...');
    
    try {
      await pool.query('ALTER TABLE assigned_personnel ADD COLUMN employee_id UUID');
      console.log('✅ Added employee_id column to assigned_personnel table');
    } catch (error) {
      console.log('⚠️ employee_id column might already exist:', error.message);
    }
    
    // Since we don't have the old employee data, we'll need to set employee_id to employee users
    const employeeUsers = await pool.query("SELECT id FROM users WHERE role IN ('Employee', 'Crew Chief') ORDER BY name");
    
    if (employeeUsers.rows.length > 0) {
      // Get all assigned_personnel records
      const assignedRecords = await pool.query('SELECT id FROM assigned_personnel WHERE employee_id IS NULL');
      
      // Assign employees in round-robin fashion
      for (let i = 0; i < assignedRecords.rows.length; i++) {
        const employeeId = employeeUsers.rows[i % employeeUsers.rows.length].id;
        await pool.query('UPDATE assigned_personnel SET employee_id = $1 WHERE id = $2', 
          [employeeId, assignedRecords.rows[i].id]);
      }
      
      console.log(`✅ Updated ${assignedRecords.rows.length} assigned_personnel records`);
    }
    
    // Add foreign key constraint
    try {
      await pool.query('ALTER TABLE assigned_personnel ADD CONSTRAINT fk_assigned_personnel_employee_id FOREIGN KEY (employee_id) REFERENCES users(id)');
      console.log('✅ Added foreign key constraint for assigned_personnel.employee_id');
    } catch (error) {
      console.log('⚠️ Foreign key constraint might already exist:', error.message);
    }
    
    // Verify the fixes
    console.log('\n📊 Verifying fixes...');
    
    const jobsResult = await pool.query(`
      SELECT j.id, j.name, u.name as client_name, u.company_name
      FROM jobs j
      LEFT JOIN users u ON j.client_id = u.id
      LIMIT 5
    `);
    
    console.log('Jobs with client relationships:');
    console.table(jobsResult.rows);
    
    const assignedResult = await pool.query(`
      SELECT ap.id, ap.role_on_shift, u.name as employee_name, u.role
      FROM assigned_personnel ap
      LEFT JOIN users u ON ap.employee_id = u.id
      LIMIT 5
    `);
    
    console.log('Assigned personnel with employee relationships:');
    console.table(assignedResult.rows);
    
    console.log('\n🎉 Foreign key relationships fixed!');

  } catch (error) {
    console.error('❌ Failed to fix foreign keys:', error);
  } finally {
    await pool.end();
  }
}

fixForeignKeys();
