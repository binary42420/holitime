const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testAuth() {
  try {
    console.log('Testing authentication system...');
    
    // Test login endpoint
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'maria.g@handson.com',
        password: 'password123'
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✓ Login successful:', loginData.user.name, '-', loginData.user.role);
      
      // Extract cookies for subsequent requests
      const cookies = loginResponse.headers.get('set-cookie');
      
      // Test protected endpoint
      const shiftsResponse = await fetch('http://localhost:3000/api/shifts', {
        headers: {
          'Cookie': cookies || ''
        }
      });
      
      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        console.log('✓ Protected endpoint accessible, found', shiftsData.shifts?.length || 0, 'shifts');
      } else {
        console.log('✗ Protected endpoint failed:', shiftsResponse.status);
      }
      
    } else {
      const errorData = await loginResponse.json();
      console.log('✗ Login failed:', errorData.error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAuth();
