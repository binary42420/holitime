const { runMigration } = require('./run-migration-009');
const { setCompanyLogos } = require('./set-company-logos');

async function setupLogosAndOsha() {
  console.log('🚀 Setting up logos and OSHA compliance features...\n');

  try {
    // Step 1: Run OSHA migration
    console.log('📋 Step 1: Adding OSHA compliant trait to database...');
    await runMigration();
    console.log('');

    // Step 2: Set company logos
    console.log('📋 Step 2: Setting up company logos...');
    await setCompanyLogos();
    console.log('');

    // Step 3: Summary
    console.log('✅ Setup completed successfully!\n');
    
    console.log('📝 Summary of changes:');
    console.log('');
    console.log('🔹 OSHA Compliance Feature:');
    console.log('  - Added osha_compliant column to users table');
    console.log('  - Updated user APIs to include OSHA compliant field');
    console.log('  - Added OSHA indicator to users table and employee pages');
    console.log('  - Created OSHA compliant SVG icon at /public/images/osha-compliant.svg');
    console.log('');
    console.log('🔹 Company Logos:');
    console.log('  - Created /public/logos/ directory for company logos');
    console.log('  - Set up Maktive logo: /logos/maktive-logo.png');
    console.log('  - Set up Show Imaging logo: /logos/show-imaging-logo.png');
    console.log('  - Updated database to reference these logo paths');
    console.log('');
    console.log('🔹 Hands On Labor Website Logo:');
    console.log('  - Updated Header.tsx to use /images/handson-labor-logo.png');
    console.log('  - Updated Footer.tsx to use /images/handson-labor-logo.png');
    console.log('  - Created placeholder at /handsonlabor-website/public/images/handson-labor-logo.png');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Replace placeholder logo files with actual images:');
    console.log('     - /handsonlabor-website/public/images/handson-labor-logo.png');
    console.log('     - /public/logos/maktive-logo.png');
    console.log('     - /public/logos/show-imaging-logo.png');
    console.log('  2. Restart the application to see the changes');
    console.log('  3. Update employee OSHA compliance status in the admin panel');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupLogosAndOsha();
}

module.exports = { setupLogosAndOsha };
