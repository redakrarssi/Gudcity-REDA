#!/usr/bin/env node

/**
 * Test script for Admin Routes
 * This script tests the admin routes to ensure they're accessible
 */

const http = require('http');

// Configuration
const config = {
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000
};

// Test endpoints
const testEndpoints = [
  { path: '/api/admin/test', name: 'Admin Test' },
  { path: '/api/admin/public-test', name: 'Admin Public Test' },
  { path: '/api/admin/simple-businesses', name: 'Admin Simple Businesses' },
  { path: '/api/admin/businesses', name: 'Admin Businesses (Auth Required)' }
];

// Test function
async function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Admin-Routes-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ 
            name, 
            path, 
            statusCode: res.statusCode, 
            success: true, 
            response 
          });
        } catch (error) {
          resolve({ 
            name, 
            path, 
            statusCode: res.statusCode, 
            success: false, 
            error: 'Invalid JSON response',
            rawData: data.substring(0, 200) + (data.length > 200 ? '...' : '')
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ 
        name, 
        path, 
        success: false, 
        error: error.message 
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ 
        name, 
        path, 
        success: false, 
        error: 'Request timeout' 
      });
    });

    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('🧪 Testing Admin Routes...\n');
  console.log(`📍 Testing endpoints on: http://${config.host}:${config.port}\n`);
  
  const results = [];
  
  for (const endpoint of testEndpoints) {
    console.log(`🔍 Testing: ${endpoint.name} (${endpoint.path})`);
    const result = await testEndpoint(endpoint.path, endpoint.name);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${endpoint.name}: Status ${result.statusCode}`);
      if (result.response && result.response.message) {
        console.log(`   Message: ${result.response.message}`);
      }
    } else {
      console.log(`❌ ${endpoint.name}: ${result.error}`);
      if (result.rawData) {
        console.log(`   Raw response: ${result.rawData}`);
      }
    }
    console.log('');
  }
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n🔍 Failed Endpoints:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   ❌ ${result.name}: ${result.error}`);
    });
    
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Make sure the server is running (npm run dev)');
    console.log('   2. Check if the admin routes are properly imported');
    console.log('   3. Verify the server is listening on the correct port');
    console.log('   4. Check server console for any error messages');
  }
  
  if (successful === results.length) {
    console.log('\n🎉 All admin routes are working correctly!');
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };