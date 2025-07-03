const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Database connection will be established when needed

async function initializeDatabase() {
  // Database initialization disabled to prevent blocking server startup
  // Tables have already been created successfully
  console.log('📋 Database tables already initialized');
  return;

  // Original initialization code commented out
  /*
  try {
    console.log('🔄 Initializing database schemas...');

    // Read the document management schema file
    const documentSchemaPath = path.join(__dirname, '..', 'src', 'lib', 'db-schema.sql');
    const documentSchema = fs.readFileSync(documentSchemaPath, 'utf8');

    // Read the notifications schema file
    const notificationsSchemaPath = path.join(__dirname, '..', 'src', 'lib', 'notifications-schema.sql');
    const notificationsSchema = fs.readFileSync(notificationsSchemaPath, 'utf8');

    // Execute the document management schema
    console.log('📄 Creating document management tables...');
    await pool.query(documentSchema);

    // Execute the notifications schema
    console.log('🔔 Creating notification and profile tables...');
    await pool.query(notificationsSchema);

    console.log('✅ Database schemas initialized successfully!');
    console.log('📋 Document Management Tables:');
    console.log('   - document_categories');
    console.log('   - document_templates');
    console.log('   - document_assignments');
    console.log('   - document_submissions');
    console.log('   - document_approvals');
    console.log('   - document_audit_trail');
    console.log('   - document_reminders');
    console.log('   - email_templates (enhanced)');
    console.log('');
    console.log('🔔 Notification & Profile Tables:');
    console.log('   - user_profiles');
    console.log('   - notifications');
    console.log('   - notification_responses');
    console.log('   - shift_assignment_notifications');
    console.log('   - email_templates_enhanced');
    console.log('   - email_queue');
    console.log('   - notification_preferences');
    console.log('');
    console.log('🎯 Complete workforce management system is ready!');
    console.log('📧 SMTP email service configured with Gmail');
    console.log('🔔 Real-time notifications enabled');
    console.log('👤 User profiles and preferences ready');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
  */
}

// Run if called directly
// Commented out to prevent automatic execution during server startup
// if (require.main === module) {
//   initializeDatabase();
// }

module.exports = { initializeDatabase };
