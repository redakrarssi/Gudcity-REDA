/**
 * Test script for the login endpoint
 * Run with: node test-login-endpoint.js
 */

async function testLoginEndpoint() {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/auth/login`;
  
  console.log('🧪 Testing Login Endpoint');
  console.log('📍 Endpoint:', endpoint);
  console.log('=====================================\n');

  // Test 1: OPTIONS request (CORS preflight)
  console.log('1️⃣ Testing CORS preflight (OPTIONS)...');
  try {
    const optionsResponse = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('✅ OPTIONS Status:', optionsResponse.status);
    console.log('✅ CORS Headers:', {
      'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers')
    });
  } catch (error) {
    console.log('❌ OPTIONS Error:', error.message);
  }
  
  console.log('\n=====================================\n');

  // Test 2: POST request with missing body
  console.log('2️⃣ Testing POST without body (should return 400)...');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      }
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', data);
  } catch (error) {
    console.log('❌ POST Error:', error.message);
  }

  console.log('\n=====================================\n');

  // Test 3: POST request with invalid credentials
  console.log('3️⃣ Testing POST with invalid credentials (should return 401)...');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', data);
  } catch (error) {
    console.log('❌ POST Error:', error.message);
  }

  console.log('\n=====================================\n');

  // Test 4: GET request (should return 405)
  console.log('4️⃣ Testing GET request (should return 405)...');
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', data);
  } catch (error) {
    console.log('❌ GET Error:', error.message);
  }

  console.log('\n=====================================');
  console.log('🎯 Test Complete!');
  console.log('=====================================');
}

// Check if we have fetch available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ with built-in fetch');
  console.log('💡 Alternatively, install node-fetch: npm install node-fetch');
  process.exit(1);
}

testLoginEndpoint().catch(console.error);
