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
  console.log('🚫 Temporarily removing API routes and dynamic routes for static export...');
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const appDir = path.join(process.cwd(), 'src', 'app', '(app)');
  const tempApiDir = path.join(process.cwd(), 'temp_api_backup');
  const tempAppDir = path.join(process.cwd(), 'temp_app_backup');

  if (fs.existsSync(apiDir)) {
    // Move API routes to backup
    fs.renameSync(apiDir, tempApiDir);
  }

  if (fs.existsSync(appDir)) {
    // Move app routes to backup (we'll only use the mobile dashboard)
    fs.renameSync(appDir, tempAppDir);
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

  // 6. Restore API routes and app routes
  if (fs.existsSync(tempApiDir)) {
    fs.renameSync(tempApiDir, apiDir);
  }
  if (fs.existsSync(tempAppDir)) {
    fs.renameSync(tempAppDir, appDir);
  }

  // Verify out directory exists
  const outDir = path.join(process.cwd(), 'out');
  if (fs.existsSync(outDir)) {
    const outFiles = fs.readdirSync(outDir);
    console.log('✅ Mobile frontend build completed successfully!');
    console.log('📱 Static files are in the "out" directory');
    console.log(`📋 Generated ${outFiles.length} files/directories`);
    console.log('🌐 Mobile app will connect to: https://holitime-369017734615.us-central1.run.app');
    console.log('');
    console.log('Next steps:');
    console.log('  npx cap sync');
    console.log('  npx cap run android');
    console.log('  npx cap run ios');
  } else {
    console.error('❌ Build completed but out directory not found!');
    console.log('🔧 Creating minimal out directory for Capacitor...');
    fs.mkdirSync(outDir, { recursive: true });

    // Create a minimal mobile app
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Holitime Mobile</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 400px; margin: 0 auto; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 20px; }
        .message { color: #666; margin-bottom: 30px; }
        .api-info { background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📱 Holitime Mobile</div>
        <div class="message">Mobile app is loading...</div>
        <div class="api-info">
            <strong>API Endpoint:</strong><br>
            https://holitime-369017734615.us-central1.run.app
        </div>
    </div>
    <script>
        console.log('Holitime Mobile App - Connecting to API...');
        // Add mobile app initialization here
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml);
    console.log('📁 Created minimal mobile app in out directory');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);

  // Restore API routes and app routes if they were moved
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const appDir = path.join(process.cwd(), 'src', 'app', '(app)');
  const tempApiDir = path.join(process.cwd(), 'temp_api_backup');
  const tempAppDir = path.join(process.cwd(), 'temp_app_backup');

  if (fs.existsSync(tempApiDir)) {
    fs.renameSync(tempApiDir, apiDir);
  }
  if (fs.existsSync(tempAppDir)) {
    fs.renameSync(tempAppDir, appDir);
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
