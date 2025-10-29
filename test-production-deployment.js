/**
 * Production API Deployment Test
 * Tests your deployed Vercel API endpoints
 */

// ⚠️ IMPORTANT: Replace this with your actual Vercel deployment URL
const VERCEL_URL = process.env.VERCEL_URL || 'https://gudcity-reda.vercel.app';

async function testProductionAPI() {
  console.log('🚀 Testing Production API Deployment');
  console.log('=====================================');
  console.log(`📍 Base URL: ${VERCEL_URL}`);
  console.log('=====================================\n');

  let allTestsPassed = true;

  // Test 1: Health Check
  console.log('1️⃣ Testing Health Endpoint...');
  try {
    const startTime = Date.now();
    const response = await fetch(`${VERCEL_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    const duration = Date.now() - startTime;
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response Time: ${duration}ms`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      
      if (data.status === 'healthy') {
        console.log('   ✅ Health check PASSED\n');
      } else {
        console.log('   ⚠️ Health check returned unhealthy status\n');
        allTestsPassed = false;
      }
    } else {
      console.log(`   ❌ Health check FAILED: ${response.status}\n`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ Health check ERROR: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 2: CORS Preflight
  console.log('2️⃣ Testing CORS Preflight (OPTIONS)...');
  try {
    const response = await fetch(`${VERCEL_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    };
    
    console.log(`   CORS Headers:`, JSON.stringify(corsHeaders, null, 2));
    
    if (response.status === 200 && corsHeaders['Access-Control-Allow-Origin']) {
      console.log('   ✅ CORS preflight PASSED\n');
    } else {
      console.log('   ⚠️ CORS preflight returned unexpected response\n');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ CORS preflight ERROR: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 3: Login with Invalid Credentials (should return 401)
  console.log('3️⃣ Testing Login with Invalid Credentials...');
  try {
    const response = await fetch(`${VERCEL_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      const data = await response.json();
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      console.log('   ✅ Invalid login correctly rejected\n');
    } else {
      console.log(`   ⚠️ Expected 401, got ${response.status}\n`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ Invalid login test ERROR: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 4: Login with Valid Credentials (if demo user exists)
  console.log('4️⃣ Testing Login with Demo Credentials...');
  try {
    const response = await fetch(`${VERCEL_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: 'demo@gudcity.com',
        password: 'Demo123!@#'
      })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.success && data.data?.accessToken) {
      console.log('   ✅ Demo login PASSED\n');
      console.log(`   🎫 Access Token: ${data.data.accessToken.substring(0, 50)}...`);
      console.log(`   👤 User: ${data.data.user?.name || data.data.user?.email}\n`);
    } else if (response.status === 401) {
      console.log('   ℹ️ Demo user not found in production database\n');
      console.log('   💡 This is expected if you haven\'t run the demo user creation script\n');
    } else {
      console.log(`   ⚠️ Unexpected response: ${response.status}\n`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ Demo login ERROR: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 5: Missing Request Body (should return 400)
  console.log('5️⃣ Testing Login with Missing Body...');
  try {
    const response = await fetch(`${VERCEL_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 400) {
      const data = await response.json();
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      console.log('   ✅ Missing body validation PASSED\n');
    } else {
      console.log(`   ⚠️ Expected 400, got ${response.status}\n`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ Missing body test ERROR: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 6: Wrong HTTP Method (should return 405)
  console.log('6️⃣ Testing Wrong HTTP Method...');
  try {
    const response = await fetch(`${VERCEL_URL}/api/auth/login`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 405) {
      const data = await response.json();
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      console.log('   ✅ Method validation PASSED\n');
    } else {
      console.log(`   ⚠️ Expected 405, got ${response.status}\n`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ Wrong method test ERROR: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Summary
  console.log('=====================================');
  console.log('📊 Test Summary');
  console.log('=====================================');
  
  if (allTestsPassed) {
    console.log('✅ All tests PASSED!');
    console.log('🎉 Your API is deployed and working correctly!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Update your frontend to use this URL');
    console.log('   2. Create demo users in production if needed');
    console.log('   3. Test all other endpoints');
  } else {
    console.log('⚠️ Some tests FAILED or returned warnings');
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check Vercel logs: vercel logs');
    console.log('   2. Verify environment variables are set');
    console.log('   3. Check database connectivity');
    console.log('   4. Review DEPLOYMENT_CHECKLIST.md');
  }
  console.log('=====================================');
}

// Check if URL is set
if (VERCEL_URL.includes('your-project-name')) {
  console.log('⚠️ ERROR: Please update VERCEL_URL in this script!');
  console.log('\nUsage:');
  console.log('  1. Edit this file and replace VERCEL_URL with your actual Vercel URL');
  console.log('  2. Or run: VERCEL_URL=https://your-project.vercel.app node test-production-deployment.js');
  console.log('\nTo find your Vercel URL:');
  console.log('  - Run: vercel ls');
  console.log('  - Or visit: https://vercel.com/dashboard\n');
  process.exit(1);
}

// Run the tests
testProductionAPI().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});

