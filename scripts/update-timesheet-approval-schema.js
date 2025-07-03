const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function updateTimesheetApprovalSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Updating database schema for comprehensive timesheet approval workflow...');
    
    // Step 1: Update shifts table status constraint to include "Pending Client Approval"
    console.log('📋 Updating shifts status constraint...');
    await pool.query(`
      ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check
    `);
    
    await pool.query(`
      ALTER TABLE shifts 
      ADD CONSTRAINT shifts_status_check 
      CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Cancelled', 'Pending Approval', 'Pending Client Approval'))
    `);
    
    // Step 2: Update timesheets table status constraint to match requirements
    console.log('📋 Updating timesheets status constraint...');
    await pool.query(`
      ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_status_check
    `);
    
    await pool.query(`
      ALTER TABLE timesheets 
      ADD CONSTRAINT timesheets_status_check 
      CHECK (status IN ('draft', 'pending_client_approval', 'pending_final_approval', 'completed', 'rejected'))
    `);
    
    // Step 3: Add PDF storage field to timesheets table
    console.log('📋 Adding PDF storage field to timesheets...');
    await pool.query(`
      ALTER TABLE timesheets 
      ADD COLUMN IF NOT EXISTS pdf_file_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP WITH TIME ZONE
    `);
    
    // Step 4: Create notifications table
    console.log('📋 Creating notifications table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('timesheet_ready_for_approval', 'timesheet_approved', 'timesheet_rejected', 'shift_assigned')),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE,
        related_shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Step 5: Create indexes for notifications
    console.log('📋 Creating notification indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
      CREATE INDEX IF NOT EXISTS idx_notifications_timesheet ON notifications(related_timesheet_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_shift ON notifications(related_shift_id);
    `);
    
    // Step 6: Add update trigger for notifications
    console.log('📋 Adding update trigger for notifications...');
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
      DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
      CREATE TRIGGER update_notifications_updated_at 
      BEFORE UPDATE ON notifications 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // Step 7: Verify the schema updates
    console.log('📊 Verifying schema updates...');
    
    // Check shifts status constraint
    const shiftsConstraint = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'shifts'::regclass 
      AND contype = 'c' 
      AND conname LIKE '%status%'
    `);
    
    console.log('✅ Shifts status constraint:');
    console.table(shiftsConstraint.rows);
    
    // Check timesheets status constraint
    const timesheetsConstraint = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'timesheets'::regclass 
      AND contype = 'c' 
      AND conname LIKE '%status%'
    `);
    
    console.log('✅ Timesheets status constraint:');
    console.table(timesheetsConstraint.rows);
    
    // Check timesheets columns
    const timesheetsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'timesheets'
      AND column_name IN ('pdf_file_path', 'pdf_generated_at')
      ORDER BY column_name
    `);
    
    console.log('✅ New timesheets columns:');
    console.table(timesheetsColumns.rows);
    
    // Check notifications table
    const notificationsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
      )
    `);
    
    console.log('✅ Notifications table exists:', notificationsExists.rows[0].exists);
    
    console.log('🎉 Database schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
  } finally {
    await pool.end();
  }
}

updateTimesheetApprovalSchema();
