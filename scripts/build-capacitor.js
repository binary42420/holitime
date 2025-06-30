#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building Mobile-Only Frontend for Capacitor...');

// File paths
const originalConfig = path.join(process.cwd(), 'next.config.ts');
const capacitorConfig = path.join(process.cwd(), 'next.config.capacitor.ts');
const backupConfig = path.join(process.cwd(), 'next.config.ts.backup');
const originalEnv = path.join(process.cwd(), '.env.local');
const mobileEnv = path.join(process.cwd(), '.env.mobile');
const backupEnv = path.join(process.cwd(), '.env.local.backup');

try {
  // 1. Backup original files
  console.log('📦 Backing up original configuration files...');
  if (fs.existsSync(originalConfig)) {
    fs.copyFileSync(originalConfig, backupConfig);
  }
  if (fs.existsSync(originalEnv)) {
    fs.copyFileSync(originalEnv, backupEnv);
  }

  // 2. Use mobile-specific configurations
  console.log('🔧 Using mobile-specific configurations...');
  fs.copyFileSync(capacitorConfig, originalConfig);
  if (fs.existsSync(mobileEnv)) {
    fs.copyFileSync(mobileEnv, originalEnv);
  }

  // 3. Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  const cleanDirs = ['.next', 'out'];
  cleanDirs.forEach(dir => {
    try {
      if (process.platform === 'win32') {
        execSync(`if exist "${dir}" rmdir /s /q "${dir}"`, { stdio: 'pipe' });
      } else {
        execSync(`rm -rf "${dir}"`, { stdio: 'pipe' });
      }
    } catch (e) {
      // Ignore if directory doesn't exist
    }
  });

  // 4. Create a temporary API routes directory to exclude them
  console.log('🚫 Temporarily removing API routes for static export...');
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const tempDir = path.join(process.cwd(), 'temp_api_backup');

  if (fs.existsSync(apiDir)) {
    // Move to a location outside the src directory
    fs.renameSync(apiDir, tempDir);
  }

  // 5. Build with Next.js
  console.log('🏗️  Building mobile-only frontend...');
  execSync('next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      CAPACITOR_BUILD: 'true',
      NEXT_PUBLIC_API_URL: 'https://holitime-369017734615.us-central1.run.app',
      NEXT_PUBLIC_IS_MOBILE: 'true'
    }
  });

  // 6. Restore API routes
  if (fs.existsSync(tempDir)) {
    fs.renameSync(tempDir, apiDir);
  }

  console.log('✅ Mobile frontend build completed successfully!');
  console.log('📱 Static files are in the "out" directory');
  console.log('🌐 Mobile app will connect to: https://holitime-369017734615.us-central1.run.app');
  console.log('');
  console.log('Next steps:');
  console.log('  npx cap sync');
  console.log('  npx cap run android');
  console.log('  npx cap run ios');

} catch (error) {
  console.error('❌ Build failed:', error.message);

  // Restore API routes if they were moved
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const tempDir = path.join(process.cwd(), 'temp_api_backup');
  if (fs.existsSync(tempDir)) {
    fs.renameSync(tempDir, apiDir);
  }

  process.exit(1);
} finally {
  // Always restore original files
  console.log('🔄 Restoring original configuration files...');

  if (fs.existsSync(backupConfig)) {
    fs.copyFileSync(backupConfig, originalConfig);
    fs.unlinkSync(backupConfig);
  }

  if (fs.existsSync(backupEnv)) {
    fs.copyFileSync(backupEnv, originalEnv);
    fs.unlinkSync(backupEnv);
  }
}
