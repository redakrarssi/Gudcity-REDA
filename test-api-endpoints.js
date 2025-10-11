#!/usr/bin/env node

/**
 * API Endpoint Testing Script
 * Run this script to verify all API endpoints are working correctly
 */

const API_BASE = process.env.VITE_API_URL || 'https://gudcity-reda-b8ovncj2p-123ridaronaldo-gmailcoms-projects.vercel.app';

async function testEndpoint(endpoint, method = 'GET', data = null) {
  try {
    const url = `${API_BASE}${endpoint}`;
    console.log(`Testing ${method} ${url}`);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

    console.log(`  Status: ${response.status}`);
    if (response.ok) {
      console.log(`  ✅ Success:`, result);
    } else {
      console.log(`  ❌ Error:`, result);
    }

    return { success: response.ok, status: response.status, data: result };
  } catch (error) {
    console.log(`  ❌ Network Error:`, error.message);
    return { success: false, status: 0, data: { error: error.message } };
  }
}

async function runTests() {
  console.log('🚀 Starting API Endpoint Tests...\n');

  const tests = [
    // Auth endpoints (no auth required)
    { endpoint: '/api/auth/login', method: 'POST', data: { email: 'test@example.com', password: 'test123' } },

    // User endpoints (require auth - will fail but should return 401, not 404/500)
    { endpoint: '/api/users/by-email', method: 'POST', data: { email: 'test@example.com' } },

    // Business endpoints (require auth - will fail but should return 401, not 404/500)
    { endpoint: '/api/business/1/settings' },
    { endpoint: '/api/business/1/analytics' },

    // Customer endpoints (require auth - will fail but should return 401, not 404/500)
    { endpoint: '/api/customers/1/notifications' },
    { endpoint: '/api/customers/1/approvals' },
    { endpoint: '/api/customers/1/cards' },
    { endpoint: '/api/customers/1/programs' },
  ];

  const results = [];

  for (const test of tests) {
    const result = await testEndpoint(test.endpoint, test.method, test.data);
    results.push({ ...test, ...result });
    console.log(''); // Add spacing between tests
  }

  // Summary
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  console.log('📊 Test Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);
  console.log(`  📈 Success Rate: ${((successCount / tests.length) * 100).toFixed(1)}%`);

  // Check for specific issues
  const notFoundErrors = results.filter(r => r.status === 404);
  const serverErrors = results.filter(r => r.status === 500);

  if (notFoundErrors.length > 0) {
    console.log('\n🚨 404 Errors (Missing endpoints):');
    notFoundErrors.forEach(r => console.log(`  - ${r.endpoint}: ${r.data.error}`));
  }

  if (serverErrors.length > 0) {
    console.log('\n🚨 500 Errors (Server issues):');
    serverErrors.forEach(r => console.log(`  - ${r.endpoint}: ${r.data.error}`));
  }

  console.log('\n🎯 Expected Results:');
  console.log('  - Auth endpoints should work (200)');
  console.log('  - Protected endpoints should return 401 (unauthorized)');
  console.log('  - No 404 or 500 errors should occur');
}

// Run the tests
runTests().catch(console.error);
