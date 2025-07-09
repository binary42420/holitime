const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@pg-3c901dd1-hol619.b.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function createAssignedPersonnelTable() {
  try {
    console.log('🔍 Checking if assigned_personnel table exists...');
    
    // Check if table exists
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assigned_personnel'
      );
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    console.log(`📊 assigned_personnel table exists: ${tableExists}`);
    
    if (!tableExists) {
      console.log('🚀 Creating assigned_personnel table...');
      
      // Create the assigned_personnel table
      await pool.query(`
        CREATE TABLE assigned_personnel (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
          employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_on_shift VARCHAR(255),
          role_code VARCHAR(10) CHECK (role_code IN ('CC', 'SH', 'FO', 'RFO', 'RG', 'GL')),
          status VARCHAR(50) DEFAULT 'Clocked Out' CHECK (status IN ('Clocked Out', 'Clocked In', 'On Break', 'Shift Ended')),
          is_placeholder BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(shift_id, employee_id)
        );
      `);
      
      console.log('✅ assigned_personnel table created successfully!');
      
      // Create indexes for better performance
      await pool.query(`
        CREATE INDEX idx_assigned_personnel_shift_id ON assigned_personnel(shift_id);
      `);
      
      await pool.query(`
        CREATE INDEX idx_assigned_personnel_employee_id ON assigned_personnel(employee_id);
      `);
      
      console.log('✅ Indexes created successfully!');
      
    } else {
      console.log('ℹ️ assigned_personnel table already exists');
    }
    
    // Check the table structure
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'assigned_personnel'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 assigned_personnel table schema:');
    console.table(schemaResult.rows);
    
    // Check if there are any assignments
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM assigned_personnel`);
    console.log(`📈 Number of assignments in table: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating assigned_personnel table:', error);
  } finally {
    await pool.end();
  }
}

createAssignedPersonnelTable();
