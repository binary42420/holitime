const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

async function testFullSystem() {
  try {
    console.log('🧪 Testing Full System Integration...\n');
    
    // Test 1: Login
    console.log('1. Testing Login...');
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
      console.log('✅ Login successful:', loginData.user.name, '-', loginData.user.role);
      
      // Extract cookies for subsequent requests
      const cookies = loginResponse.headers.get('set-cookie');
      
      // Test 2: Protected endpoint - /api/auth/me
      console.log('\n2. Testing Authentication Check...');
      const meResponse = await fetch('http://localhost:3000/api/auth/me', {
        headers: {
          'Cookie': cookies || ''
        }
      });
      
      if (meResponse.ok) {
        const meData = await meResponse.json();
        console.log('✅ Auth check successful:', meData.user.name);
      } else {
        console.log('❌ Auth check failed:', meResponse.status);
      }
      
      // Test 3: Shifts API
      console.log('\n3. Testing Shifts API...');
      const shiftsResponse = await fetch('http://localhost:3000/api/shifts', {
        headers: {
          'Cookie': cookies || ''
        }
      });
      
      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        console.log('✅ Shifts API working, found', shiftsData.shifts?.length || 0, 'shifts');
      } else {
        console.log('❌ Shifts API failed:', shiftsResponse.status);
      }
      
      // Test 4: Announcements API
      console.log('\n4. Testing Announcements API...');
      const announcementsResponse = await fetch('http://localhost:3000/api/announcements', {
        headers: {
          'Cookie': cookies || ''
        }
      });
      
      if (announcementsResponse.ok) {
        const announcementsData = await announcementsResponse.json();
        console.log('✅ Announcements API working, found', announcementsData.announcements?.length || 0, 'announcements');
      } else {
        console.log('❌ Announcements API failed:', announcementsResponse.status);
      }
      
      // Test 5: Logout
      console.log('\n5. Testing Logout...');
      const logoutResponse = await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': cookies || ''
        }
      });
      
      if (logoutResponse.ok) {
        console.log('✅ Logout successful');
      } else {
        console.log('❌ Logout failed:', logoutResponse.status);
      }
      
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData.error);
    }
    
    console.log('\n🎉 System test completed!');
    
  } catch (error) {
    console.error('❌ System test failed:', error.message);
  }
}

testFullSystem();
