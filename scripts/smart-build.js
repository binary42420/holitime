#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🤖 Smart Build: Detecting environment...');

// Check if we're in a Capacitor/Appflow build environment
const isCapacitorBuild =
  process.env.IONIC_CLI_VERSION ||
  process.env.PLATFORM_NAME ||
  process.env.PROJECT_WEB_DIR === 'out' ||
  process.env.CAP_IOS_PATH ||
  process.env.CAP_ANDROID_PATH;

console.log(`📱 Capacitor/Appflow environment detected: ${isCapacitorBuild}`);
console.log(`🔍 Environment variables:`);
console.log(`  - IONIC_CLI_VERSION: ${process.env.IONIC_CLI_VERSION}`);
console.log(`  - PLATFORM_NAME: ${process.env.PLATFORM_NAME}`);
console.log(`  - PROJECT_WEB_DIR: ${process.env.PROJECT_WEB_DIR}`);

if (isCapacitorBuild) {
  console.log('🚀 Running Capacitor-optimized build (excludes API routes)...');

  // Use the existing capacitor build script that handles API route exclusion
  try {
    execSync('node scripts/build-capacitor.js', { stdio: 'inherit' });
    console.log('✅ Capacitor build completed successfully!');
  } catch (error) {
    console.error('❌ Capacitor build failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('🌐 Running standard Next.js build...');

  // For local development or web deployment, use a different config
  const originalConfig = path.join(process.cwd(), 'next.config.ts');
  const webConfig = path.join(process.cwd(), 'next.config.web.ts');
  const backupConfig = path.join(process.cwd(), 'next.config.ts.backup');

  try {
    // Create web-specific config if it doesn't exist
    if (!fs.existsSync(webConfig)) {
      const webConfigContent = `import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;`;
      fs.writeFileSync(webConfig, webConfigContent);
    }

    // Backup current config and use web config
    fs.copyFileSync(originalConfig, backupConfig);
    fs.copyFileSync(webConfig, originalConfig);

    // Run standard build
    execSync('next build', { stdio: 'inherit' });

    console.log('✅ Web build completed successfully!');
  } catch (error) {
    console.error('❌ Web build failed:', error.message);
    process.exit(1);
  } finally {
    // Restore original config
    if (fs.existsSync(backupConfig)) {
      fs.copyFileSync(backupConfig, originalConfig);
      fs.unlinkSync(backupConfig);
    }
  }
}
