#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Workforce Management Platform E2E Test Runner');
console.log('='.repeat(60));

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  browser: 'chromium',
  headed: false,
  debug: false,
  grep: null,
  project: null,
  workers: null,
  retries: null,
  reporter: 'html',
  updateSnapshots: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--browser':
      options.browser = args[++i];
      break;
    case '--headed':
      options.headed = true;
      break;
    case '--debug':
      options.debug = true;
      break;
    case '--grep':
      options.grep = args[++i];
      break;
    case '--project':
      options.project = args[++i];
      break;
    case '--workers':
      options.workers = args[++i];
      break;
    case '--retries':
      options.retries = args[++i];
      break;
    case '--reporter':
      options.reporter = args[++i];
      break;
    case '--update-snapshots':
      options.updateSnapshots = true;
      break;
    case '--help':
      showHelp();
      process.exit(0);
    default:
      if (arg.startsWith('--')) {
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
      }
  }
}

function showHelp() {
  console.log(`
Usage: node scripts/run-e2e-tests.js [options]

Options:
  --browser <name>        Browser to use (chromium, firefox, webkit, all)
  --headed               Run tests in headed mode (visible browser)
  --debug                Run tests in debug mode
  --grep <pattern>       Only run tests matching pattern
  --project <name>       Run specific project (Mobile Chrome, Desktop Chrome, etc.)
  --workers <number>     Number of parallel workers
  --retries <number>     Number of retries for failed tests
  --reporter <type>      Reporter type (html, json, junit, list)
  --update-snapshots     Update visual snapshots
  --help                 Show this help message

Examples:
  node scripts/run-e2e-tests.js                           # Run all tests
  node scripts/run-e2e-tests.js --browser firefox         # Run on Firefox
  node scripts/run-e2e-tests.js --headed --debug          # Debug mode
  node scripts/run-e2e-tests.js --grep "User Management"  # Run specific tests
  node scripts/run-e2e-tests.js --project "Mobile Chrome" # Mobile testing
`);
}

function buildPlaywrightCommand() {
  let cmd = 'npx playwright test';
  
  if (options.browser && options.browser !== 'all') {
    cmd += ` --project="${options.browser}"`;
  }
  
  if (options.project) {
    cmd += ` --project="${options.project}"`;
  }
  
  if (options.headed) {
    cmd += ' --headed';
  }
  
  if (options.debug) {
    cmd += ' --debug';
  }
  
  if (options.grep) {
    cmd += ` --grep="${options.grep}"`;
  }
  
  if (options.workers) {
    cmd += ` --workers=${options.workers}`;
  }
  
  if (options.retries) {
    cmd += ` --retries=${options.retries}`;
  }
  
  if (options.reporter) {
    cmd += ` --reporter=${options.reporter}`;
  }
  
  if (options.updateSnapshots) {
    cmd += ' --update-snapshots';
  }
  
  return cmd;
}

function ensureDirectories() {
  const dirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/artifacts',
    'test-results/html-report'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if Playwright is installed
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    console.log('✅ Playwright is installed');
  } catch (error) {
    console.error('❌ Playwright is not installed. Run: npm install @playwright/test');
    process.exit(1);
  }
  
  // Check if browsers are installed
  try {
    execSync('npx playwright install --dry-run', { stdio: 'pipe' });
    console.log('✅ Playwright browsers are installed');
  } catch (error) {
    console.log('⚠️  Installing Playwright browsers...');
    try {
      execSync('npx playwright install', { stdio: 'inherit' });
      console.log('✅ Playwright browsers installed');
    } catch (installError) {
      console.error('❌ Failed to install Playwright browsers');
      process.exit(1);
    }
  }
  
  // Check if development server is accessible
  console.log('🌐 Checking development server...');
  // This will be handled by the global setup
}

function runTests() {
  console.log('🧪 Running E2E tests...');
  console.log(`📋 Configuration: ${JSON.stringify(options, null, 2)}`);
  
  const command = buildPlaywrightCommand();
  console.log(`🔧 Command: ${command}`);
  console.log('');
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('\n✅ Tests completed successfully!');
    
    // Show report location
    if (options.reporter === 'html' || !options.reporter) {
      console.log('📊 HTML Report: test-results/html-report/index.html');
      console.log('💡 Run: npx playwright show-report');
    }
    
  } catch (error) {
    console.error('\n❌ Tests failed!');
    console.log('📊 Check reports in: test-results/');
    process.exit(1);
  }
}

function main() {
  try {
    ensureDirectories();
    checkPrerequisites();
    runTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { buildPlaywrightCommand, options };
