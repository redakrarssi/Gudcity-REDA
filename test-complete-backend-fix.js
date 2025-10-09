/**
 * COMPLETE BACKEND FIX VERIFICATION SCRIPT
 * Run this after deploying the backend API fixes
 */

console.clear();
console.log('🚀 BACKEND API FIX VERIFICATION');
console.log('=================================');
console.log('This will test all the fixes for the 7-second logout and empty dashboard issues\n');

// Test Results Storage
const testResults = {
  apiEndpoints: [],
  authentication: null,
  dashboardData: null,
  overall: 'pending'
};

// Test 1: Check Critical API Endpoints
console.log('📡 TEST 1: API Endpoint Availability');
console.log('-----------------------------------');

async function testEndpoint(endpoint, method = 'GET', body = null, expectedStatuses = [200, 401, 403, 400]) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token && method !== 'OPTIONS') {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, options);
    const status = response.status;
    const isExpected = expectedStatuses.includes(status);
    const result = `${endpoint}: ${status} ${response.statusText} ${isExpected ? '✅' : '❌'}`;
    
    console.log(result);
    
    testResults.apiEndpoints.push({
      endpoint,
      status,
      expected: isExpected,
      working: status !== 404
    });
    
    // Try to get response data for successful calls
    if (status === 200 && method === 'GET') {
      try {
        const data = await response.json();
        console.log(`   📊 Data received:`, Object.keys(data).slice(0, 5));
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    return { status, ok: isExpected };
  } catch (error) {
    console.error(`💥 ${endpoint} - Network error:`, error.message);
    testResults.apiEndpoints.push({
      endpoint,
      status: 0,
      expected: false,
      working: false,
      error: error.message
    });
    return { status: 0, ok: false };
  }
}

// Run endpoint tests
async function testAllEndpoints() {
  const endpoints = [
    ['/api/auth/login', 'POST', { email: 'test@test.com', password: 'wrong' }, [400, 401, 422]],
    ['/api/users/by-email', 'POST', { email: 'test@test.com' }, [200, 401, 404]],
    ['/api/admin/dashboard-stats', 'GET', null, [200, 401, 403]],
    ['/api/users/1', 'GET', null, [200, 401, 403, 404]],
    ['/api/business/1/analytics', 'GET', null, [200, 401, 403, 400]]
  ];
  
  for (const [endpoint, method, body, expectedStatuses] of endpoints) {
    await testEndpoint(endpoint, method, body, expectedStatuses);
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between tests
  }
}

// Test 2: Authentication Persistence Test
console.log('\n🔐 TEST 2: Authentication Persistence');
console.log('-----------------------------------');

function testAuthentication() {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  
  if (token) {
    console.log('✅ Token found in localStorage');
    console.log(`   Token length: ${token.length} characters`);
    console.log(`   Token preview: ${token.substring(0, 20)}...`);
    
    // Test token with a real API call
    fetch('/api/users/1', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
      console.log(`   Token validation: ${response.status} ${response.statusText}`);
      testResults.authentication = {
        hasToken: true,
        tokenLength: token.length,
        validationStatus: response.status,
        working: response.status !== 401
      };
    })
    .catch(e => {
      console.error('   Token validation failed:', e.message);
      testResults.authentication = {
        hasToken: true,
        tokenLength: token.length,
        validationStatus: 0,
        working: false,
        error: e.message
      };
    });
  } else {
    console.log('❌ No authentication token found');
    console.log('   Please login first to test authenticated endpoints');
    testResults.authentication = {
      hasToken: false,
      working: false
    };
  }
}

// Test 3: Dashboard Data Loading Test
console.log('\n📊 TEST 3: Dashboard Data Loading');
console.log('--------------------------------');

