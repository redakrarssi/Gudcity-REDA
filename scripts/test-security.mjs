#!/usr/bin/env node

/**
 * Security Testing Script
 * Tests all security measures implemented in the GudCity Loyalty Platform
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'cyan');
  console.log('='.repeat(60));
}

function logSection(message) {
  console.log('\n' + '-'.repeat(40));
  log(message, 'blue');
  console.log('-'.repeat(40));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'white');
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  total: 0
};

function runTest(testName, testFunction) {
  testResults.total++;
  try {
    const result = testFunction();
    if (result === true) {
      logSuccess(`${testName}`);
      testResults.passed++;
    } else if (result === 'warning') {
      logWarning(`${testName}`);
      testResults.warnings++;
    } else {
      logError(`${testName}`);
      testResults.failed++;
    }
  } catch (error) {
    logError(`${testName} - Error: ${error.message}`);
    testResults.failed++;
  }
}

// Security Tests
function testJWTSecrets() {
  logSection('Testing JWT Secret Configuration');
  
  // Check if .env file exists
  const envPath = join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    logWarning('No .env file found - using environment variables');
    return 'warning';
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for default JWT secrets
  if (envContent.includes('default-jwt-secret-change-in-production')) {
    logError('Default JWT secret found in .env file');
    return false;
  }
  
  // Check for JWT secret variables
  if (!envContent.includes('VITE_JWT_SECRET=')) {
    logError('VITE_JWT_SECRET not found in .env file');
    return false;
  }
  
  if (!envContent.includes('VITE_JWT_REFRESH_SECRET=')) {
    logError('VITE_JWT_REFRESH_SECRET not found in .env file');
    return false;
  }
  
  logSuccess('JWT secrets properly configured');
  return true;
}

function testDatabaseCredentials() {
  logSection('Testing Database Credential Security');
  
  // Check for hardcoded credentials in source files
  const sourceDir = join(__dirname, '..', 'src');
  const scriptDir = join(__dirname, '..');
  
  const hardcodedPattern = /neondb_owner:npg_rpc6Nh5oKGzt/;
  
  // Check source files
  function checkDirectory(dir, excludePatterns = []) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = join(dir, file.name);
      
      if (file.isDirectory()) {
        checkDirectory(fullPath, excludePatterns);
      } else if (file.isFile() && file.name.endsWith('.ts') || file.name.endsWith('.js')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (hardcodedPattern.test(content)) {
            logError(`Hardcoded credentials found in: ${fullPath}`);
            return false;
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
    return true;
  }
  
  const sourceResult = checkDirectory(sourceDir);
  const scriptResult = checkDirectory(scriptDir, ['node_modules', '.git']);
  
  if (sourceResult && scriptResult) {
    logSuccess('No hardcoded database credentials found in source code');
    return true;
  }
  
  return false;
}

function testCORSConfiguration() {
  logSection('Testing CORS Configuration');
  
  const corsFile = join(__dirname, '..', 'src', 'utils', 'corsPolyfill.ts');
  const serverFile = join(__dirname, '..', 'src', 'server.ts');
  
  try {
    const corsContent = fs.readFileSync(corsFile, 'utf8');
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    
    // Check for wildcard CORS origins
    if (corsContent.includes("origin = '*'")) {
      logError('Wildcard CORS origin found in corsPolyfill.ts');
      return false;
    }
    
    if (serverContent.includes("origin: '*'")) {
      logError('Wildcard CORS origin found in server.ts');
      return false;
    }
    
    // Check for restrictive CORS configuration
    if (corsContent.includes('defaultOrigin') && corsContent.includes('process.env.NODE_ENV')) {
      logSuccess('Environment-aware CORS configuration found');
    } else {
      logWarning('CORS configuration may not be environment-aware');
      return 'warning';
    }
    
    return true;
  } catch (error) {
    logError(`Error reading CORS configuration: ${error.message}`);
    return false;
  }
}

function testRateLimiting() {
  logSection('Testing Rate Limiting Configuration');
  
  const rateLimitFile = join(__dirname, '..', 'src', 'utils', 'rateLimitPolyfill.ts');
  
  try {
    const content = fs.readFileSync(rateLimitFile, 'utf8');
    
    // Check for enhanced rate limiting features
    const checks = [
      { name: 'Redis support', pattern: /RedisStore/, found: false },
      { name: 'IP validation', pattern: /extractClientIP/, found: false },
      { name: 'Memory exhaustion protection', pattern: /maxKeys/, found: false },
      { name: 'Enhanced key generation', pattern: /rate_limit:/, found: false }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        check.found = true;
      }
    });
    
    const passedChecks = checks.filter(c => c.found).length;
    
    if (passedChecks === checks.length) {
      logSuccess('Enhanced rate limiting features found');
      return true;
    } else if (passedChecks >= 2) {
      logWarning(`Rate limiting partially enhanced (${passedChecks}/${checks.length})`);
      return 'warning';
    } else {
      logError('Rate limiting not properly enhanced');
      return false;
    }
  } catch (error) {
    logError(`Error reading rate limiting configuration: ${error.message}`);
    return false;
  }
}

function testInputValidation() {
  logSection('Testing Input Validation Security');
  
  const sqlSafetyFile = join(__dirname, '..', 'src', 'utils', 'sqlSafety.ts');
  
  try {
    const content = fs.readFileSync(sqlSafetyFile, 'utf8');
    
    // Check for enhanced validation features
    const checks = [
      { name: 'Enhanced business ID validation', pattern: /Number\.MAX_SAFE_INTEGER/, found: false },
      { name: 'Enhanced email validation', pattern: /emailRegex/, found: false },
      { name: 'Database identifier sanitization', pattern: /reservedKeywords/, found: false },
      { name: 'Enhanced string sanitization', pattern: /MAX_STRING_LENGTH/, found: false }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        check.found = true;
      }
    });
    
    const passedChecks = checks.filter(c => c.found).length;
    
    if (passedChecks === checks.length) {
      logSuccess('Enhanced input validation features found');
      return true;
    } else if (passedChecks >= 2) {
      logWarning(`Input validation partially enhanced (${passedChecks}/${checks.length})`);
      return 'warning';
    } else {
      logError('Input validation not properly enhanced');
      return false;
    }
  } catch (error) {
    logError(`Error reading input validation configuration: ${error.message}`);
    return false;
  }
}

function testErrorHandling() {
  logSection('Testing Error Handling Security');
  
  const errorFile = join(__dirname, '..', 'src', 'utils', 'secureErrorResponse.ts');
  
  try {
    const content = fs.readFileSync(errorFile, 'utf8');
    
    // Check for enhanced error handling features
    const checks = [
      { name: 'Error message sanitization', pattern: /sanitizeErrorMessage/, found: false },
      { name: 'Error type sanitization', pattern: /sanitizeErrorType/, found: false },
      { name: 'Log context sanitization', pattern: /sanitizeLogContext/, found: false },
      { name: 'Environment detection', pattern: /isDevelopmentEnvironment/, found: false }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        check.found = true;
      }
    });
    
    const passedChecks = checks.filter(c => c.found).length;
    
    if (passedChecks === checks.length) {
      logSuccess('Enhanced error handling features found');
      return true;
    } else if (passedChecks >= 2) {
      logWarning(`Error handling partially enhanced (${passedChecks}/${checks.length})`);
      return 'warning';
    } else {
      logError('Error handling not properly enhanced');
      return false;
    }
  } catch (error) {
    logError(`Error reading error handling configuration: ${error.message}`);
    return false;
  }
}

function testPasswordPolicy() {
  logSection('Testing Password Policy Security');
  
  const authFile = join(__dirname, '..', 'src', 'services', 'authService.ts');
  
  try {
    const content = fs.readFileSync(authFile, 'utf8');
    
    // Check for enhanced password policy features
    const checks = [
      { name: 'Password validation function', pattern: /validatePassword/, found: false },
      { name: 'Complexity requirements', pattern: /REQUIRE_LOWERCASE|REQUIRE_UPPERCASE/, found: false },
      { name: 'Common password blocking', pattern: /commonPasswords/, found: false },
      { name: 'Account lockout', pattern: /lockedUntil/, found: false }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        check.found = true;
      }
    });
    
    const passedChecks = checks.filter(c => c.found).length;
    
    if (passedChecks === checks.length) {
      logSuccess('Enhanced password policy features found');
      return true;
    } else if (passedChecks >= 2) {
      logWarning(`Password policy partially enhanced (${passedChecks}/${checks.length})`);
      return 'warning';
    } else {
      logError('Password policy not properly enhanced');
      return false;
    }
  } catch (error) {
    logError(`Error reading password policy configuration: ${error.message}`);
    return false;
  }
}

function testSecurityHeaders() {
  logSection('Testing Security Headers Configuration');
  
  const helmetFile = join(__dirname, '..', 'src', 'utils', 'helmetPolyfill.ts');
  
  try {
    const content = fs.readFileSync(helmetFile, 'utf8');
    
    // Check for enhanced security headers
    const checks = [
      { name: 'Content Security Policy', pattern: /Content-Security-Policy/, found: false },
      { name: 'XSS Protection', pattern: /X-XSS-Protection/, found: false },
      { name: 'Cross-Origin Policies', pattern: /Cross-Origin-Embedder-Policy/, found: false },
      { name: 'Permissions Policy', pattern: /Permissions-Policy/, found: false }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        check.found = true;
      }
    });
    
    const passedChecks = checks.filter(c => c.found).length;
    
    if (passedChecks === checks.length) {
      logSuccess('Enhanced security headers found');
      return true;
    } else if (passedChecks >= 2) {
      logWarning(`Security headers partially enhanced (${passedChecks}/${checks.length})`);
      return 'warning';
    } else {
      logError('Security headers not properly enhanced');
      return false;
    }
  } catch (error) {
    logError(`Error reading security headers configuration: ${error.message}`);
    return false;
  }
}

function testEnvironmentValidation() {
  logSection('Testing Environment Validation');
  
  const validationFile = join(__dirname, '..', 'src', 'utils', 'validateEnvironment.ts');
  
  try {
    const content = fs.readFileSync(validationFile, 'utf8');
    
    // Check for environment validation features
    const checks = [
      { name: 'Security validation function', pattern: /validateSecurityEnvironment/, found: false },
      { name: 'Startup safety check', pattern: /canStartSafely/, found: false },
      { name: 'Security status reporting', pattern: /getSecurityStatus/, found: false },
      { name: 'Critical issues detection', pattern: /criticalIssues/, found: false }
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(content)) {
        check.found = true;
      }
    });
    
    const passedChecks = checks.filter(c => c.found).length;
    
    if (passedChecks === checks.length) {
      logSuccess('Environment validation features found');
      return true;
    } else if (passedChecks >= 2) {
      logWarning(`Environment validation partially implemented (${passedChecks}/${checks.length})`);
      return 'warning';
    } else {
      logError('Environment validation not properly implemented');
      return false;
    }
  } catch (error) {
    logError(`Error reading environment validation configuration: ${error.message}`);
    return false;
  }
}

// Main test execution
async function runSecurityTests() {
  logHeader('GudCity Loyalty Platform - Security Test Suite');
  logInfo('Running comprehensive security tests...\n');
  
  // Run all security tests
  runTest('JWT Secret Configuration', testJWTSecrets);
  runTest('Database Credential Security', testDatabaseCredentials);
  runTest('CORS Configuration', testCORSConfiguration);
  runTest('Rate Limiting Security', testRateLimiting);
  runTest('Input Validation Security', testInputValidation);
  runTest('Error Handling Security', testErrorHandling);
  runTest('Password Policy Security', testPasswordPolicy);
  runTest('Security Headers Configuration', testSecurityHeaders);
  runTest('Environment Validation', testEnvironmentValidation);
  
  // Test results summary
  logHeader('Security Test Results Summary');
  
  logInfo(`Total Tests: ${testResults.total}`);
  logSuccess(`Passed: ${testResults.passed}`);
  logWarning(`Warnings: ${testResults.warnings}`);
  logError(`Failed: ${testResults.failed}`);
  
  // Calculate security score
  const score = Math.round((testResults.passed / testResults.total) * 100);
  
  if (score >= 90) {
    logSuccess(`Security Score: ${score}/100 - EXCELLENT`);
  } else if (score >= 80) {
    logWarning(`Security Score: ${score}/100 - GOOD`);
  } else if (score >= 70) {
    logWarning(`Security Score: ${score}/100 - FAIR`);
  } else {
    logError(`Security Score: ${score}/100 - POOR - IMMEDIATE ACTION REQUIRED`);
  }
  
  // Recommendations
  if (testResults.failed > 0) {
    logHeader('🚨 CRITICAL SECURITY ISSUES DETECTED');
    logError('Fix all failed tests before deployment');
    logError('Review security documentation for guidance');
  }
  
  if (testResults.warnings > 0) {
    logHeader('⚠️ SECURITY WARNINGS');
    logWarning('Address warnings to improve security posture');
    logWarning('Consider implementing recommended security measures');
  }
  
  if (testResults.failed === 0 && testResults.warnings === 0) {
    logHeader('🎉 ALL SECURITY TESTS PASSED');
    logSuccess('Platform is ready for production deployment');
    logSuccess('Continue monitoring and regular security updates');
  }
  
  // Exit with appropriate code
  if (testResults.failed > 0) {
    process.exit(1);
  } else if (testResults.warnings > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  });
}

export { runSecurityTests };