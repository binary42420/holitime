const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'holitime',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
  });

  try {
    console.log('🚀 Running Migration 010: Create Document Management System...');

    // Check if migration has already been run
    const migrationCheck = await pool.query(
      'SELECT * FROM migrations WHERE filename = $1',
      ['010_create_document_management_system.sql']
    );

    if (migrationCheck.rows.length > 0) {
      console.log('✅ Migration 010 has already been executed');
      return;
    }

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', '010_create_document_management_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await pool.query(migrationSQL);
    
    // Record migration as completed
    await pool.query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      ['010_create_document_management_system.sql']
    );

    console.log('✅ Migration 010 completed successfully');
    console.log('📝 Created document_types and documents tables');
    console.log('📝 Added predefined document types');
    console.log('📝 Created indexes and views for document management');

    // Verify the tables were created
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('document_types', 'documents')
      ORDER BY table_name
    `);

    console.log('✅ Tables created:');
    console.table(tablesCheck.rows);

    // Show document types
    const documentTypes = await pool.query(`
      SELECT name, description, is_certification, requires_expiration
      FROM document_types
      ORDER BY name
    `);

    console.log('📋 Document types available:');
    console.table(documentTypes.rows);

  } catch (error) {
    console.error('❌ Migration 010 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };
