const { Pool } = require('pg');

// Disable SSL certificate verification for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@pg-3c901dd1-hol619.b.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function recreateTimesheetTables() {
  try {
    console.log('🔍 Checking timesheet-related tables...');
    
    // Check which tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('timesheets', 'time_entries')
      ORDER BY table_name
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('📊 Existing timesheet tables:', existingTables);
    
    // Create timesheets table if it doesn't exist
    if (!existingTables.includes('timesheets')) {
      console.log('🚀 Creating timesheets table...');
      
      await pool.query(`
        CREATE TABLE timesheets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_client_approval', 'pending_manager_approval', 'completed', 'rejected')),
          submitted_by UUID REFERENCES users(id),
          submitted_at TIMESTAMP WITH TIME ZONE,
          client_approved_by UUID REFERENCES users(id),
          client_approved_at TIMESTAMP WITH TIME ZONE,
          client_signature TEXT, -- Base64 encoded signature
          manager_approved_by UUID REFERENCES users(id),
          manager_approved_at TIMESTAMP WITH TIME ZONE,
          manager_signature TEXT, -- Base64 encoded signature
          rejection_reason TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Create index
      await pool.query(`CREATE INDEX idx_timesheets_shift ON timesheets(shift_id);`);
      
      // Create update trigger
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);
      
      await pool.query(`
        CREATE TRIGGER update_timesheets_updated_at 
        BEFORE UPDATE ON timesheets 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      
      console.log('✅ Timesheets table created successfully!');
    } else {
      console.log('ℹ️ Timesheets table already exists');
    }
    
    // Create time_entries table if it doesn't exist
    if (!existingTables.includes('time_entries')) {
      console.log('🚀 Creating time_entries table...');
      
      await pool.query(`
        CREATE TABLE time_entries (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          assigned_personnel_id UUID NOT NULL REFERENCES assigned_personnel(id) ON DELETE CASCADE,
          entry_number INTEGER NOT NULL DEFAULT 1,
          clock_in TIMESTAMP WITH TIME ZONE,
          clock_out TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(assigned_personnel_id, entry_number)
        );
      `);
      
      // Create indexes
      await pool.query(`CREATE INDEX idx_time_entries_assigned_personnel ON time_entries(assigned_personnel_id);`);
      await pool.query(`CREATE INDEX idx_time_entries_active ON time_entries(is_active) WHERE is_active = true;`);
      
      // Create update trigger
      await pool.query(`
        CREATE TRIGGER update_time_entries_updated_at 
        BEFORE UPDATE ON time_entries 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      
      console.log('✅ Time entries table created successfully!');
    } else {
      console.log('ℹ️ Time entries table already exists');
    }
    
    // Check final table structures
    console.log('\n📋 Final table structures:');
    
    if (existingTables.includes('timesheets') || !existingTables.includes('timesheets')) {
      const timesheetsSchema = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'timesheets'
        ORDER BY ordinal_position
      `);
      console.log('📊 Timesheets table schema:');
      console.table(timesheetsSchema.rows);
    }
    
    if (existingTables.includes('time_entries') || !existingTables.includes('time_entries')) {
      const timeEntriesSchema = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'time_entries'
        ORDER BY ordinal_position
      `);
      console.log('📊 Time entries table schema:');
      console.table(timeEntriesSchema.rows);
    }
    
    console.log('\n🎉 Timesheet system tables are ready!');
    
  } catch (error) {
    console.error('❌ Error recreating timesheet tables:', error);
  } finally {
    await pool.end();
  }
}

recreateTimesheetTables();
