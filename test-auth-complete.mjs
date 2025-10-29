/**
 * Complete Authentication Test Suite
 * Tests the entire auth flow including login, token validation, etc.
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Configuration
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🚀 GudCity Authentication Test Suite');
console.log('=====================================');
console.log('🌐 Base URL:', BASE_URL);
console.log('🗄️ Database:', DATABASE_URL ? '✅ Connected' : '❌ Not configured');
console.log('=====================================\n');

/**
 * Step 1: Setup demo user
 */
async function setupDemoUser() {
  console.log('👤 Step 1: Setting up demo user...');
  
  if (!DATABASE_URL) {
    console.log('⚠️ Skipping user setup - no database URL');
    return null;
  }

  try {
    const sql = neon(DATABASE_URL);
    const demoUser = {
      email: 'demo@gudcity.com',
      password: 'Demo123!@#',
      name: 'Demo User',
      role: 'USER',
      status: 'ACTIVE'
    };

    // Check if user exists
    const existingUsers = await sql`
      SELECT id, email FROM users WHERE LOWER(email) = LOWER(${demoUser.email})
    `;

    if (existingUsers.length === 0) {
      // Create demo user
      const hashedPassword = await bcrypt.hash(demoUser.password, 12);
      await sql`
        INSERT INTO users (email, password, name, role, status, created_at, updated_at)
        VALUES (
          ${demoUser.email.toLowerCase()}, 
          ${hashedPassword}, 
          ${demoUser.name}, 
          ${demoUser.role}, 
          ${demoUser.status}, 
          NOW(), 
          NOW()
        )
      `;
      console.log('✅ Demo user created');
    } else {
      console.log('✅ Demo user already exists');
    }

    return demoUser;
  } catch (error) {
    console.log('❌ Error setting up demo user:', error.message);
    return null;
  }
}

/**
 * Step 2: Test CORS preflight
 */
async function testCORSPreflight() {
  console.log('\n🌐 Step 2: Testing CORS preflight...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    console.log('✅ CORS Status:', response.status);
    console.log('✅ Allow-Origin:', response.headers.get('Access-Control-Allow-Origin') || 'Not set');
    console.log('✅ Allow-Methods:', response.headers.get('Access-Control-Allow-Methods') || 'Not set');
    
    return response.status === 200;
  } catch (error) {
    console.log('❌ CORS Error:', error.message);
    return false;
  }
}

/**
 * Step 3: Test invalid method
 */
async function testInvalidMethod() {
  console.log('\n❌ Step 3: Testing invalid method (GET)...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    console.log('✅ Status:', response.status, '(Expected: 405)');
    console.log('✅ Response:', data);
    
    return response.status === 405;
  } catch (error) {
    console.log('❌ Invalid method test error:', error.message);
    return false;
  }
}

/**
 * Step 4: Test missing credentials
 */
async function testMissingCredentials() {
  console.log('\n🔒 Step 4: Testing missing credentials...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await response.json();
    console.log('✅ Status:', response.status, '(Expected: 400)');
    console.log('✅ Response:', data);
    
    return response.status === 400;
  } catch (error) {
    console.log('❌ Missing credentials test error:', error.message);
    return false;
  }
}

/**
 * Step 5: Test invalid credentials
 */
async function testInvalidCredentials() {
  console.log('\n🚫 Step 5: Testing invalid credentials...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      })
    });

    const data = await response.json();
    console.log('✅ Status:', response.status, '(Expected: 401)');
    console.log('✅ Response:', data);
    
    return response.status === 401;
  } catch (error) {
    console.log('❌ Invalid credentials test error:', error.message);
    return false;
  }
}

/**
 * Step 6: Test valid login
 */
async function testValidLogin(demoUser) {
  console.log('\n🎯 Step 6: Testing valid login...');
  
  if (!demoUser) {
    console.log('⚠️ Skipping valid login test - no demo user available');
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: demoUser.email,
        password: demoUser.password
      })
    });

    const data = await response.json();
    console.log('✅ Status:', response.status, '(Expected: 200)');
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.success) {
      console.log('🎉 LOGIN SUCCESSFUL!');
      console.log('🔑 Access Token:', data.data?.accessToken?.substring(0, 20) + '...');
      return { success: true, token: data.data?.accessToken };
    }
    
    return { success: false };
  } catch (error) {
    console.log('❌ Valid login test error:', error.message);
    return { success: false };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Starting comprehensive authentication tests...\n');
  
  const results = {
    setup: false,
    cors: false,
    invalidMethod: false,
    missingCredentials: false,
    invalidCredentials: false,
    validLogin: false
  };

  // Step 1: Setup
  const demoUser = await setupDemoUser();
  results.setup = !!demoUser;

  // Step 2: CORS
  results.cors = await testCORSPreflight();

  // Step 3: Invalid method
  results.invalidMethod = await testInvalidMethod();

  // Step 4: Missing credentials
  results.missingCredentials = await testMissingCredentials();

  // Step 5: Invalid credentials
  results.invalidCredentials = await testInvalidCredentials();

  // Step 6: Valid login
  const loginResult = await testValidLogin(demoUser);
  results.validLogin = loginResult.success;

  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=====================================');
  console.log('👤 Demo User Setup:', results.setup ? '✅ PASS' : '❌ FAIL');
  console.log('🌐 CORS Preflight:', results.cors ? '✅ PASS' : '❌ FAIL');
  console.log('❌ Invalid Method:', results.invalidMethod ? '✅ PASS' : '❌ FAIL');
  console.log('🔒 Missing Credentials:', results.missingCredentials ? '✅ PASS' : '❌ FAIL');
  console.log('🚫 Invalid Credentials:', results.invalidCredentials ? '✅ PASS' : '❌ FAIL');
  console.log('🎯 Valid Login:', results.validLogin ? '✅ PASS' : '❌ FAIL');
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('=====================================');
  console.log(`🏆 OVERALL: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Login endpoint is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
  
  console.log('=====================================');

  return results;
}

// Check for Node.js 18+ fetch support
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with built-in fetch');
  console.log('💡 Or run: npm install node-fetch');
  process.exit(1);
}

runAllTests().catch(console.error);
