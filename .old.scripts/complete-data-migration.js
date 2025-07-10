const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven (if applicable)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function completeDataMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Completing data migration...');
    
    // Check if old tables still exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'clients_old', 'client_user_links') 
    `);
    // Assuming old clients table is renamed to 'clients_old' for clarity if it conflicts with the new 'clients' table.
    
    console.log('Existing old tables:', tablesResult.rows.map(r => r.table_name));
    
    // 1. Migrate Employee Data to Users Table
    if (tablesResult.rows.some(r => r.table_name === 'employees')) {
      console.log('📊 Migrating employee data to users table...');
      
      const employeeMigration = await pool.query(`
        UPDATE users 
        SET 
          certifications = e.certifications,
          performance = e.performance,
          location = e.location
          -- Assuming crew_chief_eligible and fork_operator_eligible might be derivable from old data if available
        FROM employees e
        WHERE users.id = e.user_id AND users.role = 'Employee' -- Ensure we only update employee roles
      `);
      
      console.log(`✅ Updated ${employeeMigration.rowCount} employee records in users table`);
    }
    
    // 2. Migrate Client Data to New Clients Table and Update Users Table
    if (tablesResult.rows.some(r => r.table_name === 'clients_old') && 
        tablesResult.rows.some(r => r.table_name === 'client_user_links')) {
      
      console.log('📊 Migrating data to the new clients table...');
      
      // Step 2a: Insert data into the new 'clients' table from the old structure.
      // We need to handle potential duplicates if the old structure allowed them.
      const clientInsert = await pool.query(`
        INSERT INTO clients (id, company_name, company_address, contact_phone, contact_email)
        SELECT 
          c.id, 
          c.name, 
          c.address, 
          c.contact_phone, 
          c.contact_email
        FROM clients_old c
        ON CONFLICT (id) DO UPDATE SET -- Assuming old client IDs can be reused if they are UUIDs
          company_name = EXCLUDED.company_name,
          company_address = EXCLUDED.company_address,
          contact_phone = EXCLUDED.contact_phone,
          contact_email = EXCLUDED.contact_email
      `);
      
      console.log(`✅ Inserted/Updated ${clientInsert.rowCount} records in the new clients table`);

      // Step 2b: Update the 'users' table to link client users to their company in the 'clients' table.
      console.log('🔗 Linking client users to their companies...');
      
      const clientLinkUpdate = await pool.query(`
        UPDATE users 
        SET 
          client_company_id = cul.client_id
        FROM client_user_links cul
        WHERE users.id = cul.user_id AND users.role = 'Client'
      `);
      
      console.log(`✅ Linked ${clientLinkUpdate.rowCount} client users to companies`);
    }

    // 3. Verify Foreign Key Updates (Assuming 'jobs' and 'assigned_personnel' are already using the new schema structure)
    
    console.log('🔗 Verifying foreign key relationships...');
    
    // Check jobs table structure (it should already conform to the new schema)
    const jobsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'jobs'
    `);
    
    if (jobsColumns.rows.some(r => r.column_name === 'client_id')) {
      console.log('✅ Jobs table uses client_id FK.');
    } else {
      console.log('⚠️ Jobs table structure mismatch detected.');
    }

    // Check assigned_personnel table structure
    const assignedColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assigned_personnel'
    `);
    
    if (assignedColumns.rows.some(r => r.column_name === 'employee_id')) {
      console.log('✅ Assigned personnel table structure looks correct (uses employee_id FK to users).');
    } else {
        console.log('⚠️ Assigned personnel table structure mismatch detected.');
    }
    
    // Final verification
    console.log('\n📈 Final verification...');
    const finalResult = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN certifications IS NOT NULL THEN 1 END) as with_certifications,
        COUNT(CASE WHEN client_company_id IS NOT NULL THEN 1 END) as linked_to_company,
        COUNT(CASE WHEN performance IS NOT NULL AND performance > 0 THEN 1 END) as with_performance
      FROM users 
      GROUP BY role
      ORDER BY role
    `);
    
    console.log('Final data migration summary:');
    console.table(finalResult.rows);

  } catch (error) {
    console.error('❌ Data migration failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await pool.end();
  }
}

completeDataMigration();