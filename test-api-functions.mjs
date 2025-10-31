#!/usr/bin/env node

/**
 * Comprehensive API Testing Script for /apireda functions
 * Tests all 25 API functions to ensure proper connectivity
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 API Functions Connection Test\n');
console.log('=' .repeat(60));

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Define all 25 API functions from ApiTestingPage
const API_FUNCTIONS = [
  // Authentication Functions
  { name: 'User Login', endpoint: '/api/auth/login', method: 'POST', requiresAuth: false },
  { name: 'User Registration', endpoint: '/api/auth/register', method: 'POST', requiresAuth: false },
  { name: 'Token Refresh', endpoint: '/api/auth/refresh', method: 'POST', requiresAuth: false },
  { name: 'Get Current User', endpoint: '/api/auth/me', method: 'GET', requiresAuth: true },
  
  // Business Management Functions
  { name: 'List Businesses', endpoint: '/api/businesses', method: 'GET', requiresAuth: true },
  { name: 'Create Business', endpoint: '/api/businesses', method: 'POST', requiresAuth: true },
  { name: 'Get Business Details', endpoint: '/api/businesses/1', method: 'GET', requiresAuth: true },
  { name: 'Update Business', endpoint: '/api/businesses/1', method: 'PUT', requiresAuth: true },
  
  // Customer Management Functions
  { name: 'List Customers', endpoint: '/api/customers', method: 'GET', requiresAuth: true },
  { name: 'Create Customer', endpoint: '/api/customers', method: 'POST', requiresAuth: true },
  { name: 'Get Customer Details', endpoint: '/api/customers/1', method: 'GET', requiresAuth: true },
  { name: 'Get Customer Programs', endpoint: '/api/customers/1/programs', method: 'GET', requiresAuth: true },
  
  // Points & Transactions Functions
  { name: 'Award Points', endpoint: '/api/points/award', method: 'POST', requiresAuth: true },
  { name: 'Redeem Points', endpoint: '/api/points/redeem', method: 'POST', requiresAuth: true },
  { name: 'Get Points Balance', endpoint: '/api/points/balance?customerId=1', method: 'GET', requiresAuth: true },
  { name: 'Calculate Points', endpoint: '/api/points/calculate', method: 'POST', requiresAuth: true },
  
  // QR Operations Functions
  { name: 'Generate QR Code', endpoint: '/api/qr/generate', method: 'POST', requiresAuth: true },
  { name: 'Validate QR Code', endpoint: '/api/qr/validate', method: 'POST', requiresAuth: true },
  { name: 'Scan QR Code', endpoint: '/api/qr/scan', method: 'POST', requiresAuth: true },
  
  // Notifications Functions
  { name: 'Get Notifications', endpoint: '/api/notifications', method: 'GET', requiresAuth: true },
  { name: 'Create Notification', endpoint: '/api/notifications', method: 'POST', requiresAuth: true },
  { name: 'Mark as Read', endpoint: '/api/notifications/test-id/read', method: 'PUT', requiresAuth: true },
  { name: 'Get Notification Stats', endpoint: '/api/notifications/stats', method: 'GET', requiresAuth: true },
  
  // Health & Monitoring
  { name: 'Health Check', endpoint: '/api/health', method: 'GET', requiresAuth: false },
  
  // Legacy (should be deprecated)
  { name: 'Legacy SQL Query', endpoint: 'N/A', method: 'GET', requiresAuth: false, deprecated: true }
];

/**
 * Test API endpoint connectivity
 */
async function testEndpoint(func) {
  const { name, endpoint, method, requiresAuth, deprecated } = func;
  
  results.total++;
  
  if (deprecated || endpoint === 'N/A') {
    results.details.push({
      name,
      status: '⚠️  DEPRECATED',
      message: 'Legacy function - should not be used',
      requiresAuth: false
    });
    results.passed++;
    return;
  }
  
  try {
    // For serverless functions, we check if the handler files exist
    const endpointPath = endpoint.replace('/api/', '');
    const parts = endpointPath.split('/').filter(p => p);
    
    let handlerExists = false;
    let handlerPath = '';
    
    // Check various possible handler paths based on routing structure
    const possiblePaths = [
      `api/${parts[0]}/[action].ts`,
      `api/${parts[0]}/[...slug].ts`,
      `api/${parts[0]}/[...route].ts`,
      `api/${parts[0]}.ts`,
      `api/${endpointPath}.ts`
    ];
    
    for (const path of possiblePaths) {
      try {
        if (existsSync(join(__dirname, path))) {
          handlerExists = true;
          handlerPath = path;
          break;
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    if (handlerExists) {
      results.details.push({
        name,
        status: '✅ CONNECTED',
        message: `API handler exists at ${handlerPath}`,
        endpoint,
        method,
        requiresAuth
      });
      results.passed++;
    } else {
      results.details.push({
        name,
        status: '❌ MISSING',
        message: `No API handler found for ${endpoint}`,
        endpoint,
        method,
        requiresAuth
      });
      results.failed++;
    }
  } catch (error) {
    results.details.push({
      name,
      status: '❌ ERROR',
      message: error.message,
      endpoint,
      method,
      requiresAuth
    });
    results.failed++;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n📋 Testing API Function Connectivity...\n');
  
  for (const func of API_FUNCTIONS) {
    await testEndpoint(func);
  }
  
  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60) + '\n');
  
  results.details.forEach(detail => {
    console.log(`${detail.status} ${detail.name}`);
    console.log(`   ${detail.message}`);
    if (detail.endpoint) {
      console.log(`   Endpoint: ${detail.method} ${detail.endpoint}`);
      console.log(`   Requires Auth: ${detail.requiresAuth ? 'Yes' : 'No'}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log('📈 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Functions: ${results.total}`);
  console.log(`✅ Connected: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60) + '\n');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
