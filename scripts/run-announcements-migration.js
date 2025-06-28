const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runAnnouncementsMigration() {
  try {
    console.log('🔍 Running announcements migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '005_add_announcements.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Announcements migration completed successfully');

    // Verify the table was created
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Announcements table verified');
      
      // Check how many announcements exist
      const countResult = await pool.query('SELECT COUNT(*) FROM announcements');
      console.log(`📊 Found ${countResult.rows[0].count} announcements`);
    } else {
      console.log('❌ Announcements table not found');
    }

  } catch (error) {
    console.error('❌ Error running announcements migration:', error);
  } finally {
    await pool.end();
  }
}

runAnnouncementsMigration();
