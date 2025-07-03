const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addPendingApprovalStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Adding "Pending Approval" status to shifts table...');
    
    // First, check current constraint
    const constraintResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'shifts'::regclass 
      AND contype = 'c' 
      AND conname LIKE '%status%'
    `);
    
    console.log('📊 Current status constraints:');
    console.table(constraintResult.rows);
    
    // Drop the existing status check constraint
    console.log('🔧 Dropping existing status constraint...');
    await pool.query(`
      ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_status_check
    `);
    
    // Add new constraint with "Pending Approval" included
    console.log('✅ Adding new status constraint with "Pending Approval"...');
    await pool.query(`
      ALTER TABLE shifts 
      ADD CONSTRAINT shifts_status_check 
      CHECK (status IN ('Upcoming', 'In Progress', 'Completed', 'Cancelled', 'Pending Approval'))
    `);
    
    console.log('✅ Successfully updated shifts status constraint!');
    
    // Verify the new constraint
    const newConstraintResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'shifts'::regclass 
      AND contype = 'c' 
      AND conname LIKE '%status%'
    `);
    
    console.log('📊 New status constraints:');
    console.table(newConstraintResult.rows);
    
    // Test the constraint by checking current statuses
    const statusesResult = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM shifts 
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('📊 Current shift statuses in database:');
    console.table(statusesResult.rows);
    
  } catch (error) {
    console.error('❌ Error updating status constraint:', error);
  } finally {
    await pool.end();
  }
}

addPendingApprovalStatus();
