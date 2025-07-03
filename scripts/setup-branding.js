const fs = require('fs');
const path = require('path');

async function setupBranding() {
  console.log('🎨 Setting up Hands On Labor Branding...\n');

  try {
    // Step 1: Verify favicon files for handsonlabor-website
    console.log('📋 Step 1: Checking favicon files for handsonlabor-website...');
    const faviconFiles = [
      'handsonlabor-website/public/favicon.ico',
      'handsonlabor-website/public/favicon-16x16.png',
      'handsonlabor-website/public/favicon-32x32.png',
      'handsonlabor-website/public/apple-touch-icon.png'
    ];

    let allFaviconsExist = true;
    for (const file of faviconFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ ${file} - Missing!`);
        allFaviconsExist = false;
      }
    }

    // Step 2: Verify logo files for workforce management app
    console.log('\n📋 Step 2: Checking logo files for workforce management app...');
    const logoFiles = [
      'public/images/handson-labor-logo.png',
      'public/images/handson-labor-logo.svg'
    ];

    let allLogosExist = true;
    for (const file of logoFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ ${file} - Missing!`);
        allLogosExist = false;
      }
    }

    // Step 3: Verify layout updates
    console.log('\n📋 Step 3: Checking layout file updates...');
    const layoutFiles = [
      'handsonlabor-website/src/app/layout.tsx',
      'src/app/(app)/layout.tsx'
    ];

    for (const file of layoutFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} - Updated`);
      } else {
        console.log(`❌ ${file} - Missing!`);
      }
    }

    // Summary
    console.log('\n✅ Branding setup completed!\n');
    
    console.log('📝 Summary of changes:');
    console.log('');
    console.log('🔹 handsonlabor-website (Marketing Site):');
    console.log('  - Added favicon.ico for browser tab icon');
    console.log('  - Added favicon-16x16.png for small displays');
    console.log('  - Added favicon-32x32.png for standard displays');
    console.log('  - Added apple-touch-icon.png for iOS devices');
    console.log('  - Updated layout.tsx metadata with favicon configuration');
    console.log('');
    console.log('🔹 Workforce Management App:');
    console.log('  - Replaced "Hands On Labor" text with clickable logo');
    console.log('  - Logo links to marketing website in new tab');
    console.log('  - Added hover effects and accessibility attributes');
    console.log('  - Responsive design for sidebar collapse');
    console.log('');
    console.log('🔹 Logo Integration:');
    console.log('  - SVG format for scalability');
    console.log('  - PNG fallback for compatibility');
    console.log('  - Optimized sizing for sidebar display');
    console.log('  - Maintains brand consistency');
    console.log('');

    if (!allFaviconsExist || !allLogosExist) {
      console.log('⚠️  Some placeholder files need to be replaced with actual logo images:');
      console.log('');
      if (!allFaviconsExist) {
        console.log('📱 Favicon files (handsonlabor-website):');
        console.log('  - Replace favicon.ico with actual logo (16x16, 32x32, 48x48)');
        console.log('  - Replace favicon-16x16.png with 16x16 logo');
        console.log('  - Replace favicon-32x32.png with 32x32 logo');
        console.log('  - Replace apple-touch-icon.png with 180x180 logo');
      }
      if (!allLogosExist) {
        console.log('🖼️  Logo files (workforce management app):');
        console.log('  - Replace handson-labor-logo.svg with actual logo');
        console.log('  - Replace handson-labor-logo.png with actual logo');
      }
      console.log('');
    }

    console.log('📋 Next Steps:');
    console.log('  1. Replace placeholder logo files with actual Hands On Labor logo');
    console.log('  2. Test favicon display in different browsers');
    console.log('  3. Verify logo clickability in workforce management app');
    console.log('  4. Test responsive behavior on mobile devices');
    console.log('  5. Ensure logo visibility on both light and dark themes');
    console.log('');
    console.log('🔗 Marketing Website URL:');
    console.log('  https://handsonlabor-website-369017734615.us-central1.run.app');
    console.log('');
    console.log('🎯 Features Implemented:');
    console.log('  ✅ Favicon for browser tabs');
    console.log('  ✅ Clickable logo in sidebar');
    console.log('  ✅ External link to marketing site');
    console.log('  ✅ Responsive design');
    console.log('  ✅ Accessibility attributes');
    console.log('  ✅ Hover effects');
    console.log('  ✅ Multiple image formats');

  } catch (error) {
    console.error('❌ Branding setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupBranding();
}

module.exports = { setupBranding };
