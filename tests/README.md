# Workforce Management Platform - E2E Testing Suite

## Overview

This comprehensive end-to-end testing suite validates all implemented features across the 7 priority areas of the Workforce Management Platform. The tests are built using Playwright and provide systematic validation of the entire application.

## Test Coverage

### Priority 1: User Management System
- ✅ User navigation and filtering system
- ✅ User creation, editing, and deletion
- ✅ Individual user profile pages
- ✅ Password reset functionality
- ✅ Role-based filtering (All Users, Employees, Clients, Admins, Crew Chiefs)

### Priority 2: Shift Management System
- ✅ Shift filtering with persistent state
- ✅ "Clock Out All Employees" bulk operation
- ✅ "No Show" marking with 30-minute rule enforcement
- ✅ Worker assignment display with status badges
- ✅ Advanced filtering (date, status, client, location, crew chief)

### Priority 3: Client Management System
- ✅ Fixed client actions dropdown menu
- ✅ "View Client Details" action
- ✅ "Create Job for Client" action
- ✅ "Create Shift for Client" action
- ✅ Client profile pages

### Priority 4: Email Notification System
- ✅ Password reset email sending
- ✅ Assignment reminder emails
- ✅ Shift confirmation request emails
- ✅ Email template rendering with variable substitution

### Priority 5: API Endpoint Testing
- ✅ User CRUD operations
- ✅ Authentication and authorization
- ✅ Shift management APIs
- ✅ Error handling and HTTP status codes
- ✅ Data persistence validation

### Priority 6: Mobile Responsiveness
- ✅ Responsive layouts on different screen sizes
- ✅ Touch-friendly interface elements
- ✅ Mobile navigation
- ✅ Responsive forms and components

### Priority 7: Accessibility
- ✅ Keyboard navigation
- ✅ ARIA labels and screen reader support
- ✅ Focus management
- ✅ Proper heading structure

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run test:install
```

## Running Tests

### Quick Start
```bash
# Run all tests
npm run test:e2e

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug
```

### Browser-Specific Testing
```bash
# Test on Firefox
npm run test:e2e:firefox

# Test on Safari (WebKit)
npm run test:e2e:webkit

# Test on all browsers
npm run test:e2e:all-browsers
```

### Mobile Testing
```bash
# Test mobile responsiveness
npm run test:e2e:mobile
```

### Feature-Specific Testing
```bash
# Test user management features
npm run test:e2e:user-management

# Test shift management features
npm run test:e2e:shift-management

# Test client management features
npm run test:e2e:client-management

# Test email notifications
npm run test:e2e:email-notifications

# Test API endpoints
npm run test:e2e:api-endpoints

# Test mobile responsiveness
npm run test:e2e:mobile-responsiveness

# Test accessibility
npm run test:e2e:accessibility
```

### Advanced Options
```bash
# Run specific test pattern
node scripts/run-e2e-tests.js --grep "User Management"

# Run with specific number of workers
node scripts/run-e2e-tests.js --workers 2

# Run with retries
node scripts/run-e2e-tests.js --retries 3

# Run specific project
node scripts/run-e2e-tests.js --project "Mobile Chrome"
```

## Test Reports

### Viewing Reports
```bash
# Open HTML report
npm run test:report

# Or manually open
open test-results/html-report/index.html
```

### Report Types Generated
- **HTML Report**: Interactive report with test details, screenshots, and videos
- **JSON Report**: Machine-readable test results
- **JUnit XML**: CI/CD compatible format
- **Markdown Report**: Human-readable summary
- **CI Summary**: Environment variable format for CI/CD

### Report Locations
```
test-results/
├── html-report/           # Interactive HTML report
├── screenshots/           # Failure screenshots
├── videos/               # Test execution videos
├── artifacts/            # Test traces and other artifacts
├── test-results.json     # JSON test results
├── junit.xml            # JUnit XML format
├── comprehensive-report.json  # Detailed report
├── TEST-REPORT.md       # Markdown summary
└── ci-summary.txt       # CI/CD summary
```

## Test Configuration

### Playwright Configuration
The test suite is configured in `playwright.config.ts` with:
- Multiple browser support (Chrome, Firefox, Safari, Edge)
- Mobile device testing
- Automatic screenshot and video capture on failures
- Trace collection for debugging
- Parallel execution with proper synchronization

### Test Data Management
- Automatic test data setup and cleanup
- Isolated test environments
- Realistic test data generation using Faker.js
- Database seeding for consistent test conditions

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

### Jenkins Pipeline Example
```groovy
pipeline {
    agent any
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npm run test:install'
            }
        }
        stage('Test') {
            steps {
                sh 'npm run test:e2e'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'test-results/html-report',
                        reportFiles: 'index.html',
                        reportName: 'E2E Test Report'
                    ])
                    archiveArtifacts artifacts: 'test-results/**/*'
                }
            }
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Development server not running**
   - Ensure `npm run dev` is running on port 3000
   - Check if the health endpoint responds: `curl http://localhost:3000/api/health`

2. **Browser installation issues**
   - Run `npm run test:install` to install browsers
   - For system-specific issues, see [Playwright documentation](https://playwright.dev/docs/browsers)

3. **Test data conflicts**
   - Tests automatically clean up data
   - For manual cleanup, check the database or restart the development server

4. **Flaky tests**
   - Tests include proper waits and retries
   - Check network conditions and system performance
   - Review test-specific timeouts in the configuration

### Debug Mode
```bash
# Run in debug mode with browser visible
npm run test:e2e:debug

# Run specific test in debug mode
node scripts/run-e2e-tests.js --debug --grep "specific test name"
```

### Performance Monitoring
The test suite includes performance monitoring:
- Slow operations are automatically logged
- Test execution times are tracked
- Performance reports are included in test results

## Contributing

### Adding New Tests
1. Follow the existing test structure in `tests/e2e/workforce-management.spec.ts`
2. Use the `TestHelpers` class for common operations
3. Include proper error handling and cleanup
4. Add appropriate test data setup

### Test Best Practices
- Use data-testid attributes for reliable element selection
- Include both positive and negative test cases
- Test with different user roles and permissions
- Verify both UI state and API responses
- Include accessibility testing for new features

### Updating Test Data
- Modify `tests/test-data-setup.ts` for new test data requirements
- Ensure proper cleanup in teardown methods
- Use realistic data that matches production scenarios

## Support

For issues with the testing suite:
1. Check the troubleshooting section above
2. Review test logs in `test-results/`
3. Run tests in debug mode for detailed investigation
4. Check Playwright documentation for browser-specific issues

The testing suite is designed to be comprehensive, reliable, and maintainable, providing confidence in the workforce management platform's functionality across all priority areas.
