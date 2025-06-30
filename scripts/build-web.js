#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌐 Building Web Application...');

// Backup current config and use web config
const originalConfig = path.join(process.cwd(), 'next.config.ts');
const webConfig = path.join(process.cwd(), 'next.config.web.ts');
const backupConfig = path.join(process.cwd(), 'next.config.ts.backup');

try {
  // Backup current config
  fs.copyFileSync(originalConfig, backupConfig);
  console.log('📦 Backed up current configuration');
  
  // Use web config
  fs.copyFileSync(webConfig, originalConfig);
  console.log('🔧 Using web-specific configuration');
  
  // Clean previous builds
  if (fs.existsSync('.next')) {
    console.log('🧹 Cleaning previous builds...');
    execSync('rmdir /s /q .next', { stdio: 'inherit' });
  }
  
  // Build web application
  console.log('🏗️  Building web application...');
  execSync('next build', { stdio: 'inherit' });
  
  console.log('✅ Web application build completed successfully!');
  console.log('🌐 Web app includes all API routes and full functionality');
  console.log('📁 Build output is in the ".next" directory');
  console.log('');
  console.log('Deployment options:');
  console.log('  1. Deploy to Vercel: vercel --prod');
  console.log('  2. Deploy to Google Cloud Run: npm run deploy:cloud-run');
  console.log('  3. Start production server: npm start');
  
} catch (error) {
  console.error('❌ Web build failed:', error.message);
  process.exit(1);
} finally {
  // Restore original config
  if (fs.existsSync(backupConfig)) {
    fs.copyFileSync(backupConfig, originalConfig);
    fs.unlinkSync(backupConfig);
    console.log('🔄 Restored original configuration');
  }
}
