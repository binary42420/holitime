#!/usr/bin/env node

/**
 * Migration script to add existing crew chiefs to assigned_personnel table
 * This ensures all crew chiefs are properly tracked in the assigned_personnel table
 * for consistent clock in/out functionality
 */

const { Pool } = require('pg');

// Database configuration
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require',
  ssl: false
});

async function migrateCrewChiefs() {
  try {
    console.log('🚀 Starting crew chief migration...');

    // Find all shifts with crew chiefs that are not in assigned_personnel
    const shiftsWithCrewChiefs = await pool.query(`
      SELECT 
        s.id as shift_id,
        s.crew_chief_id,
        u.name as crew_chief_name
      FROM shifts s
      JOIN users u ON s.crew_chief_id = u.id
      WHERE s.crew_chief_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM assigned_personnel ap 
        WHERE ap.shift_id = s.id 
        AND ap.employee_id = s.crew_chief_id 
        AND ap.role_code = 'CC'
      )
    `);

    console.log(`📊 Found ${shiftsWithCrewChiefs.rows.length} shifts with crew chiefs to migrate`);

    if (shiftsWithCrewChiefs.rows.length === 0) {
      console.log('✅ No crew chiefs need migration');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    // Add each crew chief to assigned_personnel
    for (const shift of shiftsWithCrewChiefs.rows) {
      try {
        await pool.query(`
          INSERT INTO assigned_personnel (shift_id, employee_id, role_on_shift, role_code, status)
          VALUES ($1, $2, 'Crew Chief', 'CC', 'Clocked Out')
          ON CONFLICT (shift_id, employee_id) DO NOTHING
        `, [shift.shift_id, shift.crew_chief_id]);

        migratedCount++;
        console.log(`✅ Added crew chief ${shift.crew_chief_name} to shift ${shift.shift_id}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error adding crew chief ${shift.crew_chief_name} to shift ${shift.shift_id}:`, error.message);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${shiftsWithCrewChiefs.rows.length}`);

    // Verify the migration
    const verificationResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM shifts s
      WHERE s.crew_chief_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM assigned_personnel ap 
        WHERE ap.shift_id = s.id 
        AND ap.employee_id = s.crew_chief_id 
        AND ap.role_code = 'CC'
      )
    `);

    console.log(`\n🔍 Verification: ${verificationResult.rows[0].count} shifts now have crew chiefs in assigned_personnel`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateCrewChiefs();
    console.log('\n🎉 Crew chief migration completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { migrateCrewChiefs };
