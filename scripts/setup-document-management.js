const { runMigration } = require('./run-migration-010');
const fs = require('fs');
const path = require('path');

async function setupDocumentManagement() {
  console.log('🚀 Setting up Document Management System...\n');

  try {
    // Step 1: Run database migration
    console.log('📋 Step 1: Running database migration...');
    await runMigration();
    console.log('');

    // Step 2: Create documents directory structure
    console.log('📋 Step 2: Creating document storage directories...');
    const documentsDir = path.join(process.cwd(), 'public', 'documents');
    
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
      console.log('✅ Created /public/documents directory');
    } else {
      console.log('✅ Documents directory already exists');
    }

    // Create .gitkeep file if it doesn't exist
    const gitkeepPath = path.join(documentsDir, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '# This directory stores uploaded documents\n# Files are organized by user ID and document type\n# Structure: /documents/{userId}/{documentId}.{extension}');
      console.log('✅ Created .gitkeep file in documents directory');
    }

    // Step 3: Verify API endpoints
    console.log('📋 Step 3: Verifying API endpoints...');
    const apiEndpoints = [
      'src/app/api/document-types/route.ts',
      'src/app/api/documents/route.ts',
      'src/app/api/documents/upload/route.ts',
      'src/app/api/documents/[id]/review/route.ts'
    ];

    let allEndpointsExist = true;
    for (const endpoint of apiEndpoints) {
      const endpointPath = path.join(process.cwd(), endpoint);
      if (fs.existsSync(endpointPath)) {
        console.log(`✅ ${endpoint}`);
      } else {
        console.log(`❌ ${endpoint} - Missing!`);
        allEndpointsExist = false;
      }
    }

    // Step 4: Verify UI components
    console.log('📋 Step 4: Verifying UI components...');
    const uiComponents = [
      'src/components/ui/camera-capture.tsx',
      'src/components/ui/pdf-viewer.tsx',
      'src/components/ui/document-upload.tsx'
    ];

    let allComponentsExist = true;
    for (const component of uiComponents) {
      const componentPath = path.join(process.cwd(), component);
      if (fs.existsSync(componentPath)) {
        console.log(`✅ ${component}`);
      } else {
        console.log(`❌ ${component} - Missing!`);
        allComponentsExist = false;
      }
    }

    // Step 5: Verify pages
    console.log('📋 Step 5: Verifying pages...');
    const pages = [
      'src/app/(app)/documents/page.tsx',
      'src/app/(app)/admin/documents/page.tsx'
    ];

    let allPagesExist = true;
    for (const page of pages) {
      const pagePath = path.join(process.cwd(), page);
      if (fs.existsSync(pagePath)) {
        console.log(`✅ ${page}`);
      } else {
        console.log(`❌ ${page} - Missing!`);
        allPagesExist = false;
      }
    }

    // Summary
    console.log('\n✅ Document Management System setup completed!\n');
    
    console.log('📝 Summary of features:');
    console.log('');
    console.log('🔹 Document Types:');
    console.log('  - Forklift Certification');
    console.log('  - OSHA Certification');
    console.log('  - Driver\'s License Photo');
    console.log('  - Paper Time Sheet');
    console.log('  - General Document');
    console.log('');
    console.log('🔹 File Upload Features:');
    console.log('  - Local file upload (PDF, JPG, PNG, HEIC)');
    console.log('  - Camera capture with preview');
    console.log('  - File validation (10MB max)');
    console.log('  - Automatic PDF conversion for images');
    console.log('');
    console.log('🔹 Admin Approval Workflow:');
    console.log('  - Document review interface at /admin/documents');
    console.log('  - Approve/reject with notes');
    console.log('  - Automatic certification updates');
    console.log('  - Email notifications (when SMTP configured)');
    console.log('');
    console.log('🔹 PDF Viewer:');
    console.log('  - In-browser PDF viewing');
    console.log('  - Zoom and navigation controls');
    console.log('  - Download and print functionality');
    console.log('  - Mobile responsive design');
    console.log('');
    console.log('🔹 Security Features:');
    console.log('  - User-specific document access');
    console.log('  - Admin-only review capabilities');
    console.log('  - File validation and sanitization');
    console.log('  - Secure file storage');
    console.log('');

    if (!allEndpointsExist || !allComponentsExist || !allPagesExist) {
      console.log('⚠️  Some components are missing. Please check the setup.');
      console.log('');
    }

    console.log('📋 Next Steps:');
    console.log('  1. Restart your development server');
    console.log('  2. Navigate to /documents to upload documents');
    console.log('  3. Use /admin/documents to review submissions (Manager/Admin only)');
    console.log('  4. Configure SMTP settings for email notifications');
    console.log('  5. Test camera capture on mobile devices');
    console.log('');
    console.log('📱 Mobile Features:');
    console.log('  - Camera access for document capture');
    console.log('  - Touch-friendly interface');
    console.log('  - Responsive design for all screen sizes');
    console.log('');
    console.log('🔗 Integration:');
    console.log('  - Automatic OSHA/Forklift certification updates');
    console.log('  - Links to existing user management');
    console.log('  - Notification system integration');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDocumentManagement();
}

module.exports = { setupDocumentManagement };
