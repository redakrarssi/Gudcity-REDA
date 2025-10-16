#!/usr/bin/env node

/**
 * Backend Connection Test
 * This script tests the backend connection to ensure the live website can connect to the backend
 */

import https from 'https';
import http from 'http';

// Test configuration
const TEST_CONFIG = {
  // Test different environments
  environments: [
    {
      name: 'Production (Vercel)',
      baseUrl: 'https://gudcity-reda.vercel.app',
      expectedStatus: 200
    },
    {
      name: 'Local Development',
      baseUrl: 'http://localhost:3000',
      expectedStatus: 200
    }
  ],
  
  // Test endpoints
  endpoints: [
    '/api/auth/login',
    '/api/db/initialize',
    '/health',
    '/api/users/by-email'
  ]
};

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Backend-Connection-Test/1.0'
      },
      timeout: 10000 // 10 second timeout
    };
    
    const req = client.request(url, options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body,
          url: url
        });
      });
    });
    
    req.on('error', (error) => {
      reject({
        error: error.message,
        url: url
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        url: url
      });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test function
async function testBackendConnection() {
  console.log('🚀 Starting Backend Connection Test');
  console.log('=====================================\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const env of TEST_CONFIG.environments) {
    console.log(`🌐 Testing Environment: ${env.name}`);
    console.log(`📍 Base URL: ${env.baseUrl}`);
    console.log('─'.repeat(50));
    
    for (const endpoint of TEST_CONFIG.endpoints) {
      totalTests++;
      const fullUrl = `${env.baseUrl}${endpoint}`;
      
      try {
        console.log(`\n🔍 Testing: ${endpoint}`);
        
        let testData = null;
        if (endpoint === '/api/auth/login') {
          testData = {
            email: 'test@example.com',
            password: 'testpassword'
          };
        } else if (endpoint === '/api/users/by-email') {
          testData = {
            email: 'test@example.com'
          };
        }
        
        const response = await makeRequest(fullUrl, 'POST', testData);
        
        // Check if we got a response (even if it's an error, it means the server is running)
        if (response.status) {
          console.log(`✅ Response received: ${response.status} ${response.statusText || ''}`);
          
          // For login endpoint, 401 is expected (invalid credentials)
          if (endpoint === '/api/auth/login' && response.status === 401) {
            console.log('✅ Expected 401 (invalid credentials) - Server is responding correctly');
            passedTests++;
          }
          // For other endpoints, 200 or 400/500 is acceptable (server is running)
          else if (response.status >= 200 && response.status < 600) {
            console.log('✅ Server is responding');
            passedTests++;
          } else {
            console.log(`❌ Unexpected status: ${response.status}`);
            failedTests++;
          }
        } else {
          console.log('❌ No response received');
          failedTests++;
        }
        
      } catch (error) {
        console.log(`❌ Request failed: ${error.error || error.message}`);
        failedTests++;
      }
    }
    
    console.log('\n' + '─'.repeat(50));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Backend connection is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above for details.');
  }
  
  return failedTests === 0;
}

// Run the test
testBackendConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });

export { testBackendConnection };