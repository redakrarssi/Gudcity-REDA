/**
 * Customer Dashboard API Test Script
 * Tests all consolidated endpoints to ensure they work correctly
 */

const BASE_URL = process.env.API_BASE_URL || 'https://gudcity-reda-oijvx17yl-123ridaronaldo-gmailcoms-projects.vercel.app';

// Test data
const testCustomerId = 4;
const testAuthToken = 'your-test-token-here'; // Replace with actual token

async function testEndpoint(endpoint, method = 'GET', data = null) {
  const url = `${BASE_URL}/api/${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${testAuthToken}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`🧪 Testing ${method} ${endpoint}...`);
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${endpoint}: SUCCESS (${response.status})`);
      console.log(`   Response:`, JSON.stringify(result, null, 2).substring(0, 200) + '...');
    } else {
      console.log(`❌ ${endpoint}: FAILED (${response.status})`);
      console.log(`   Error:`, result.error || result.message);
    }
  } catch (error) {
    console.log(`💥 ${endpoint}: ERROR`);
    console.log(`   Error:`, error.message);
  }
  
  console.log('---');
}

async function runTests() {
  console.log('🚀 Starting Customer Dashboard API Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('');

  // Test public endpoints (no auth required)
  await testEndpoint('promotions');

  // Test authenticated endpoints
  await testEndpoint('dashboard');
  await testEndpoint('cards');
  await testEndpoint('qr-card');
  await testEndpoint('settings');
  await testEndpoint('notifications');
  await testEndpoint(`loyalty/cards/customer/${testCustomerId}`);
  await testEndpoint(`customers/${testCustomerId}/programs`);
  await testEndpoint(`users/${testCustomerId}`);
  await testEndpoint('security/audit');

  // Test settings update
  await testEndpoint('settings', 'PUT', {
    name: 'Test User',
    phone: '+1234567890',
    timezone: 'America/New_York'
  });

  // Test notification update
  await testEndpoint('notifications/1', 'PUT', {
    is_read: true,
    action_taken: true
  });

  // Test security audit log
  await testEndpoint('security/audit', 'POST', {
    event: 'TEST_EVENT',
    metadata: { test: true },
    ipAddress: '127.0.0.1',
    userAgent: 'Test Script'
  });

  console.log('🏁 All tests completed!');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testEndpoint, runTests };