async function testDashboardData() {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ Cannot test dashboard data - no authentication token');
    testResults.dashboardData = { working: false, reason: 'No token' };
    return;
  }
  
  console.log('Testing admin dashboard stats API...');
  
  try {
    const response = await fetch('/api/admin/dashboard-stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Admin dashboard API: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Dashboard data received successfully!');
      console.log(`   Total Users: ${data.totalUsers || 0}`);
      console.log(`   Total Businesses: ${data.totalBusinesses || 0}`);
      console.log(`   Total Programs: ${data.totalPrograms || 0}`);
      console.log(`   System Health: ${data.systemHealth?.status || 'unknown'}`);
      
      testResults.dashboardData = {
        working: true,
        status: response.status,
        hasData: Object.keys(data).length > 0,
        dataKeys: Object.keys(data)
      };
      
    } else if (response.status === 401) {
      console.log('🔄 Token expired - need to login again');
      testResults.dashboardData = {
        working: false,
        status: response.status,
        reason: 'Token expired'
      };
    } else if (response.status === 403) {
      console.log('🔒 Access denied - user may not have admin permissions');
      testResults.dashboardData = {
        working: false,
        status: response.status,
        reason: 'Access denied'
      };
    } else {
      console.log('❌ Unexpected response from dashboard API');
      testResults.dashboardData = {
        working: false,
        status: response.status,
        reason: 'Unexpected response'
      };
    }
    
  } catch (error) {
    console.error('💥 Dashboard data test failed:', error.message);
    testResults.dashboardData = {
      working: false,
      error: error.message
    };
  }
}

// Test 4: Production Safety Check
console.log('\n🔒 TEST 4: Production Safety Monitor');
console.log('----------------------------------');

let productionErrors = 0;
let dbAccessErrors = 0;

// Monitor console errors for production issues
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  
  if (message.includes('Direct database access blocked')) {
    dbAccessErrors++;
    console.log(`❌ PRODUCTION SAFETY ERROR #${dbAccessErrors}: Direct database access blocked`);
  }
  
  if (message.includes('SECURITY:') || message.includes('Production mode:')) {
    productionErrors++;
  }
  
  // Call original console.error
  originalError.apply(console, args);
};

console.log('Monitoring for production safety errors...');
console.log('This will run for 30 seconds to detect any remaining issues');

// Main execution
async function runAllTests() {
  await testAllEndpoints();
  testAuthentication();
  await testDashboardData();
  
  // Final results after 30 seconds
  setTimeout(() => {
    console.log('\n🎯 FINAL TEST RESULTS');
    console.log('====================');
    
    // Endpoint results
    const workingEndpoints = testResults.apiEndpoints.filter(e => e.working).length;
    const totalEndpoints = testResults.apiEndpoints.length;
    console.log(`📡 API Endpoints: ${workingEndpoints}/${totalEndpoints} working`);
    
    // Authentication results
    const authWorking = testResults.authentication?.working || false;
    console.log(`🔐 Authentication: ${authWorking ? '✅ Working' : '❌ Issues detected'}`);
    
    // Dashboard results
    const dashboardWorking = testResults.dashboardData?.working || false;
    console.log(`📊 Dashboard Data: ${dashboardWorking ? '✅ Working' : '❌ Issues detected'}`);
    
    // Production safety results
    console.log(`🔒 Database Access Errors: ${dbAccessErrors} ${dbAccessErrors === 0 ? '✅' : '❌'}`);
    console.log(`🔒 Production Safety Errors: ${productionErrors} ${productionErrors === 0 ? '✅' : '❌'}`);
    
    // Overall assessment
    const allWorking = workingEndpoints === totalEndpoints && 
                      authWorking && 
                      dashboardWorking && 
                      dbAccessErrors === 0;
    
    console.log('\n🏆 OVERALL ASSESSMENT');
    console.log('===================');
    
    if (allWorking) {
      console.log('✅ ALL SYSTEMS WORKING!');
      console.log('✅ 7-second logout issue should be FIXED');
      console.log('✅ Empty dashboard issue should be FIXED');
      console.log('✅ Backend API connectivity is working');
      console.log('✅ Production safety is working correctly');
    } else {
      console.log('⚠️  Some issues remain:');
      
      if (workingEndpoints < totalEndpoints) {
        console.log('   - Some API endpoints are not accessible');
      }
      if (!authWorking) {
        console.log('   - Authentication token issues');
      }
      if (!dashboardWorking) {
        console.log('   - Dashboard data loading issues');
      }
      if (dbAccessErrors > 0) {
        console.log('   - Direct database access errors detected');
      }
    }
    
    console.log('\n📋 NEXT STEPS');
    console.log('=============');
    console.log('1. If all tests pass: Try logging into your dashboard');
    console.log('2. If tests fail: Check Vercel deployment logs');
    console.log('3. If still having issues: Check environment variables');
    
    testResults.overall = allWorking ? 'success' : 'partial';
  }, 30000);
}

// Start the tests
runAllTests();
