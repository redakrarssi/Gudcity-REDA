#!/usr/bin/env node

/**
 * Test script for the Admin Businesses Endpoint
 * This script tests the /api/admin/businesses endpoint to ensure it's working correctly
 */

const http = require('http');

// Configuration
const config = {
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000,
  adminToken: process.env.ADMIN_TOKEN || 'test-admin-token'
};

// Test the admin businesses endpoint
async function testAdminBusinessesEndpoint() {
  console.log('🧪 Testing Admin Businesses Endpoint...\n');
  
  const options = {
    hostname: config.host,
    port: config.port,
    path: '/api/admin/businesses',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.adminToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Admin-Businesses-Test/1.0'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ statusCode: res.statusCode, response });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Run the test
async function runTest() {
  try {
    console.log(`📍 Testing endpoint: http://${config.host}:${config.port}/api/admin/businesses`);
    console.log(`🔑 Using admin token: ${config.adminToken.substring(0, 10)}...`);
    console.log('');
    
    const result = await testAdminBusinessesEndpoint();
    
    console.log(`✅ Status Code: ${result.statusCode}`);
    console.log('');
    
    if (result.statusCode === 200) {
      console.log('🎉 Endpoint is working correctly!');
      console.log('');
      
      if (result.response.success) {
        console.log(`📊 Total Businesses: ${result.response.totalBusinesses}`);
        console.log('');
        
        if (result.response.businesses && result.response.businesses.length > 0) {
          console.log('🏢 Sample Business Data:');
          const sample = result.response.businesses[0];
          
          console.log(`   ID: ${sample.generalInfo?.id}`);
          console.log(`   Name: ${sample.generalInfo?.name}`);
          console.log(`   Email: ${sample.generalInfo?.email}`);
          console.log(`   Status: ${sample.generalInfo?.status}`);
          console.log(`   Duration: ${sample.registrationDuration?.duration}`);
          console.log(`   Programs: ${sample.programs?.count}`);
          console.log(`   Customers: ${sample.customers?.count}`);
          console.log(`   Promotions: ${sample.promotions?.count}`);
          console.log(`   Last Login: ${sample.lastLogin ? 'Yes' : 'No'}`);
          console.log(`   Timeline Events: ${sample.timeline?.length || 0}`);
          
        } else {
          console.log('⚠️  No businesses found in the system');
        }
      } else {
        console.log('⚠️  Response indicates failure:', result.response.error || 'Unknown error');
      }
    } else if (result.statusCode === 401) {
      console.log('❌ Authentication failed - check admin token');
    } else if (result.statusCode === 403) {
      console.log('❌ Authorization failed - user is not an admin');
    } else if (result.statusCode === 404) {
      console.log('❌ Endpoint not found - check if server is running and routes are registered');
    } else {
      console.log(`❌ Unexpected status code: ${result.statusCode}`);
      console.log('Response:', result.response);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('');
      console.log('💡 Make sure the server is running:');
      console.log('   npm run dev');
      console.log('   or');
      console.log('   npm start');
    }
    
    if (error.message.includes('timeout')) {
      console.log('');
      console.log('💡 Request timed out - server might be slow or unresponsive');
    }
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runTest();
}

module.exports = { testAdminBusinessesEndpoint, runTest };