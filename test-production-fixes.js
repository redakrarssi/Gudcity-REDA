/**
 * Production Fix Test Script
 * Run this in browser console on your live website after deployment
 */

console.clear();
console.log('🧪 TESTING PRODUCTION FIXES');
console.log('============================');

// Test 1: Check environment configuration
console.log('\n📊 TEST 1: Environment Configuration');
console.log('VITE_API_URL:', import.meta?.env?.VITE_API_URL || 'undefined');
console.log('Current origin:', window.location.origin);
console.log('Environment mode:', import.meta?.env?.MODE || 'unknown');

// Test 2: Check API endpoints
console.log('\n📡 TEST 2: API Endpoint Tests');

async function testApiEndpoint(endpoint, expectedStatuses = [200, 401, 400, 403]) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const status = response.status;
    const isExpected = expectedStatuses.includes(status);
    
    console.log(`${endpoint}: ${status} ${response.statusText} ${isExpected ? '✅' : '❌'}`);
    
    if (status === 404) {
      console.error(`❌ ${endpoint} - API route not found!`);
    }
    
    return { endpoint, status, ok: isExpected };
  } catch (error) {
    console.error(`💥 ${endpoint} - Network error:`, error.message);
    return { endpoint, status: 0, ok: false, error: error.message };
  }
}

// Test key API endpoints
Promise.all([
  testApiEndpoint('/api/auth/login', [400, 401, 405]), // POST only
  testApiEndpoint('/api/users/1', [401, 403, 200]),
  testApiEndpoint('/api/business/1/analytics', [401, 403, 200]),
  testApiEndpoint('/api/admin/dashboard-stats', [401, 403, 200])
]).then(results => {
  console.log('\n📋 API Test Results:');
  const allWorking = results.every(r => r.ok);
  console.log(allWorking ? '✅ All API endpoints accessible' : '❌ Some API endpoints have issues');
  
  results.filter(r => !r.ok).forEach(r => {
    console.log(`   ❌ ${r.endpoint}: Status ${r.status}`);
  });
});

// Test 3: Authentication check
console.log('\n🔐 TEST 3: Authentication Status');
const token = localStorage.getItem('token') || 
              localStorage.getItem('auth_token') || 
              localStorage.getItem('authToken');

console.log('Token present:', token ? 'Yes' : 'No');

if (token) {
  fetch('/api/users/1', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(response => {
    console.log(`Token validation: ${response.status} ${response.statusText}`);
    if (response.status === 401) {
      console.log('🔄 Token expired - need to login again');
    } else if (response.status === 200) {
      console.log('✅ Token is valid');
    }
  })
  .catch(e => console.error('Token test failed:', e));
}

// Test 4: Production safety check
console.log('\n🔒 TEST 4: Production Safety Check');
console.log('This should NOT show direct database errors anymore');

setTimeout(() => {
  console.log('\n🎯 SUMMARY');
  console.log('===========');
  console.log('1. Check that VITE_API_URL is undefined (not "/api")');  
  console.log('2. Check that API endpoints return 401/403 (not 404)');
  console.log('3. No "SECURITY: Direct database access blocked" errors');
  console.log('4. Dashboards should now load data (not empty)');
  console.log('5. No 7-second logout issue');
  console.log('\nIf you still see issues, check Vercel environment variables.');
}, 2000);
