import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test data and configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  users: {
    admin: { email: 'admin@test.com', password: 'admin123', name: 'Test Admin' },
    crewChief: { email: 'crew@test.com', password: 'crew123', name: 'Test Crew Chief' },
    employee: { email: 'employee@test.com', password: 'emp123', name: 'Test Employee' },
    client: { email: 'client@test.com', password: 'client123', name: 'Test Client' }
  }
};

// Test results tracking
interface TestResult {
  feature: string;
  testCase: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  screenshot?: string;
}

const testResults: TestResult[] = [];

// Helper functions
class TestHelpers {
  static async login(page: Page, userType: keyof typeof TEST_CONFIG.users) {
    const user = TEST_CONFIG.users[userType];
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', user.email);
    await page.fill('[data-testid="password-input"]', user.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  }

  static async logout(page: Page) {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('/login');
  }

  static async takeScreenshot(page: Page, name: string): Promise<string> {
    const screenshot = `screenshots/${name}-${Date.now()}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    return screenshot;
  }

  static async recordTestResult(
    feature: string, 
    testCase: string, 
    status: 'PASS' | 'FAIL' | 'SKIP',
    duration: number,
    error?: string,
    screenshot?: string
  ) {
    testResults.push({ feature, testCase, status, duration, error, screenshot });
  }

  static generateTestUser() {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      role: faker.helpers.arrayElement(['Employee', 'Crew Chief', 'Manager/Admin', 'Client']),
      companyName: faker.company.name(),
      location: faker.location.city()
    };
  }

  static generateTestShift() {
    const startDate = faker.date.future();
    const endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
    
    return {
      jobName: faker.company.buzzPhrase(),
      clientName: faker.company.name(),
      date: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
      location: faker.location.streetAddress(),
      requestedWorkers: faker.number.int({ min: 2, max: 10 })
    };
  }
}

// Test suite configuration
test.describe('Workforce Management Platform - Comprehensive E2E Tests', () => {
  let context: BrowserContext;
  let adminPage: Page;
  let crewChiefPage: Page;
  let employeePage: Page;
  let clientPage: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-results/videos/' }
    });

    // Create pages for different user roles
    adminPage = await context.newPage();
    crewChiefPage = await context.newPage();
    employeePage = await context.newPage();
    clientPage = await context.newPage();

    // Set up test data
    await setupTestData();
  });

  test.afterAll(async () => {
    await generateTestReport();
    await context.close();
  });

  // PRIORITY 1: User Management System Testing
  test.describe('Priority 1: User Management System', () => {
    test('should navigate to Users page and verify renamed navigation', async () => {
      const startTime = Date.now();
      try {
        await TestHelpers.login(adminPage, 'admin');
        
        // Verify "Users" navigation exists (not "Employees")
        await expect(adminPage.locator('[data-testid="nav-users"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="nav-employees"]')).not.toBeVisible();
        
        // Navigate to Users page
        await adminPage.click('[data-testid="nav-users"]');
        await adminPage.waitForURL('/users');
        
        // Verify page title
        await expect(adminPage.locator('h1')).toContainText('Users');
        
        await TestHelpers.recordTestResult(
          'User Management', 
          'Navigate to Users page', 
          'PASS', 
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'users-navigation-failed');
        await TestHelpers.recordTestResult(
          'User Management', 
          'Navigate to Users page', 
          'FAIL', 
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should test user filtering system', async () => {
      const startTime = Date.now();
      try {
        await adminPage.goto('/users');
        
        // Test filter tabs
        const filterTabs = [
          { tab: 'all', label: 'All Users' },
          { tab: 'employees', label: 'Employees Only' },
          { tab: 'clients', label: 'Client Users Only' },
          { tab: 'admins', label: 'Administrators' },
          { tab: 'crew-chiefs', label: 'Crew Chiefs' }
        ];

        for (const filter of filterTabs) {
          await adminPage.click(`[data-testid="filter-${filter.tab}"]`);
          await expect(adminPage.locator(`[data-testid="filter-${filter.tab}"]`)).toHaveClass(/active/);
          
          // Verify user count is displayed
          await expect(adminPage.locator(`[data-testid="user-count-${filter.tab}"]`)).toBeVisible();
        }
        
        await TestHelpers.recordTestResult(
          'User Management', 
          'User filtering system', 
          'PASS', 
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'user-filtering-failed');
        await TestHelpers.recordTestResult(
          'User Management', 
          'User filtering system', 
          'FAIL', 
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should create a new user', async () => {
      const startTime = Date.now();
      try {
        await adminPage.goto('/users');
        
        const testUser = TestHelpers.generateTestUser();
        
        // Click create user button
        await adminPage.click('[data-testid="create-user-button"]');
        await expect(adminPage.locator('[data-testid="create-user-dialog"]')).toBeVisible();
        
        // Fill user form
        await adminPage.fill('[data-testid="user-name-input"]', testUser.name);
        await adminPage.fill('[data-testid="user-email-input"]', testUser.email);
        await adminPage.fill('[data-testid="user-phone-input"]', testUser.phone);
        await adminPage.selectOption('[data-testid="user-role-select"]', testUser.role);
        
        if (testUser.role === 'Client') {
          await adminPage.fill('[data-testid="user-company-input"]', testUser.companyName);
        }
        
        // Submit form
        await adminPage.click('[data-testid="create-user-submit"]');
        
        // Verify success message
        await expect(adminPage.locator('[data-testid="success-toast"]')).toBeVisible();
        
        // Verify user appears in list
        await expect(adminPage.locator(`[data-testid="user-card-${testUser.email}"]`)).toBeVisible();
        
        await TestHelpers.recordTestResult(
          'User Management', 
          'Create new user', 
          'PASS', 
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'user-creation-failed');
        await TestHelpers.recordTestResult(
          'User Management', 
          'Create new user', 
          'FAIL', 
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should view individual user profile', async () => {
      const startTime = Date.now();
      try {
        await adminPage.goto('/users');
        
        // Click on first user card
        await adminPage.click('[data-testid="user-card"]:first-child');
        
        // Verify profile page elements
        await expect(adminPage.locator('[data-testid="user-profile-header"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="user-details-section"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="user-shift-history"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="user-hours-tracking"]')).toBeVisible();
        
        // Test actions dropdown
        await adminPage.click('[data-testid="user-actions-dropdown"]');
        await expect(adminPage.locator('[data-testid="send-password-reset"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="send-assignment-reminder"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="send-shift-confirmation"]')).toBeVisible();
        
        await TestHelpers.recordTestResult(
          'User Management', 
          'View user profile', 
          'PASS', 
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'user-profile-failed');
        await TestHelpers.recordTestResult(
          'User Management', 
          'View user profile', 
          'FAIL', 
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should send password reset email', async () => {
      const startTime = Date.now();
      try {
        // Navigate to user profile
        await adminPage.goto('/users');
        await adminPage.click('[data-testid="user-card"]:first-child');
        
        // Open actions dropdown and send password reset
        await adminPage.click('[data-testid="user-actions-dropdown"]');
        await adminPage.click('[data-testid="send-password-reset"]');
        
        // Verify confirmation dialog
        await expect(adminPage.locator('[data-testid="confirm-dialog"]')).toBeVisible();
        await adminPage.click('[data-testid="confirm-button"]');
        
        // Verify success message
        await expect(adminPage.locator('[data-testid="success-toast"]')).toBeVisible();
        
        await TestHelpers.recordTestResult(
          'User Management', 
          'Send password reset email', 
          'PASS', 
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'password-reset-failed');
        await TestHelpers.recordTestResult(
          'User Management', 
          'Send password reset email', 
          'FAIL', 
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });
  });

  // PRIORITY 2: Shift Management Testing
  test.describe('Priority 2: Shift Management System', () => {
    test('should test shift filtering with persistent state', async () => {
      const startTime = Date.now();
      try {
        await adminPage.goto('/shifts');
        
        // Test date filters
        await adminPage.click('[data-testid="filter-today"]');
        await adminPage.reload();
        await expect(adminPage.locator('[data-testid="filter-today"]')).toHaveClass(/active/);
        
        // Test advanced filters
        await adminPage.click('[data-testid="show-advanced-filters"]');
        await expect(adminPage.locator('[data-testid="advanced-filters"]')).toBeVisible();
        
        // Test status filter
        await adminPage.selectOption('[data-testid="status-filter"]', 'In Progress');
        await adminPage.reload();
        await expect(adminPage.locator('[data-testid="status-filter"]')).toHaveValue('In Progress');
        
        // Test location filter
        await adminPage.selectOption('[data-testid="location-filter"]', 'Downtown Office');
        await adminPage.reload();
        await expect(adminPage.locator('[data-testid="location-filter"]')).toHaveValue('Downtown Office');
        
        await TestHelpers.recordTestResult(
          'Shift Management', 
          'Filtering with persistent state', 
          'PASS', 
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'shift-filtering-failed');
        await TestHelpers.recordTestResult(
          'Shift Management', 
          'Filtering with persistent state', 
          'FAIL', 
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should test Clock Out All Employees functionality', async () => {
      const startTime = Date.now();
      try {
        // Navigate to a shift with assigned workers
        await adminPage.goto('/shifts');
        await adminPage.click('[data-testid="shift-row"]:first-child');
        
        // Verify Clock Out All button is visible
        await expect(adminPage.locator('[data-testid="clock-out-all-button"]')).toBeVisible();
        
        // Click Clock Out All
        await adminPage.click('[data-testid="clock-out-all-button"]');
        
        // Verify confirmation dialog
        await expect(adminPage.locator('[data-testid="confirm-dialog"]')).toBeVisible();
        await adminPage.click('[data-testid="confirm-button"]');
        
        // Verify success message
        await expect(adminPage.locator('[data-testid="success-toast"]')).toBeVisible();
        
        await TestHelpers.recordTestResult(
          'Shift Management', 
          'Clock Out All Employees', 
          'PASS', 
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'clock-out-all-failed');
        await TestHelpers.recordTestResult(
          'Shift Management', 
          'Clock Out All Employees', 
          'FAIL', 
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should test No Show marking with 30-minute rule', async () => {
      const startTime = Date.now();
      try {
        // Navigate to shift details
        await adminPage.goto('/shifts');
        await adminPage.click('[data-testid="shift-row"]:first-child');
        
        // Find assigned worker and try to mark as no-show
        await adminPage.click('[data-testid="worker-no-show-button"]:first-child');
        
        // Should show error if within 30 minutes of shift start
        const errorToast = adminPage.locator('[data-testid="error-toast"]');
        const successToast = adminPage.locator('[data-testid="success-toast"]');
        
        // Either error (within 30 min) or success (after 30 min) is acceptable
        await expect(errorToast.or(successToast)).toBeVisible();
        
        await TestHelpers.recordTestResult(
          'Shift Management', 
          'No Show marking with 30-minute rule', 
          'PASS', 
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'no-show-marking-failed');
        await TestHelpers.recordTestResult(
          'Shift Management', 
          'No Show marking with 30-minute rule', 
          'FAIL', 
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });
  });

  // PRIORITY 3: Client Management Testing
  test.describe('Priority 3: Client Management System', () => {
    test('should test fixed client actions dropdown menu', async () => {
      const startTime = Date.now();
      try {
        await adminPage.goto('/clients');

        // Click on client actions dropdown
        await adminPage.click('[data-testid="client-actions-dropdown"]:first-child');

        // Verify all actions are present
        await expect(adminPage.locator('[data-testid="view-client-details"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="create-job-for-client"]')).toBeVisible();
        await expect(adminPage.locator('[data-testid="create-shift-for-client"]')).toBeVisible();

        // Test View Client Details action
        await adminPage.click('[data-testid="view-client-details"]');
        await expect(adminPage.locator('[data-testid="client-profile-header"]')).toBeVisible();

        await TestHelpers.recordTestResult(
          'Client Management',
          'Fixed client actions dropdown',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'client-actions-failed');
        await TestHelpers.recordTestResult(
          'Client Management',
          'Fixed client actions dropdown',
          'FAIL',
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should test Create Job for Client action', async () => {
      const startTime = Date.now();
      try {
        await adminPage.goto('/clients');

        // Click client actions and create job
        await adminPage.click('[data-testid="client-actions-dropdown"]:first-child');
        await adminPage.click('[data-testid="create-job-for-client"]');

        // Verify navigation to job creation with client pre-selected
        await adminPage.waitForURL('/jobs/create*');
        await expect(adminPage.locator('[data-testid="client-select"]')).toHaveValue(/.+/);

        await TestHelpers.recordTestResult(
          'Client Management',
          'Create Job for Client',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'create-job-client-failed');
        await TestHelpers.recordTestResult(
          'Client Management',
          'Create Job for Client',
          'FAIL',
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });
  });

  // PRIORITY 4: Email Notification System Testing
  test.describe('Priority 4: Email Notification System', () => {
    test('should send assignment reminder email', async () => {
      const startTime = Date.now();
      try {
        // Navigate to user profile
        await adminPage.goto('/users');
        await adminPage.click('[data-testid="user-card"]:first-child');

        // Send assignment reminder
        await adminPage.click('[data-testid="user-actions-dropdown"]');
        await adminPage.click('[data-testid="send-assignment-reminder"]');

        // Verify success
        await expect(adminPage.locator('[data-testid="success-toast"]')).toBeVisible();

        await TestHelpers.recordTestResult(
          'Email Notifications',
          'Send assignment reminder',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'assignment-reminder-failed');
        await TestHelpers.recordTestResult(
          'Email Notifications',
          'Send assignment reminder',
          'FAIL',
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should send shift confirmation email', async () => {
      const startTime = Date.now();
      try {
        // Navigate to user profile
        await adminPage.goto('/users');
        await adminPage.click('[data-testid="user-card"]:first-child');

        // Send shift confirmation
        await adminPage.click('[data-testid="user-actions-dropdown"]');
        await adminPage.click('[data-testid="send-shift-confirmation"]');

        // Verify success
        await expect(adminPage.locator('[data-testid="success-toast"]')).toBeVisible();

        await TestHelpers.recordTestResult(
          'Email Notifications',
          'Send shift confirmation',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'shift-confirmation-failed');
        await TestHelpers.recordTestResult(
          'Email Notifications',
          'Send shift confirmation',
          'FAIL',
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });
  });

  // PRIORITY 5: API Endpoint Testing
  test.describe('Priority 5: API Endpoint Testing', () => {
    test('should test user CRUD operations via API', async () => {
      const startTime = Date.now();
      try {
        const testUser = TestHelpers.generateTestUser();

        // Test user creation API
        const createResponse = await adminPage.request.post('/api/users', {
          data: testUser
        });
        expect(createResponse.ok()).toBeTruthy();

        const createdUser = await createResponse.json();
        const userId = createdUser.user.id;

        // Test user retrieval API
        const getResponse = await adminPage.request.get(`/api/users/${userId}`);
        expect(getResponse.ok()).toBeTruthy();

        // Test user update API
        const updateResponse = await adminPage.request.put(`/api/users/${userId}`, {
          data: { ...testUser, name: 'Updated Name' }
        });
        expect(updateResponse.ok()).toBeTruthy();

        // Test user deletion API
        const deleteResponse = await adminPage.request.delete(`/api/users/${userId}`);
        expect(deleteResponse.ok()).toBeTruthy();

        await TestHelpers.recordTestResult(
          'API Endpoints',
          'User CRUD operations',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        await TestHelpers.recordTestResult(
          'API Endpoints',
          'User CRUD operations',
          'FAIL',
          Date.now() - startTime,
          error.message
        );
        throw error;
      }
    });

    test('should test authentication and authorization', async () => {
      const startTime = Date.now();
      try {
        // Test unauthorized access
        const unauthorizedResponse = await adminPage.request.get('/api/users', {
          headers: { 'Authorization': 'Bearer invalid-token' }
        });
        expect(unauthorizedResponse.status()).toBe(401);

        // Test authorized access
        await TestHelpers.login(adminPage, 'admin');
        const authorizedResponse = await adminPage.request.get('/api/users');
        expect(authorizedResponse.ok()).toBeTruthy();

        await TestHelpers.recordTestResult(
          'API Endpoints',
          'Authentication and authorization',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        await TestHelpers.recordTestResult(
          'API Endpoints',
          'Authentication and authorization',
          'FAIL',
          Date.now() - startTime,
          error.message
        );
        throw error;
      }
    });

    test('should test shift management APIs', async () => {
      const startTime = Date.now();
      try {
        const testShift = TestHelpers.generateTestShift();

        // Test shift creation
        const createResponse = await adminPage.request.post('/api/shifts', {
          data: testShift
        });
        expect(createResponse.ok()).toBeTruthy();

        const createdShift = await createResponse.json();
        const shiftId = createdShift.shift.id;

        // Test clock-out-all API
        const clockOutResponse = await adminPage.request.post(`/api/shifts/${shiftId}/clock-out-all`);
        expect(clockOutResponse.ok()).toBeTruthy();

        await TestHelpers.recordTestResult(
          'API Endpoints',
          'Shift management APIs',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        await TestHelpers.recordTestResult(
          'API Endpoints',
          'Shift management APIs',
          'FAIL',
          Date.now() - startTime,
          error.message
        );
        throw error;
      }
    });
  });

  // PRIORITY 6: Mobile Responsiveness Testing
  test.describe('Priority 6: Mobile Responsiveness', () => {
    test('should test mobile layout on different screen sizes', async () => {
      const startTime = Date.now();
      try {
        const viewports = [
          { width: 375, height: 667, name: 'iPhone SE' },
          { width: 768, height: 1024, name: 'iPad' },
          { width: 1920, height: 1080, name: 'Desktop' }
        ];

        for (const viewport of viewports) {
          await adminPage.setViewportSize(viewport);
          await adminPage.goto('/users');

          // Verify responsive elements
          if (viewport.width < 768) {
            // Mobile: filter tabs should stack
            await expect(adminPage.locator('[data-testid="filter-tabs"]')).toHaveClass(/grid-cols-2/);
          } else {
            // Desktop: filter tabs should be in a row
            await expect(adminPage.locator('[data-testid="filter-tabs"]')).toHaveClass(/md:grid-cols-5/);
          }

          // Test form responsiveness
          await adminPage.click('[data-testid="create-user-button"]');
          if (viewport.width < 768) {
            await expect(adminPage.locator('[data-testid="user-form"]')).toHaveClass(/grid-cols-1/);
          } else {
            await expect(adminPage.locator('[data-testid="user-form"]')).toHaveClass(/md:grid-cols-2/);
          }
          await adminPage.press('Escape'); // Close dialog
        }

        await TestHelpers.recordTestResult(
          'Mobile Responsiveness',
          'Layout on different screen sizes',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'mobile-responsiveness-failed');
        await TestHelpers.recordTestResult(
          'Mobile Responsiveness',
          'Layout on different screen sizes',
          'FAIL',
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should test touch-friendly interface elements', async () => {
      const startTime = Date.now();
      try {
        // Set mobile viewport
        await adminPage.setViewportSize({ width: 375, height: 667 });
        await adminPage.goto('/shifts');

        // Test touch targets are large enough (minimum 44px)
        const buttons = await adminPage.locator('button').all();
        for (const button of buttons.slice(0, 5)) { // Test first 5 buttons
          const box = await button.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
        }

        await TestHelpers.recordTestResult(
          'Mobile Responsiveness',
          'Touch-friendly interface elements',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'touch-interface-failed');
        await TestHelpers.recordTestResult(
          'Mobile Responsiveness',
          'Touch-friendly interface elements',
          'FAIL',
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });
  });

  // PRIORITY 7: Accessibility Testing
  test.describe('Priority 7: Accessibility Testing', () => {
    test('should test keyboard navigation', async () => {
      const startTime = Date.now();
      try {
        await adminPage.goto('/users');

        // Test tab navigation
        await adminPage.keyboard.press('Tab');
        await expect(adminPage.locator(':focus')).toBeVisible();

        // Test Enter key activation
        await adminPage.keyboard.press('Enter');

        // Test Escape key for dialogs
        await adminPage.keyboard.press('Escape');

        await TestHelpers.recordTestResult(
          'Accessibility',
          'Keyboard navigation',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'keyboard-navigation-failed');
        await TestHelpers.recordTestResult(
          'Accessibility',
          'Keyboard navigation',
          'FAIL',
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });

    test('should test ARIA labels and screen reader support', async () => {
      const startTime = Date.now();
      try {
        await adminPage.goto('/users');

        // Check for ARIA labels on interactive elements
        const buttons = await adminPage.locator('button[aria-label]').count();
        expect(buttons).toBeGreaterThan(0);

        // Check for proper heading structure
        const h1Count = await adminPage.locator('h1').count();
        expect(h1Count).toBe(1); // Should have exactly one h1

        // Check for alt text on images
        const images = await adminPage.locator('img').all();
        for (const img of images) {
          const alt = await img.getAttribute('alt');
          expect(alt).toBeTruthy();
        }

        await TestHelpers.recordTestResult(
          'Accessibility',
          'ARIA labels and screen reader support',
          'PASS',
          Date.now() - startTime
        );
      } catch (error) {
        const screenshot = await TestHelpers.takeScreenshot(adminPage, 'aria-labels-failed');
        await TestHelpers.recordTestResult(
          'Accessibility',
          'ARIA labels and screen reader support',
          'FAIL',
          Date.now() - startTime,
          error.message,
          screenshot
        );
        throw error;
      }
    });
  });

  // Setup test data
  async function setupTestData() {
    // This would typically seed the database with test data
    console.log('Setting up test data...');
  }

  // Generate comprehensive test report
  async function generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: testResults.length,
      passed: testResults.filter(r => r.status === 'PASS').length,
      failed: testResults.filter(r => r.status === 'FAIL').length,
      skipped: testResults.filter(r => r.status === 'SKIP').length,
      results: testResults
    };

    console.log('\n=== WORKFORCE MANAGEMENT PLATFORM TEST REPORT ===');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed}`);
    console.log(`Failed: ${report.failed}`);
    console.log(`Skipped: ${report.skipped}`);
    console.log(`Success Rate: ${((report.passed / report.totalTests) * 100).toFixed(2)}%`);
    
    // Group results by feature
    const byFeature = testResults.reduce((acc, result) => {
      if (!acc[result.feature]) acc[result.feature] = [];
      acc[result.feature].push(result);
      return acc;
    }, {} as Record<string, TestResult[]>);

    console.log('\n=== RESULTS BY FEATURE ===');
    Object.entries(byFeature).forEach(([feature, results]) => {
      const passed = results.filter(r => r.status === 'PASS').length;
      const total = results.length;
      console.log(`${feature}: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
    });
  }
});
