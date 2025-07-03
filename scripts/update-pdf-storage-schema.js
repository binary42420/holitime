const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function updatePdfStorageSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Updating PDF storage schema to use bytea...');
    
    // Step 1: Remove the old pdf_file_path column if it exists
    console.log('📋 Removing old pdf_file_path column...');
    await pool.query(`
      ALTER TABLE timesheets DROP COLUMN IF EXISTS pdf_file_path
    `);
    
    // Step 2: Add new columns for PDF binary storage
    console.log('📋 Adding PDF binary storage columns...');
    await pool.query(`
      ALTER TABLE timesheets 
      ADD COLUMN IF NOT EXISTS pdf_data BYTEA,
      ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pdf_content_type VARCHAR(100) DEFAULT 'application/pdf'
    `);
    
    // Step 3: Verify the changes
    console.log('📊 Verifying schema changes...');
    
    const timesheetsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'timesheets'
      AND column_name IN ('pdf_data', 'pdf_filename', 'pdf_content_type', 'pdf_generated_at')
      ORDER BY column_name
    `);
    
    console.log('✅ Updated timesheets PDF columns:');
    console.table(timesheetsColumns.rows);
    
    // Step 4: Update the comment
    await pool.query(`
      COMMENT ON COLUMN timesheets.pdf_data IS 'Binary PDF data stored as bytea';
      COMMENT ON COLUMN timesheets.pdf_filename IS 'Original filename for the PDF';
      COMMENT ON COLUMN timesheets.pdf_content_type IS 'MIME type for the PDF file';
    `);
    
    console.log('🎉 PDF storage schema update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating PDF storage schema:', error);
  } finally {
    await pool.end();
  }
}

updatePdfStorageSchema();
