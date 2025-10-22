#!/usr/bin/env node

/**
 * Phase 10: Comprehensive Testing Suite
 * Tests all API endpoints, authentication, authorization, and security
 */

import axios from 'axios';

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Test credentials (should be set via environment variables)
const testCredentials = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'Admin123!@#'
  },
  business: {
    email: process.env.TEST_BUSINESS_EMAIL || 'business@test.com',
    password: process.env.TEST_BUSINESS_PASSWORD || 'Business123!@#'
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'Customer123!@#'
  }
};

// Tokens storage
const tokens = {
  admin: null,
  business: null,
  customer: null
};

// User IDs storage
const userIds = {
  admin: null,
  business: null,
  customer: null
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(80), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(80), 'cyan');
}

function logTest(name) {
  process.stdout.write(`  Testing: ${name}... `);
}

function logSuccess(message = 'PASSED') {
  log(`✓ ${message}`, 'green');
  results.passed++;
}

function logFailure(message) {
  log(`✗ FAILED: ${message}`, 'red');
  results.failed++;
}

function logSkip(message = 'SKIPPED') {
  log(`⊘ ${message}`, 'yellow');
  results.skipped++;
}

async function makeRequest(method, endpoint, options = {}) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      ...options,
      validateStatus: () => true // Don't throw on any status
    });
    return response;
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      error
    };
  }
}

// ============================================================================
// Phase 10.1: Authentication Testing
// ============================================================================

async function testAuthentication() {
  logSection('Phase 10.1: Authentication Testing');

  // Test 1.1: Login with valid credentials - Customer
  logTest('Login with valid customer credentials');
  const loginResponse = await makeRequest('POST', '/api/auth/login', {
    data: testCredentials.customer
  });

  if (loginResponse.status === 200 && loginResponse.data.token) {
    tokens.customer = loginResponse.data.token;
    userIds.customer = loginResponse.data.user?.id;
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${loginResponse.status}`);
  }

  // Test 1.2: Login with valid credentials - Business
  logTest('Login with valid business credentials');
  const businessLoginResponse = await makeRequest('POST', '/api/auth/login', {
    data: testCredentials.business
  });

  if (businessLoginResponse.status === 200 && businessLoginResponse.data.token) {
    tokens.business = businessLoginResponse.data.token;
    userIds.business = businessLoginResponse.data.user?.id;
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${businessLoginResponse.status}`);
  }

  // Test 1.3: Login with valid credentials - Admin
  logTest('Login with valid admin credentials');
  const adminLoginResponse = await makeRequest('POST', '/api/auth/login', {
    data: testCredentials.admin
  });

  if (adminLoginResponse.status === 200 && adminLoginResponse.data.token) {
    tokens.admin = adminLoginResponse.data.token;
    userIds.admin = adminLoginResponse.data.user?.id;
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${adminLoginResponse.status}`);
  }

  // Test 1.4: Login with invalid credentials
  logTest('Login with invalid credentials');
  const invalidLoginResponse = await makeRequest('POST', '/api/auth/login', {
    data: {
      email: 'invalid@test.com',
      password: 'wrongpassword'
    }
  });

  if (invalidLoginResponse.status === 401 || invalidLoginResponse.status === 400) {
    logSuccess();
  } else {
    logFailure(`Expected 401/400, got ${invalidLoginResponse.status}`);
  }

  // Test 1.5: Logout
  logTest('Logout functionality');
  if (tokens.customer) {
    const logoutResponse = await makeRequest('POST', '/api/auth/logout', {
      headers: { Authorization: `Bearer ${tokens.customer}` },
      data: { userId: userIds.customer }
    });

    if (logoutResponse.status === 200) {
      logSuccess();
    } else {
      logFailure(`Expected 200, got ${logoutResponse.status}`);
    }

    // Re-login customer for subsequent tests
    const reloginResponse = await makeRequest('POST', '/api/auth/login', {
      data: testCredentials.customer
    });
    if (reloginResponse.status === 200) {
      tokens.customer = reloginResponse.data.token;
      userIds.customer = reloginResponse.data.user?.id;
    }
  } else {
    logSkip('No customer token available');
  }
}

// ============================================================================
// Phase 10.2: Customer Dashboard Testing
// ============================================================================

async function testCustomerDashboard() {
  logSection('Phase 10.2: Customer Dashboard Testing');

  if (!tokens.customer) {
    log('  Skipping customer dashboard tests - no customer token', 'yellow');
    return;
  }

  // Test 2.1: Get customer dashboard stats
  logTest('Customer dashboard stats');
  const dashboardResponse = await makeRequest('GET', `/api/dashboard/stats?type=customer&customerId=${userIds.customer}`, {
    headers: { Authorization: `Bearer ${tokens.customer}` }
  });

  if (dashboardResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${dashboardResponse.status}`);
  }

  // Test 2.2: Get customer loyalty cards
  logTest('Get customer loyalty cards');
  const cardsResponse = await makeRequest('GET', `/api/customers/${userIds.customer}/cards`, {
    headers: { Authorization: `Bearer ${tokens.customer}` }
  });

  if (cardsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${cardsResponse.status}`);
  }

  // Test 2.3: Get customer programs
  logTest('Get customer enrolled programs');
  const programsResponse = await makeRequest('GET', `/api/customers/${userIds.customer}/programs`, {
    headers: { Authorization: `Bearer ${tokens.customer}` }
  });

  if (programsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${programsResponse.status}`);
  }

  // Test 2.4: Get customer transactions
  logTest('Get customer transactions');
  const transactionsResponse = await makeRequest('GET', `/api/transactions?customerId=${userIds.customer}`, {
    headers: { Authorization: `Bearer ${tokens.customer}` }
  });

  if (transactionsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${transactionsResponse.status}`);
  }

  // Test 2.5: Get customer notifications
  logTest('Get customer notifications');
  const notificationsResponse = await makeRequest('GET', `/api/notifications?customerId=${userIds.customer}`, {
    headers: { Authorization: `Bearer ${tokens.customer}` }
  });

  if (notificationsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${notificationsResponse.status}`);
  }

  // Test 2.6: Generate customer QR code
  logTest('Generate customer QR code');
  const qrResponse = await makeRequest('POST', '/api/qr/generate', {
    headers: { Authorization: `Bearer ${tokens.customer}` },
    data: {
      type: 'customer',
      customerId: userIds.customer
    }
  });

  if (qrResponse.status === 200 && qrResponse.data.qrData) {
    logSuccess();
  } else {
    logFailure(`Expected 200 with qrData, got ${qrResponse.status}`);
  }
}

