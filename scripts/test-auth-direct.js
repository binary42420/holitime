const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Allow self-signed certificates for Aiven
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testAuth() {
  try {
    console.log('Testing authentication functions...');
    
    // Import auth functions
    const { authenticateUser, getUserByEmail } = require('../src/lib/auth.ts');
    
    // Test getting user by email
    console.log('Testing getUserByEmail...');
    const user = await getUserByEmail('maria.g@handson.com');
    if (user) {
      console.log('✓ Found user:', user.name, '-', user.role);
    } else {
      console.log('✗ User not found');
      return;
    }
    
    // Test authentication
    console.log('Testing authenticateUser...');
    const authResult = await authenticateUser({
      email: 'maria.g@handson.com',
      password: 'password123'
    });
    
    if (authResult) {
      console.log('✓ Authentication successful!');
      console.log('User:', authResult.user.name, '-', authResult.user.role);
      console.log('Token length:', authResult.token.length);
    } else {
      console.log('✗ Authentication failed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Authentication test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testAuth();
