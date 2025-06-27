const { config } = require('dotenv');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
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
      AND table_name IN ('employees', 'clients', 'client_user_links')
    `);
    
    console.log('Existing tables:', tablesResult.rows.map(r => r.table_name));
    
    if (tablesResult.rows.some(r => r.table_name === 'employees')) {
      console.log('📊 Migrating employee data...');
      
      // Migrate employee data
      const employeeMigration = await pool.query(`
        UPDATE users 
        SET 
          certifications = e.certifications,
          performance = e.performance,
          location = e.location
        FROM employees e
        WHERE users.id = e.user_id
      `);
      
      console.log(`✅ Updated ${employeeMigration.rowCount} employee records`);
    }
    
    if (tablesResult.rows.some(r => r.table_name === 'clients') && 
        tablesResult.rows.some(r => r.table_name === 'client_user_links')) {
      console.log('📊 Migrating client data...');
      
      // Migrate client data
      const clientMigration = await pool.query(`
        UPDATE users 
        SET 
          company_name = c.name,
          company_address = c.address,
          contact_person = c.contact_person,
          contact_email = c.contact_email,
          contact_phone = c.contact_phone
        FROM clients c
        JOIN client_user_links cul ON c.id = cul.client_id
        WHERE users.id = cul.user_id
      `);
      
      console.log(`✅ Updated ${clientMigration.rowCount} client records`);
    }
    
    // Now handle the foreign key updates that failed
    console.log('🔗 Updating foreign key relationships...');
    
    // Check current jobs table structure
    const jobsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'jobs'
    `);
    
    console.log('Jobs table columns:', jobsColumns.rows.map(r => r.column_name));
    
    // Check current assigned_personnel table structure  
    const assignedColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assigned_personnel'
    `);
    
    console.log('Assigned personnel columns:', assignedColumns.rows.map(r => r.column_name));
    
    // Update jobs table if needed
    if (jobsColumns.rows.some(r => r.column_name === 'client_id')) {
      console.log('⚠️ Jobs table still has old client_id structure - this needs manual fixing');
      
      // For now, let's just verify the data
      const jobsData = await pool.query('SELECT id, client_id FROM jobs LIMIT 5');
      console.log('Sample jobs data:', jobsData.rows);
    }
    
    // Update assigned_personnel table if needed
    if (assignedColumns.rows.some(r => r.column_name === 'employee_id')) {
      console.log('✅ Assigned personnel table structure looks correct');
      
      // Verify the data
      const assignedData = await pool.query('SELECT id, employee_id FROM assigned_personnel LIMIT 5');
      console.log('Sample assigned personnel data:', assignedData.rows);
    }
    
    // Final verification
    console.log('\n📈 Final verification...');
    const finalResult = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN certifications IS NOT NULL THEN 1 END) as with_certifications,
        COUNT(CASE WHEN company_name IS NOT NULL THEN 1 END) as with_company_name,
        COUNT(CASE WHEN performance IS NOT NULL AND performance > 0 THEN 1 END) as with_performance
      FROM users 
      GROUP BY role
      ORDER BY role
    `);
    
    console.log('Final data migration summary:');
    console.table(finalResult.rows);

  } catch (error) {
    console.error('❌ Data migration failed:', error);
  } finally {
    await pool.end();
  }
}

completeDataMigration();
