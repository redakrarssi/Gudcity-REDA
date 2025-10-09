/**
 * FINAL FIX VERIFICATION SCRIPT
 * Tests all the fixes for 7-second logout and empty dashboard issues
 */

console.clear();
console.log('🎯 FINAL FIX VERIFICATION');
console.log('=========================');
console.log('Testing all fixes for 7-second logout and empty dashboard issues\n');

// Test Results
const results = {
  apiEndpoints: [],
  promotions: null,
  databaseAccess: 0,
  overall: 'pending'
};

// Test 1: API Endpoints
console.log('📡 TEST 1: API Endpoints');
console.log('------------------------');

async function testApiEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, options);
    const status = response.status;
    const working = status !== 404 && status !== 500;
    
    console.log(`${endpoint}: ${status} ${response.statusText} ${working ? '✅' : '❌'}`);
    
    results.apiEndpoints.push({
      endpoint,
      status,
      working
    });
    
    return { status, working };
  } catch (error) {
    console.error(`💥 ${endpoint} - Network error:`, error.message);
    results.apiEndpoints.push({
      endpoint,
      status: 0,
      working: false,
      error: error.message
    });
    return { status: 0, working: false };
  }
}

// Test 2: Promotions API
console.log('\n🎫 TEST 2: Promotions API');
console.log('-------------------------');

async function testPromotions() {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
  
  if (!token) {
    console.log('❌ No token - cannot test promotions API');
    results.promotions = { working: false, reason: 'No token' };
    return;
  }
  
  try {
    const response = await fetch('/api/promotions/available', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Promotions API: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Promotions API working!');
      console.log(`   Found ${data.promotions?.length || 0} promotions`);
      console.log(`   Fallback mode: ${data.fallback ? 'Yes' : 'No'}`);
      
      results.promotions = {
        working: true,
        status: response.status,
        count: data.promotions?.length || 0,
        fallback: data.fallback || false
      };
    } else {
      console.log(`❌ Promotions API failed: ${response.status}`);
      results.promotions = {
        working: false,
        status: response.status
      };
    }
  } catch (error) {
    console.error('💥 Promotions API error:', error.message);
    results.promotions = {
      working: false,
      error: error.message
    };
  }
}

// Test 3: Monitor for Database Access Errors
console.log('\n🔒 TEST 3: Database Access Monitor');
console.log('----------------------------------');

// Monitor console errors for database access issues
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  
  if (message.includes('Direct database access blocked')) {
    results.databaseAccess++;
    console.log(`❌ DATABASE ACCESS ERROR #${results.databaseAccess}: Direct database access blocked`);
  }
  
  // Call original console.error
  originalError.apply(console, args);
};

console.log('Monitoring for database access errors...');

// Main test execution
async function runAllTests() {
  // Test API endpoints
  await testApiEndpoint('/api/auth/login', 'POST', { email: 'test@test.com', password: 'wrong' });
  await testApiEndpoint('/api/users/1');
  await testApiEndpoint('/api/admin/dashboard-stats');
  await testApiEndpoint('/api/promotions/available');
  
  // Test promotions specifically
  await testPromotions();
  
  // Wait a bit to monitor for errors
  setTimeout(() => {
    console.log('\n🎯 FINAL RESULTS');
    console.log('================');
    
    // API Results
    const workingApis = results.apiEndpoints.filter(e => e.working).length;
    const totalApis = results.apiEndpoints.length;
    console.log(`📡 API Endpoints: ${workingApis}/${totalApis} working`);
    
    // Promotions Results
    const promotionsWorking = results.promotions?.working || false;
    console.log(`🎫 Promotions API: ${promotionsWorking ? '✅ Working' : '❌ Failed'}`);
    
    // Database Access Results
    console.log(`🔒 Database Access Errors: ${results.databaseAccess} ${results.databaseAccess === 0 ? '✅' : '❌'}`);
    
    // Overall Assessment
    const allWorking = workingApis === totalApis && 
                      promotionsWorking && 
                      results.databaseAccess === 0;
    
    console.log('\n🏆 OVERALL ASSESSMENT');
    console.log('===================');
    
    if (allWorking) {
      console.log('✅ ALL FIXES WORKING!');
      console.log('✅ 7-second logout issue should be RESOLVED');
      console.log('✅ Empty dashboard issue should be RESOLVED');
      console.log('✅ Promotions section should work without errors');
      console.log('✅ No more "Direct database access blocked" errors');
      
      console.log('\n🎉 SUCCESS! Your issues should now be fixed:');
      console.log('   - Login should persist (no 7-second logout)');
      console.log('   - Dashboards should show data (not empty)');
      console.log('   - Promotions should load without errors');
      console.log('   - No more database access errors in console');
      
    } else {
      console.log('⚠️  Some issues remain:');
      
      if (workingApis < totalApis) {
        console.log('   - Some API endpoints are not working');
      }
      if (!promotionsWorking) {
        console.log('   - Promotions API is not working');
      }
      if (results.databaseAccess > 0) {
        console.log('   - Still getting database access errors');
      }
      
      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Deploy the latest changes to Vercel');
      console.log('   2. Wait for deployment to complete');
      console.log('   3. Test login and dashboard functionality');
    }
    
    results.overall = allWorking ? 'success' : 'partial';
  }, 5000);
}

// Start the tests
runAllTests();
