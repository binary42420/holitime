const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function ensureWorkerRequirements() {
  try {
    console.log('🔍 Checking worker requirements table...');

    // Check if worker_requirements table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'worker_requirements'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ worker_requirements table does not exist. Creating it...');
      
      // Create the table
      await pool.query(`
        CREATE TABLE worker_requirements (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
          role_code VARCHAR(10) NOT NULL CHECK (role_code IN ('CC', 'SH', 'FO', 'RFO', 'RG', 'GL')),
          required_count INTEGER NOT NULL DEFAULT 0 CHECK (required_count >= 0),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(shift_id, role_code)
        );
      `);

      // Create indexes
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_worker_requirements_shift ON worker_requirements(shift_id);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_worker_requirements_role ON worker_requirements(role_code);`);

      console.log('✅ worker_requirements table created');
    } else {
      console.log('✅ worker_requirements table exists');
    }

    // Check how many shifts exist
    const shiftsCount = await pool.query('SELECT COUNT(*) FROM shifts');
    console.log(`📊 Found ${shiftsCount.rows[0].count} shifts`);

    // Check how many worker requirements exist
    const requirementsCount = await pool.query('SELECT COUNT(*) FROM worker_requirements');
    console.log(`📊 Found ${requirementsCount.rows[0].count} worker requirements`);

    // Get shifts without worker requirements
    const shiftsWithoutRequirements = await pool.query(`
      SELECT s.id, s.requested_workers
      FROM shifts s
      LEFT JOIN worker_requirements wr ON s.id = wr.shift_id
      WHERE wr.shift_id IS NULL
    `);

    if (shiftsWithoutRequirements.rows.length > 0) {
      console.log(`🔧 Found ${shiftsWithoutRequirements.rows.length} shifts without worker requirements. Adding them...`);

      // Add worker requirements for shifts that don't have them
      for (const shift of shiftsWithoutRequirements.rows) {
        const roles = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL'];
        
        for (const roleCode of roles) {
          let requiredCount = 0;
          
          if (roleCode === 'CC') {
            requiredCount = 1; // Always need 1 crew chief
          } else if (roleCode === 'SH') {
            // Stage hands = requested_workers - 1 (for crew chief)
            requiredCount = Math.max(0, (shift.requested_workers || 1) - 1);
          }
          // Other roles default to 0

          await pool.query(`
            INSERT INTO worker_requirements (shift_id, role_code, required_count)
            VALUES ($1, $2, $3)
            ON CONFLICT (shift_id, role_code) DO NOTHING
          `, [shift.id, roleCode, requiredCount]);
        }
      }

      console.log('✅ Worker requirements added for all shifts');
    } else {
      console.log('✅ All shifts already have worker requirements');
    }

    // Show summary
    const finalCount = await pool.query('SELECT COUNT(*) FROM worker_requirements');
    console.log(`📊 Final worker requirements count: ${finalCount.rows[0].count}`);

    // Show breakdown by role
    const breakdown = await pool.query(`
      SELECT role_code, COUNT(*) as count, SUM(required_count) as total_required
      FROM worker_requirements
      GROUP BY role_code
      ORDER BY role_code
    `);

    console.log('\n📊 Worker requirements breakdown:');
    breakdown.rows.forEach(row => {
      console.log(`   ${row.role_code}: ${row.count} shifts, ${row.total_required} total positions`);
    });

  } catch (error) {
    console.error('❌ Error ensuring worker requirements:', error);
  } finally {
    await pool.end();
  }
}

ensureWorkerRequirements();
