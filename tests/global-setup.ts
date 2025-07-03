import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Workforce Management Platform E2E Test Setup...');

  // Create test directories
  const testDirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/artifacts',
    'test-results/html-report'
  ];

  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Check if the development server is running
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    console.log('✅ Development server is running');
  } catch (error) {
    console.log('⚠️  Development server not responding, attempting to start...');
    
    try {
      // Try to start the development server
      execSync('npm run dev &', { stdio: 'inherit' });
      
      // Wait for server to start
      let retries = 30;
      while (retries > 0) {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const response = await fetch('http://localhost:3000/api/health');
          if (response.ok) {
            console.log('✅ Development server started successfully');
            break;
          }
        } catch (e) {
          retries--;
          if (retries === 0) {
            throw new Error('Failed to start development server');
          }
        }
      }
    } catch (startError) {
      console.error('❌ Failed to start development server:', startError);
      process.exit(1);
    }
  }

  // Setup test database
  try {
    console.log('🗄️  Setting up test database...');
    
    // Run database migrations
    execSync('npm run db:migrate', { stdio: 'inherit' });
    
    // Seed test data
    execSync('npm run db:seed:test', { stdio: 'inherit' });
    
    console.log('✅ Test database setup complete');
  } catch (dbError) {
    console.log('⚠️  Database setup failed, continuing with existing data...');
  }

  // Create test users if they don't exist
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('👥 Setting up test users...');
    
    const testUsers = [
      {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'Manager/Admin'
      },
      {
        name: 'Test Crew Chief',
        email: 'crew@test.com',
        password: 'crew123',
        role: 'Crew Chief'
      },
      {
        name: 'Test Employee',
        email: 'employee@test.com',
        password: 'emp123',
        role: 'Employee'
      },
      {
        name: 'Test Client',
        email: 'client@test.com',
        password: 'client123',
        role: 'Client',
        companyName: 'Test Company'
      }
    ];

    for (const user of testUsers) {
      try {
        const response = await page.request.post('http://localhost:3000/api/users', {
          data: user
        });
        
        if (response.ok()) {
          console.log(`✅ Created test user: ${user.email}`);
        } else if (response.status() === 409) {
          console.log(`ℹ️  Test user already exists: ${user.email}`);
        } else {
          console.log(`⚠️  Failed to create test user: ${user.email}`);
        }
      } catch (error) {
        console.log(`⚠️  Error creating test user ${user.email}:`, error.message);
      }
    }

    console.log('✅ Test user setup complete');
  } catch (error) {
    console.log('⚠️  Test user setup failed:', error.message);
  } finally {
    await browser.close();
  }

  // Create test clients and jobs
  try {
    console.log('🏢 Setting up test clients and jobs...');
    
    const testClients = [
      {
        companyName: 'Test Construction Co',
        contactPerson: 'John Doe',
        contactEmail: 'john@testconstruction.com',
        contactPhone: '555-0101',
        address: '123 Test Street, Test City, TC 12345'
      },
      {
        companyName: 'Event Management Inc',
        contactPerson: 'Jane Smith',
        contactEmail: 'jane@eventmgmt.com',
        contactPhone: '555-0102',
        address: '456 Event Ave, Test City, TC 12346'
      }
    ];

    const browser2 = await chromium.launch();
    const context2 = await browser2.newContext();
    const page2 = await context2.newPage();

    for (const client of testClients) {
      try {
        const response = await page2.request.post('http://localhost:3000/api/clients', {
          data: client
        });
        
        if (response.ok()) {
          console.log(`✅ Created test client: ${client.companyName}`);
        } else if (response.status() === 409) {
          console.log(`ℹ️  Test client already exists: ${client.companyName}`);
        }
      } catch (error) {
        console.log(`⚠️  Error creating test client ${client.companyName}:`, error.message);
      }
    }

    await browser2.close();
    console.log('✅ Test client setup complete');
  } catch (error) {
    console.log('⚠️  Test client setup failed:', error.message);
  }

  // Generate test report header
  const reportHeader = {
    testSuite: 'Workforce Management Platform E2E Tests',
    startTime: new Date().toISOString(),
    environment: {
      baseURL: config.use?.baseURL || 'http://localhost:3000',
      browser: 'Multiple (Chrome, Firefox, Safari, Edge)',
      viewport: 'Multiple (Desktop, Mobile)',
      node: process.version,
      platform: process.platform
    },
    testConfiguration: {
      timeout: config.timeout,
      retries: config.retries,
      workers: config.workers,
      fullyParallel: config.fullyParallel
    }
  };

  fs.writeFileSync(
    'test-results/test-setup.json',
    JSON.stringify(reportHeader, null, 2)
  );

  console.log('🎯 Test setup complete! Ready to run comprehensive E2E tests.');
  console.log('📊 Test results will be available in: test-results/');
  console.log('🎥 Videos and screenshots will be captured on failures.');
  console.log('📈 HTML report will be generated at: test-results/html-report/');
}

export default globalSetup;
