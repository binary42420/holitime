const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Running timesheet export templates migration...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '007_timesheet_export_templates.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('timesheet_export_templates', 'template_field_mappings', 'timesheet_export_history')
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Check if default template was created
    const defaultTemplateResult = await pool.query(`
      SELECT name, field_count 
      FROM timesheet_export_templates t
      LEFT JOIN (
        SELECT template_id, COUNT(*) as field_count 
        FROM template_field_mappings 
        GROUP BY template_id
      ) fm ON t.id = fm.template_id
      WHERE t.is_default = true
    `);
    
    if (defaultTemplateResult.rows.length > 0) {
      const template = defaultTemplateResult.rows[0];
      console.log(`📋 Default template created: "${template.name}" with ${template.field_count || 0} fields`);
    }
    
    console.log('\n🎉 Timesheet export templates system is ready!');
    console.log('📝 Next steps:');
    console.log('  1. Access /admin/export-templates to manage templates');
    console.log('  2. Use "Export to Sheets" button on finalized timesheets');
    console.log('  3. Configure Google Service Account credentials if needed');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Load environment variables
require('dotenv').config();

runMigration();