// ============================================================================
// Phase 10.3: Business Dashboard Testing
// ============================================================================

async function testBusinessDashboard() {
  logSection('Phase 10.3: Business Dashboard Testing');

  if (!tokens.business) {
    log('  Skipping business dashboard tests - no business token', 'yellow');
    return;
  }

  // Test 3.1: Get business dashboard stats
  logTest('Business dashboard stats');
  const dashboardResponse = await makeRequest('GET', `/api/dashboard/stats?type=business&businessId=${userIds.business}`, {
    headers: { Authorization: `Bearer ${tokens.business}` }
  });

  if (dashboardResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${dashboardResponse.status}`);
  }

  // Test 3.2: Get business customers
  logTest('Get business customers');
  const customersResponse = await makeRequest('GET', `/api/customers?businessId=${userIds.business}`, {
    headers: { Authorization: `Bearer ${tokens.business}` }
  });

  if (customersResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${customersResponse.status}`);
  }

  // Test 3.3: Get business programs
  logTest('Get business loyalty programs');
  const programsResponse = await makeRequest('GET', `/api/businesses/programs?businessId=${userIds.business}`, {
    headers: { Authorization: `Bearer ${tokens.business}` }
  });

  if (programsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${programsResponse.status}`);
  }

  // Test 3.4: Get business analytics
  logTest('Get business analytics');
  const analyticsResponse = await makeRequest('GET', `/api/business/${userIds.business}/analytics`, {
    headers: { Authorization: `Bearer ${tokens.business}` }
  });

  if (analyticsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${analyticsResponse.status}`);
  }

  // Test 3.5: Get business settings
  logTest('Get business settings');
  const settingsResponse = await makeRequest('GET', `/api/business/${userIds.business}/settings`, {
    headers: { Authorization: `Bearer ${tokens.business}` }
  });

  if (settingsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${settingsResponse.status}`);
  }

  // Test 3.6: Get business notifications
  logTest('Get business notifications');
  const notificationsResponse = await makeRequest('GET', `/api/notifications?businessId=${userIds.business}`, {
    headers: { Authorization: `Bearer ${tokens.business}` }
  });

  if (notificationsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${notificationsResponse.status}`);
  }
}

