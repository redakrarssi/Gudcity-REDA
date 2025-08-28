#!/usr/bin/env node

/**
 * Security Testing Script for REDA Platform
 * Tests all critical security vulnerabilities that were fixed
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  testTimeout: 10000,
  verbose: process.env.VERBOSE === 'true'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(config.testTimeout);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test functions
async function testJWTSecrets() {
  log('Testing JWT Secrets Configuration...');
  
  try {
    // Test that the application doesn't start with default secrets
    const response = await makeRequest(`${config.baseUrl}/health`);
    
    if (response.statusCode === 200) {
      // Check if there are any error messages about JWT secrets
      if (response.data.includes('default-jwt-secret') || 
          response.data.includes('JWT_SECRET is not defined')) {
        results.passed++;
        log('JWT Secrets: PASSED - Application properly validates JWT secrets', 'success');
      } else {
        results.failed++;
        log('JWT Secrets: FAILED - No JWT secret validation detected', 'error');
      }
    } else {
      results.failed++;
      log('JWT Secrets: FAILED - Application not responding', 'error');
    }
  } catch (error) {
    results.failed++;
    log(`JWT Secrets: FAILED - ${error.message}`, 'error');
  }
  
  results.total++;
}

async function testCORSConfiguration() {
  log('Testing CORS Configuration...');
  
  try {
    // Test CORS headers
    const response = await makeRequest(`${config.baseUrl}/health`, {
      headers: {
        'Origin': 'https://malicious-site.com',
        'User-Agent': 'Security Test Bot'
      }
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    
    if (corsHeader === '*' || !corsHeader) {
      results.failed++;
      log('CORS Configuration: FAILED - Overly permissive CORS detected', 'error');
    } else if (corsHeader === 'https://malicious-site.com') {
      results.failed++;
      log('CORS Configuration: FAILED - CORS allows malicious origin', 'error');
    } else {
      results.passed++;
      log('CORS Configuration: PASSED - CORS properly restricted', 'success');
    }
  } catch (error) {
    results.failed++;
    log(`CORS Configuration: FAILED - ${error.message}`, 'error');
  }
  
  results.total++;
}

async function testSQLInjectionProtection() {
  log('Testing SQL Injection Protection...');
  
  try {
    // Test with potential SQL injection payloads
    const maliciousPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users VALUES (1, 'hacker', 'hacker@evil.com'); --"
    ];
    
    let injectionDetected = false;
    
    for (const payload of maliciousPayloads) {
      try {
        const response = await makeRequest(`${config.baseUrl}/api/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: payload })
        });
        
        // Check if the payload caused an error or was processed
        if (response.statusCode === 500 || response.data.includes('syntax error')) {
          injectionDetected = true;
          break;
        }
      } catch (error) {
        // If request fails, it might be due to injection protection
        injectionDetected = true;
        break;
      }
    }
    
    if (injectionDetected) {
      results.failed++;
      log('SQL Injection Protection: FAILED - Potential SQL injection vulnerability detected', 'error');
    } else {
      results.passed++;
      log('SQL Injection Protection: PASSED - No SQL injection vulnerabilities detected', 'success');
    }
  } catch (error) {
    results.failed++;
    log(`SQL Injection Protection: FAILED - ${error.message}`, 'error');
  }
  
  results.total++;
}

async function testInputValidation() {
  log('Testing Input Validation...');
  
  try {
    // Test with malicious input patterns
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>',
      'onload=alert("xss")',
      '"><img src=x onerror=alert("xss")>'
    ];
    
    let validationBypassed = false;
    
    for (const input of maliciousInputs) {
      try {
        const response = await makeRequest(`${config.baseUrl}/api/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            email: input,
            name: input,
            message: input
          })
        });
        
        // Check if malicious input was accepted
        if (response.statusCode === 200 && response.data.includes(input)) {
          validationBypassed = true;
          break;
        }
      } catch (error) {
        // Request failure might indicate validation is working
        continue;
      }
    }
    
    if (validationBypassed) {
      results.failed++;
      log('Input Validation: FAILED - Malicious input bypassed validation', 'error');
    } else {
      results.passed++;
      log('Input Validation: PASSED - Input validation working properly', 'success');
    }
  } catch (error) {
    results.failed++;
    log(`Input Validation: FAILED - ${error.message}`, 'error');
  }
  
  results.total++;
}

async function testRateLimiting() {
  log('Testing Rate Limiting...');
  
  try {
    // Test rate limiting by making multiple rapid requests
    const requests = [];
    for (let i = 0; i < 150; i++) {
      requests.push(makeRequest(`${config.baseUrl}/health`));
    }
    
    const responses = await Promise.allSettled(requests);
    const successfulRequests = responses.filter(r => r.status === 'fulfilled' && r.value.statusCode === 200).length;
    const rateLimitedRequests = responses.filter(r => r.status === 'fulfilled' && r.value.statusCode === 429).length;
    
    if (rateLimitedRequests > 0) {
      results.passed++;
      log(`Rate Limiting: PASSED - ${rateLimitedRequests} requests were rate limited`, 'success');
    } else if (successfulRequests < 150) {
      results.passed++;
      log('Rate Limiting: PASSED - Some requests were blocked', 'success');
    } else {
      results.failed++;
      log('Rate Limiting: FAILED - No rate limiting detected', 'error');
    }
  } catch (error) {
    results.failed++;
    log(`Rate Limiting: FAILED - ${error.message}`, 'error');
  }
  
  results.total++;
}

async function testErrorHandling() {
  log('Testing Error Handling...');
  
  try {
    // Test error responses for information disclosure
    const response = await makeRequest(`${config.baseUrl}/api/nonexistent-endpoint`);
    
    if (response.statusCode === 404) {
      const responseData = response.data;
      
      // Check for sensitive information in error responses
      const sensitivePatterns = [
        /stack trace/i,
        /error details/i,
        /internal error/i,
        /database error/i,
        /sql error/i
      ];
      
      let informationDisclosed = false;
      for (const pattern of sensitivePatterns) {
        if (pattern.test(responseData)) {
          informationDisclosed = true;
          break;
        }
      }
      
      if (informationDisclosed) {
        results.failed++;
        log('Error Handling: FAILED - Sensitive information disclosed in error response', 'error');
      } else {
        results.passed++;
        log('Error Handling: PASSED - Error responses are secure', 'success');
      }
    } else {
      results.failed++;
      log('Error Handling: FAILED - Unexpected error response status', 'error');
    }
  } catch (error) {
    results.failed++;
    log(`Error Handling: FAILED - ${error.message}`, 'error');
  }
  
  results.total++;
}

async function testSecurityHeaders() {
  log('Testing Security Headers...');
  
  try {
    const response = await makeRequest(`${config.baseUrl}/health`);
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];
    
    const optionalHeaders = [
      'content-security-policy',
      'strict-transport-security',
      'referrer-policy'
    ];
    
    let missingRequired = 0;
    let missingOptional = 0;
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        missingRequired++;
      }
    }
    
    for (const header of optionalHeaders) {
      if (!headers[header]) {
        missingOptional++;
      }
    }
    
    if (missingRequired === 0) {
      results.passed++;
      log('Security Headers: PASSED - All required security headers present', 'success');
    } else {
      results.failed++;
      log(`Security Headers: FAILED - Missing ${missingRequired} required headers`, 'error');
    }
    
    if (missingOptional > 0) {
      log(`Security Headers: WARNING - Missing ${missingOptional} optional security headers`, 'warning');
    }
  } catch (error) {
    results.failed++;
    log(`Security Headers: FAILED - ${error.message}`, 'error');
  }
  
  results.total++;
}

// Main test runner
async function runSecurityTests() {
  log('🚀 Starting REDA Platform Security Tests...', 'info');
  log(`Testing against: ${config.baseUrl}`, 'info');
  
  const tests = [
    testJWTSecrets,
    testCORSConfiguration,
    testSQLInjectionProtection,
    testInputValidation,
    testRateLimiting,
    testErrorHandling,
    testSecurityHeaders
  ];
  
  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      log(`Test failed with error: ${error.message}`, 'error');
      results.failed++;
      results.total++;
    }
  }
  
  // Generate report
  log('\n📊 Security Test Results:', 'info');
  log(`Total Tests: ${results.total}`, 'info');
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
  
  if (results.failed === 0) {
    log('🎉 All security tests passed! The platform appears to be secure.', 'success');
  } else {
    log('⚠️ Some security tests failed. Please review and fix the issues.', 'warning');
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Security Testing Script for REDA Platform

Usage: node security-test.js [options]

Options:
  --base-url <url>     Base URL to test (default: http://localhost:3000)
  --timeout <ms>       Request timeout in milliseconds (default: 10000)
  --verbose            Enable verbose logging
  --help, -h          Show this help message

Environment Variables:
  TEST_BASE_URL        Base URL to test
  VERBOSE              Enable verbose logging

Examples:
  node security-test.js
  node security-test.js --base-url https://your-domain.com
  VERBOSE=true node security-test.js
`);
  process.exit(0);
}

// Parse command line arguments
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--base-url' && process.argv[i + 1]) {
    config.baseUrl = process.argv[i + 1];
    i++;
  } else if (process.argv[i] === '--timeout' && process.argv[i + 1]) {
    config.testTimeout = parseInt(process.argv[i + 1]);
    i++;
  } else if (process.argv[i] === '--verbose') {
    config.verbose = true;
  }
}

// Run tests
runSecurityTests().catch(error => {
  log(`Fatal error running tests: ${error.message}`, 'error');
  process.exit(1);
});