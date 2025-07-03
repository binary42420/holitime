const https = require('https');
const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          statusText: response.statusMessage,
          ok: response.statusCode >= 200 && response.statusCode < 300,
          json: () => JSON.parse(data),
          text: () => data
        });
      });
    });
    request.on('error', reject);
  });
}

async function testTimesheetAPI() {
  const timesheetId = '12234c93-a6ce-4bcf-81e6-a100985c5d4d';
  const baseUrl = 'http://localhost:3000';

  console.log(`🧪 Testing Timesheet API for ID: ${timesheetId}\n`);

  try {
    // Test 1: GET /api/timesheets/[id]
    console.log('📋 Test 1: GET /api/timesheets/[id]');
    const response1 = await makeRequest(`${baseUrl}/api/timesheets/${timesheetId}`);
    console.log(`   Status: ${response1.status} ${response1.statusText}`);

    if (response1.ok) {
      const data = response1.json();
      console.log('   ✅ Success! Timesheet data received');
      console.log(`   - Status: ${data.timesheet?.status}`);
      console.log(`   - Job: ${data.shift?.jobName}`);
      console.log(`   - Client: ${data.shift?.clientName}`);
    } else {
      const error = response1.text();
      console.log(`   ❌ Failed: ${error}`);
    }

    // Test 2: GET /api/timesheets/[id]/review
    console.log('\n📋 Test 2: GET /api/timesheets/[id]/review');
    const response2 = await makeRequest(`${baseUrl}/api/timesheets/${timesheetId}/review`);
    console.log(`   Status: ${response2.status} ${response2.statusText}`);

    if (response2.ok) {
      const data = response2.json();
      console.log('   ✅ Success! Review data received');
      console.log(`   - Status: ${data.timesheet?.status}`);
      console.log(`   - Crew Chief: ${data.shift?.crewChiefName || 'None assigned'}`);
    } else {
      const error = response2.text();
      console.log(`   ❌ Failed: ${error}`);
    }

    // Test 3: Test the approve page (just check if it loads)
    console.log('\n📋 Test 3: GET /timesheets/[id]/approve (page)');
    const response3 = await makeRequest(`${baseUrl}/timesheets/${timesheetId}/approve`);
    console.log(`   Status: ${response3.status} ${response3.statusText}`);

    if (response3.ok) {
      console.log('   ✅ Success! Approve page loads');
    } else {
      console.log(`   ❌ Failed: Page not accessible`);
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the Next.js development server is running:');
      console.log('   npm run dev');
    }
  }
}

testTimesheetAPI();
