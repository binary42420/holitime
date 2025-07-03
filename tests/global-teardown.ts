import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Workforce Management Platform E2E Test Teardown...');

  try {
    // Read test results
    const testResultsPath = 'test-results/test-results.json';
    let testResults = null;
    
    if (fs.existsSync(testResultsPath)) {
      const resultsData = fs.readFileSync(testResultsPath, 'utf8');
      testResults = JSON.parse(resultsData);
    }

    // Read setup information
    const setupPath = 'test-results/test-setup.json';
    let setupInfo = null;
    
    if (fs.existsSync(setupPath)) {
      const setupData = fs.readFileSync(setupPath, 'utf8');
      setupInfo = JSON.parse(setupData);
    }

    // Generate comprehensive test report
    const endTime = new Date().toISOString();
    const startTime = setupInfo?.startTime || endTime;
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

    const comprehensiveReport = {
      testSuite: 'Workforce Management Platform E2E Tests',
      summary: {
        startTime,
        endTime,
        duration: `${Math.round(duration / 1000)}s`,
        environment: setupInfo?.environment || {},
        configuration: setupInfo?.testConfiguration || {}
      },
      results: testResults || {},
      coverage: {
        priorities: [
          {
            name: 'Priority 1: User Management System',
            features: [
              'User navigation and filtering',
              'User creation and editing',
              'Individual user profiles',
              'Password reset functionality'
            ]
          },
          {
            name: 'Priority 2: Shift Management System',
            features: [
              'Shift filtering with persistent state',
              'Clock Out All Employees functionality',
              'No Show marking with 30-minute rule',
              'Worker assignment display'
            ]
          },
          {
            name: 'Priority 3: Client Management System',
            features: [
              'Fixed client actions dropdown',
              'Create Job for Client action',
              'Create Shift for Client action',
              'Client profile pages'
            ]
          },
          {
            name: 'Priority 4: Email Notification System',
            features: [
              'Password reset emails',
              'Assignment reminder emails',
              'Shift confirmation emails',
              'Email template rendering'
            ]
          },
          {
            name: 'Priority 5: API Endpoint Testing',
            features: [
              'User CRUD operations',
              'Authentication and authorization',
              'Shift management APIs',
              'Error handling and status codes'
            ]
          },
          {
            name: 'Priority 6: Mobile Responsiveness',
            features: [
              'Responsive layouts on different screen sizes',
              'Touch-friendly interface elements',
              'Mobile navigation',
              'Responsive forms and components'
            ]
          },
          {
            name: 'Priority 7: Accessibility',
            features: [
              'Keyboard navigation',
              'ARIA labels and screen reader support',
              'Focus management',
              'Color contrast and visual accessibility'
            ]
          }
        ]
      },
      artifacts: {
        screenshots: getFileList('test-results/screenshots'),
        videos: getFileList('test-results/videos'),
        traces: getFileList('test-results/artifacts'),
        reports: [
          'test-results/html-report/index.html',
          'test-results/test-results.json',
          'test-results/junit.xml'
        ]
      }
    };

    // Write comprehensive report
    fs.writeFileSync(
      'test-results/comprehensive-report.json',
      JSON.stringify(comprehensiveReport, null, 2)
    );

    // Generate markdown report
    const markdownReport = generateMarkdownReport(comprehensiveReport);
    fs.writeFileSync('test-results/TEST-REPORT.md', markdownReport);

    // Generate CI/CD friendly summary
    const ciSummary = generateCISummary(testResults);
    fs.writeFileSync('test-results/ci-summary.txt', ciSummary);

    // Print summary to console
    console.log('\n' + '='.repeat(80));
    console.log('🎯 WORKFORCE MANAGEMENT PLATFORM E2E TEST SUMMARY');
    console.log('='.repeat(80));
    
    if (testResults) {
      const stats = testResults.stats || {};
      console.log(`📊 Total Tests: ${stats.total || 0}`);
      console.log(`✅ Passed: ${stats.passed || 0}`);
      console.log(`❌ Failed: ${stats.failed || 0}`);
      console.log(`⏭️  Skipped: ${stats.skipped || 0}`);
      console.log(`⏱️  Duration: ${comprehensiveReport.summary.duration}`);
      
      if (stats.total > 0) {
        const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
        console.log(`📈 Success Rate: ${successRate}%`);
      }
    }

    console.log('\n📁 Test Artifacts Generated:');
    console.log(`   📊 HTML Report: test-results/html-report/index.html`);
    console.log(`   📋 Comprehensive Report: test-results/comprehensive-report.json`);
    console.log(`   📝 Markdown Report: test-results/TEST-REPORT.md`);
    console.log(`   🤖 CI Summary: test-results/ci-summary.txt`);
    
    if (comprehensiveReport.artifacts.screenshots.length > 0) {
      console.log(`   📸 Screenshots: ${comprehensiveReport.artifacts.screenshots.length} files`);
    }
    
    if (comprehensiveReport.artifacts.videos.length > 0) {
      console.log(`   🎥 Videos: ${comprehensiveReport.artifacts.videos.length} files`);
    }

    console.log('\n🎉 Test teardown complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during test teardown:', error);
  }
}

function getFileList(directory: string): string[] {
  try {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory).map(file => path.join(directory, file));
  } catch (error) {
    return [];
  }
}

function generateMarkdownReport(report: any): string {
  return `# Workforce Management Platform E2E Test Report

## Test Summary
- **Start Time:** ${report.summary.startTime}
- **End Time:** ${report.summary.endTime}
- **Duration:** ${report.summary.duration}
- **Environment:** ${report.summary.environment.baseURL}

## Test Results
${report.results.stats ? `
- **Total Tests:** ${report.results.stats.total}
- **Passed:** ${report.results.stats.passed}
- **Failed:** ${report.results.stats.failed}
- **Skipped:** ${report.results.stats.skipped}
- **Success Rate:** ${((report.results.stats.passed / report.results.stats.total) * 100).toFixed(1)}%
` : 'Test results not available'}

## Coverage Areas

${report.coverage.priorities.map(priority => `
### ${priority.name}
${priority.features.map(feature => `- ${feature}`).join('\n')}
`).join('\n')}

## Test Artifacts
- HTML Report: \`test-results/html-report/index.html\`
- JSON Results: \`test-results/test-results.json\`
- JUnit XML: \`test-results/junit.xml\`
${report.artifacts.screenshots.length > 0 ? `- Screenshots: ${report.artifacts.screenshots.length} files` : ''}
${report.artifacts.videos.length > 0 ? `- Videos: ${report.artifacts.videos.length} files` : ''}

---
*Generated on ${new Date().toISOString()}*
`;
}

function generateCISummary(testResults: any): string {
  if (!testResults || !testResults.stats) {
    return 'TEST_STATUS=UNKNOWN\nTEST_MESSAGE=Test results not available';
  }

  const stats = testResults.stats;
  const success = stats.failed === 0;
  const successRate = ((stats.passed / stats.total) * 100).toFixed(1);

  return `TEST_STATUS=${success ? 'PASS' : 'FAIL'}
TEST_TOTAL=${stats.total}
TEST_PASSED=${stats.passed}
TEST_FAILED=${stats.failed}
TEST_SKIPPED=${stats.skipped}
TEST_SUCCESS_RATE=${successRate}%
TEST_MESSAGE=${success ? 'All tests passed successfully' : `${stats.failed} test(s) failed`}`;
}

export default globalTeardown;