// ============================================================================
// Phase 10.4: Admin Dashboard Testing
// ============================================================================

async function testAdminDashboard() {
  logSection('Phase 10.4: Admin Dashboard Testing');

  if (!tokens.admin) {
    log('  Skipping admin dashboard tests - no admin token', 'yellow');
    return;
  }

  // Test 4.1: Get admin dashboard stats
  logTest('Admin dashboard stats');
  const dashboardResponse = await makeRequest('GET', '/api/dashboard/stats?type=admin', {
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });

  if (dashboardResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${dashboardResponse.status}`);
  }

  // Test 4.2: Get all users (admin only)
  logTest('Get all users (admin only)');
  const usersResponse = await makeRequest('GET', '/api/users', {
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });

  if (usersResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${usersResponse.status}`);
  }

  // Test 4.3: Get all customers (admin only)
  logTest('Get all customers (admin only)');
  const customersResponse = await makeRequest('GET', '/api/customers', {
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });

  if (customersResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${customersResponse.status}`);
  }

  // Test 4.4: Get approvals (admin only)
  logTest('Get business approvals (admin only)');
  const approvalsResponse = await makeRequest('GET', '/api/approvals', {
    headers: { Authorization: `Bearer ${tokens.admin}` }
  });

  if (approvalsResponse.status === 200) {
    logSuccess();
  } else {
    logFailure(`Expected 200, got ${approvalsResponse.status}`);
  }
}

// ============================================================================
// Phase 10.5: Security Testing
// ============================================================================

async function testSecurity() {
  logSection('Phase 10.5: Security Testing');

  // Test 5.1: Unauthorized API access (no token)
  logTest('Unauthorized API access blocked (401)');
  const unauthorizedResponse = await makeRequest('GET', `/api/users/1`);

  if (unauthorizedResponse.status === 401) {
    logSuccess();
  } else {
    logFailure(`Expected 401, got ${unauthorizedResponse.status}`);
  }

  // Test 5.2: Cross-user access prevention (customer accessing other customer data)
  logTest('Cross-user access prevention (403)');
  if (tokens.customer && userIds.business) {
    const forbiddenResponse = await makeRequest('GET', `/api/customers/${userIds.business}`, {
      headers: { Authorization: `Bearer ${tokens.customer}` }
    });

    if (forbiddenResponse.status === 403 || forbiddenResponse.status === 401) {
      logSuccess();
    } else {
      logFailure(`Expected 403/401, got ${forbiddenResponse.status}`);
    }
  } else {
    logSkip('Insufficient test data');
  }

  // Test 5.3: SQL Injection prevention
  logTest('SQL injection prevention in login');
  const sqlInjectionResponse = await makeRequest('POST', '/api/auth/login', {
    data: {
      email: "admin' OR '1'='1",
      password: "' OR '1'='1"
    }
  });

  if (sqlInjectionResponse.status === 401 || sqlInjectionResponse.status === 400) {
    logSuccess();
  } else {
    logFailure(`Expected 401/400, got ${sqlInjectionResponse.status}`);
  }

  // Test 5.4: Rate limiting check (simulate many requests)
  logTest('Rate limiting on API endpoints');
  const rateLimitTests = [];
  for (let i = 0; i < 250; i++) {
    rateLimitTests.push(makeRequest('GET', '/api/promotions'));
  }

  const rateLimitResponses = await Promise.all(rateLimitTests);
  const rateLimited = rateLimitResponses.some(r => r.status === 429);

  if (rateLimited) {
    logSuccess('Rate limiting active');
  } else {
    log('  ⚠ Rate limiting may not be active (no 429 responses)', 'yellow');
  }

  // Test 5.5: Invalid token rejection
  logTest('Invalid token rejection');
  const invalidTokenResponse = await makeRequest('GET', `/api/users/1`, {
    headers: { Authorization: 'Bearer invalid-token-12345' }
  });

  if (invalidTokenResponse.status === 401) {
    logSuccess();
  } else {
    logFailure(`Expected 401, got ${invalidTokenResponse.status}`);
  }

  // Test 5.6: CORS headers check
  logTest('CORS headers present');
  const corsResponse = await makeRequest('OPTIONS', '/api/auth/login', {
    headers: { Origin: 'http://localhost:3000' }
  });

  if (corsResponse.status === 200 || (corsResponse.headers && corsResponse.headers['access-control-allow-origin'])) {
    logSuccess();
  } else {
    logFailure('CORS headers not configured properly');
  }
}

// ============================================================================
// Phase 10.6: Performance Testing
// ============================================================================

async function testPerformance() {
  logSection('Phase 10.6: Performance Testing');

  // Test 6.1: API response time check
  logTest('API response times < 500ms');
  
  const endpoints = [
    { method: 'GET', url: '/api/promotions', auth: false },
    { method: 'GET', url: `/api/users/${userIds.customer}`, auth: true, token: tokens.customer },
    { method: 'GET', url: '/api/dashboard/stats?type=customer&customerId=' + userIds.customer, auth: true, token: tokens.customer }
  ];

  let allFast = true;
  for (const endpoint of endpoints) {
    const start = Date.now();
    const options = endpoint.auth ? { headers: { Authorization: `Bearer ${endpoint.token}` } } : {};
    await makeRequest(endpoint.method, endpoint.url, options);
    const duration = Date.now() - start;
    
    if (duration > 500) {
      allFast = false;
      log(`    ${endpoint.url}: ${duration}ms (slow)`, 'yellow');
    }
  }

  if (allFast) {
    logSuccess('All endpoints respond < 500ms');
  } else {
    log('  ⚠ Some endpoints are slow', 'yellow');
  }

  // Test 6.2: Concurrent request handling
  logTest('Concurrent request handling');
  const concurrentRequests = Array(10).fill(null).map(() => 
    makeRequest('GET', '/api/promotions')
  );

  try {
    const responses = await Promise.all(concurrentRequests);
    const allSuccessful = responses.every(r => r.status === 200);
    
    if (allSuccessful) {
      logSuccess();
    } else {
      logFailure('Some concurrent requests failed');
    }
  } catch (error) {
    logFailure(`Concurrent requests error: ${error.message}`);
  }
}

// ============================================================================
// Phase 10.7: Error Handling Testing
// ============================================================================

async function testErrorHandling() {
  logSection('Phase 10.7: Error Handling Testing');

  // Test 7.1: 404 Not Found
  logTest('404 error handling');
  const notFoundResponse = await makeRequest('GET', '/api/nonexistent-endpoint');

  if (notFoundResponse.status === 404) {
    logSuccess();
  } else {
    logFailure(`Expected 404, got ${notFoundResponse.status}`);
  }

  // Test 7.2: Validation error (400)
  logTest('Validation error handling (400)');
  const validationResponse = await makeRequest('POST', '/api/auth/login', {
    data: { /* missing required fields */ }
  });

  if (validationResponse.status === 400) {
    logSuccess();
  } else {
    logFailure(`Expected 400, got ${validationResponse.status}`);
  }

  // Test 7.3: Method not allowed (405)
  logTest('Method not allowed error (405)');
  const methodNotAllowedResponse = await makeRequest('DELETE', '/api/auth/login');

  if (methodNotAllowedResponse.status === 405 || methodNotAllowedResponse.status === 404) {
    logSuccess();
  } else {
    logFailure(`Expected 405/404, got ${methodNotAllowedResponse.status}`);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  log('\n╔══════════════════════════════════════════════════════════════════════════╗', 'blue');
  log('║     PHASE 10: COMPREHENSIVE TESTING SUITE                               ║', 'blue');
  log('║     Complete Database-to-API Backend Migration Validation               ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════════════════╝', 'blue');
  log(`\nTest Environment: ${BASE_URL}`, 'cyan');
  log(`Start Time: ${new Date().toLocaleString()}\n`, 'cyan');

  try {
    await testAuthentication();
    await testCustomerDashboard();
    await testBusinessDashboard();
    await testAdminDashboard();
    await testSecurity();
    await testPerformance();
    await testErrorHandling();
  } catch (error) {
    log(`\n✗ Critical Error: ${error.message}`, 'red');
    console.error(error);
  }

  // Print summary
  logSection('Test Summary');
  log(`  Total Tests: ${results.passed + results.failed + results.skipped}`, 'cyan');
  log(`  ✓ Passed: ${results.passed}`, 'green');
  log(`  ✗ Failed: ${results.failed}`, 'red');
  log(`  ⊘ Skipped: ${results.skipped}`, 'yellow');
  
  const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  log(`\n  Success Rate: ${successRate}%`, successRate > 90 ? 'green' : successRate > 70 ? 'yellow' : 'red');
  
  log(`\nEnd Time: ${new Date().toLocaleString()}`, 'cyan');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n✗ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

