const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyTimesheetMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Applying timesheet approval workflow migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '006_timesheet_approval_workflow.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the changes
    console.log('📊 Verifying migration...');
    
    // Check if notifications table exists
    const notificationsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
      )
    `);
    
    console.log('✅ Notifications table exists:', notificationsExists.rows[0].exists);
    
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
    
    console.log('🎉 Timesheet approval workflow migration completed!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
  } finally {
    await pool.end();
  }
}

applyTimesheetMigration();
