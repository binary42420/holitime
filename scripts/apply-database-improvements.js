const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function applyDatabaseImprovements() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Starting database improvements...');

    // Read and execute SQL improvements
    const sqlPath = path.join(__dirname, 'database-improvements.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📋 Found ${statements.length} improvements to apply`);

    // Execute each statement
    for (const statement of statements) {
      try {
        await pool.query(statement);
        console.log('✅ Successfully executed:', statement.substring(0, 50) + '...');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ Already exists:', statement.substring(0, 50) + '...');
        } else {
          console.error('❌ Error executing:', statement.substring(0, 50) + '...');
          console.error('Error details:', error.message);
          // Continue with other statements
        }
      }
    }

    // Verify improvements
    console.log('\n🔍 Verifying improvements...');

    // Check constraints
    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'shifts'::regclass;
    `);
    console.log('\n📋 Shift table constraints:');
    console.table(constraints.rows);

    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'shifts' OR tablename = 'assigned_personnel';
    `);
    console.log('\n📋 Indexes:');
    console.table(indexes.rows);

    // Check triggers
    const triggers = await pool.query(`
      SELECT tgname, pg_get_triggerdef(oid)
      FROM pg_trigger
      WHERE tgrelid IN ('shifts'::regclass, 'assigned_personnel'::regclass);
    `);
    console.log('\n📋 Triggers:');
    console.table(triggers.rows);

    // Check materialized views
    const views = await pool.query(`
      SELECT schemaname, matviewname, matviewowner
      FROM pg_matviews
      WHERE matviewname = 'shift_statistics';
    `);
    console.log('\n📋 Materialized views:');
    console.table(views.rows);

    console.log('\n✨ Database improvements completed successfully!');

  } catch (error) {
    console.error('❌ Error applying database improvements:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  applyDatabaseImprovements().catch(console.error);
}

module.exports = { applyDatabaseImprovements };
