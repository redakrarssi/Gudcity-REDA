#!/usr/bin/env node

/**
 * Test script for admin businesses API
 * This script tests the API connectivity and authentication flow
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Constants
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';
const JWT_SECRET = process.env.VITE_JWT_SECRET;

// Create a test JWT token
function createTestToken() {
  if (!JWT_SECRET) {
    console.error('❌ Error: VITE_JWT_SECRET is not set in environment variables');
    process.exit(1);
  }
  
  const payload = {
    userId: 1,
    email: 'admin@example.com',
    role: 'admin'
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '1h',
    issuer: 'gudcity-loyalty-platform',
    audience: 'gudcity-users'
  });
  
  return token;
}

// Test API functions
async function testHealthCheck() {
  try {
    console.log('🔄 Testing API health check endpoint...');
    const response = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testAuthEndpoint() {
  try {
    console.log('🔄 Testing API auth endpoint...');
    const token = createTestToken();
    const response = await axios.get(`${API_URL}/test-auth`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Auth test successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Auth test failed:', error.message);
    return false;
  }
}

async function testBusinessesEndpoint() {
  try {
    console.log('🔄 Testing admin businesses endpoint...');
    const token = createTestToken();
    const response = await axios.get(`${API_URL}/admin/businesses`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Admin businesses endpoint successful:', response.data ? `Returned ${response.data.businesses?.length || 0} businesses` : 'No data returned');
    return true;
  } catch (error) {
    console.error('❌ Admin businesses endpoint failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run the tests
async function runTests() {
  console.log('🚀 Starting API tests...');
  
  const healthCheckResult = await testHealthCheck();
  const authEndpointResult = await testAuthEndpoint();
  const businessesEndpointResult = await testBusinessesEndpoint();
  
  console.log('\n📝 Test Results:');
  console.log(`Health Check: ${healthCheckResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Auth Endpoint: ${authEndpointResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Businesses Endpoint: ${businessesEndpointResult ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallResult = healthCheckResult && authEndpointResult && businessesEndpointResult;
  
  console.log(`\nOverall Result: ${overallResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (!overallResult) {
    console.log('\n📋 Troubleshooting Steps:');
    console.log('1. Ensure API server is running: `node start-api-server.cjs`');
    console.log('2. Check your .env file has required variables set');
    console.log('3. Run the environment setup script: `node src/server-fix.mjs`');
    console.log('4. Verify database connection is working');
    console.log('5. Restart the API server and try again');
  } else {
    console.log('\n🎉 All tests passed! The API is working correctly.');
    console.log('The admin businesses page should now load properly.');
  }
}

runTests();
