const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

console.log('🔗 Connecting to database:', process.env.DATABASE_URL ? 'URL configured' : 'No URL found');

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing document management database schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'db-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Database schema initialized successfully!');
    console.log('📋 Created tables:');
    console.log('   - document_categories');
    console.log('   - document_templates');
    console.log('   - document_assignments');
    console.log('   - document_submissions');
    console.log('   - document_approvals');
    console.log('   - document_audit_trail');
    console.log('   - document_reminders');
    console.log('   - email_templates (enhanced)');
    console.log('🎯 Document management system is ready!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
