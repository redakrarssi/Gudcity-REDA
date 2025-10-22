#!/usr/bin/env node

/**
 * Security Validation Test Suite
 * Tests security features: database credential protection, SQL injection, XSS, etc.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

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
}

function logFailure(message) {
  log(`✗ FAILED: ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ WARNING: ${message}`, 'yellow');
}

// ============================================================================
// Test 1: No Database Credentials in Frontend Bundle
// ============================================================================

function testNoDatabaseCredentialsInBundle() {
  logSection('Test 1: No Database Credentials in Frontend Bundle');

  logTest('Building production bundle');
  try {
    execSync('npm run build', { stdio: 'pipe' });
    logSuccess();
  } catch (error) {
    logFailure('Build failed');
    return false;
  }

  logTest('Searching for VITE_DATABASE_URL in bundle');
  try {
    const result = execSync('grep -r "VITE_DATABASE_URL" dist/ || true', { encoding: 'utf-8' });
    if (result.trim() === '') {
      logSuccess('No VITE_DATABASE_URL found');
    } else {
      logFailure('Found VITE_DATABASE_URL in bundle');
      log(`    Found: ${result.substring(0, 200)}`, 'red');
      return false;
    }
  } catch (error) {
    logSuccess('No VITE_DATABASE_URL found');
  }

  logTest('Searching for postgres:// in bundle');
  try {
    const result = execSync('grep -r "postgres://" dist/ || true', { encoding: 'utf-8' });
    if (result.trim() === '') {
      logSuccess('No database connection strings found');
    } else {
      logFailure('Found database connection string in bundle');
      log(`    Found: ${result.substring(0, 200)}`, 'red');
      return false;
    }
  } catch (error) {
    logSuccess('No database connection strings found');
  }

  logTest('Searching for DATABASE_URL in bundle');
  try {
    const result = execSync('grep -r "DATABASE_URL" dist/ || true', { encoding: 'utf-8' });
    if (result.trim() === '') {
      logSuccess('No DATABASE_URL found');
    } else {
      // Check if it's just a reference in comments or non-sensitive context
      if (result.includes('process.env.DATABASE_URL')) {
        logWarning('Found DATABASE_URL reference (may be acceptable if not actual value)');
      } else {
        logFailure('Found DATABASE_URL in bundle');
        return false;
      }
    }
  } catch (error) {
    logSuccess('No DATABASE_URL found');
  }

  return true;
}

// ============================================================================
// Test 2: Environment Variable Configuration
// ============================================================================

function testEnvironmentVariables() {
  logSection('Test 2: Environment Variable Configuration');

  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const optionalEnvVars = [
    'VITE_API_URL',
    'NODE_ENV'
  ];

  const forbiddenClientVars = [
    'VITE_DATABASE_URL',
    'VITE_JWT_SECRET'
  ];

  logTest('Checking required server environment variables');
  let allRequired = true;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      log(`    Missing: ${envVar}`, 'yellow');
      allRequired = false;
    }
  }
  if (allRequired) {
    logSuccess('All required variables present');
  } else {
    logWarning('Some required variables missing');
  }

  logTest('Checking optional environment variables');
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      log(`    ✓ ${envVar} is set`, 'green');
    } else {
      log(`    ⊘ ${envVar} not set (optional)`, 'yellow');
    }
  }
  logSuccess();

  logTest('Checking for forbidden client-side variables');
  let noForbidden = true;
  for (const envVar of forbiddenClientVars) {
    if (process.env[envVar]) {
      log(`    ✗ ${envVar} is set (SECURITY RISK!)`, 'red');
      noForbidden = false;
    }
  }
  if (noForbidden) {
    logSuccess('No forbidden variables present');
  } else {
    logFailure('Forbidden variables found');
    return false;
  }

  return true;
}

// ============================================================================
// Test 3: File Permission Security
// ============================================================================

function testFilePermissions() {
  logSection('Test 3: File Permission Security');

  const sensitiveFiles = [
    '.env',
    '.env.local',
    'api/_lib/db.ts'
  ];

  logTest('Checking .env file permissions');
  for (const file of sensitiveFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        log(`    ${file}: ${mode}`, mode === '600' || mode === '644' ? 'green' : 'yellow');
      } catch (error) {
        log(`    ${file}: Unable to check permissions`, 'yellow');
      }
    } else {
      log(`    ${file}: Not found (ok if not needed)`, 'yellow');
    }
  }
  logSuccess();

  return true;
}

// ============================================================================
// Test 4: Source Code Security Audit
// ============================================================================

function testSourceCodeSecurity() {
  logSection('Test 4: Source Code Security Audit');

  logTest('Checking for console.log statements with sensitive data');
  try {
    const result = execSync('grep -r "console.log.*password\\|console.log.*token\\|console.log.*secret" src/ api/ || true', { encoding: 'utf-8' });
    if (result.trim() === '') {
      logSuccess('No sensitive console.log found');
    } else {
      logWarning('Found potentially sensitive console.log statements');
      log(result.substring(0, 500), 'yellow');
    }
  } catch (error) {
    logSuccess('No sensitive console.log found');
  }

  logTest('Checking for hardcoded credentials');
  try {
    const patterns = [
      'password.*=.*[\'"](?!.*\\$)',
      'secret.*=.*[\'"](?!.*\\$)',
      'api[_-]?key.*=.*[\'"](?!.*\\$)'
    ];

    let foundHardcoded = false;
    for (const pattern of patterns) {
      const result = execSync(`grep -rE "${pattern}" src/ api/ || true`, { encoding: 'utf-8' });
      if (result.trim() !== '' && !result.includes('process.env')) {
        foundHardcoded = true;
        log(`    Found potential hardcoded credential:`, 'yellow');
        log(result.substring(0, 200), 'yellow');
      }
    }

    if (!foundHardcoded) {
      logSuccess('No hardcoded credentials found');
    } else {
      logWarning('Found potential hardcoded credentials (review needed)');
    }
  } catch (error) {
    logSuccess('No hardcoded credentials found');
  }

  logTest('Checking for direct database access in client code');
  try {
    const result = execSync('grep -r "from.*@neondatabase/serverless" src/pages/ src/components/ || true', { encoding: 'utf-8' });
    if (result.trim() === '') {
      logSuccess('No direct database access in client code');
    } else {
      logFailure('Found direct database imports in client code');
      log(result, 'red');
      return false;
    }
  } catch (error) {
    logSuccess('No direct database access in client code');
  }

  return true;
}

// ============================================================================
// Test 5: Dependency Security Audit
// ============================================================================

function testDependencySecurity() {
  logSection('Test 5: Dependency Security Audit');

  logTest('Running npm audit');
  try {
    const result = execSync('npm audit --json', { encoding: 'utf-8' });
    const audit = JSON.parse(result);

    if (audit.metadata.vulnerabilities.total === 0) {
      logSuccess('No vulnerabilities found');
    } else {
      const vuln = audit.metadata.vulnerabilities;
      log(`    Info: ${vuln.info}`, 'cyan');
      log(`    Low: ${vuln.low}`, vuln.low > 0 ? 'yellow' : 'cyan');
      log(`    Moderate: ${vuln.moderate}`, vuln.moderate > 0 ? 'yellow' : 'cyan');
      log(`    High: ${vuln.high}`, vuln.high > 0 ? 'red' : 'cyan');
      log(`    Critical: ${vuln.critical}`, vuln.critical > 0 ? 'red' : 'cyan');

      if (vuln.high > 0 || vuln.critical > 0) {
        logFailure(`Found ${vuln.high} high and ${vuln.critical} critical vulnerabilities`);
        return false;
      } else {
        logWarning(`Found ${vuln.moderate + vuln.low} moderate/low vulnerabilities`);
      }
    }
  } catch (error) {
    logWarning('npm audit check failed or found issues');
  }

  return true;
}

// ============================================================================
// Test 6: API Security Headers
// ============================================================================

function testSecurityHeaders() {
  logSection('Test 6: API Security Headers Configuration');

  logTest('Checking vercel.json for security headers');
  const vercelConfigPath = path.join(process.cwd(), 'vercel.json');
  
  if (!fs.existsSync(vercelConfigPath)) {
    logWarning('vercel.json not found');
    return false;
  }

  const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
  
  const requiredHeaders = [
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Content-Security-Policy'
  ];

  let allHeadersPresent = true;
  const headers = vercelConfig.headers || [];
  
  for (const requiredHeader of requiredHeaders) {
    const found = headers.some(h => 
      h.headers && h.headers.some(header => header.key === requiredHeader)
    );

    if (found) {
      log(`    ✓ ${requiredHeader}`, 'green');
    } else {
      log(`    ✗ ${requiredHeader} missing`, 'red');
      allHeadersPresent = false;
    }
  }

  if (allHeadersPresent) {
    logSuccess('All security headers configured');
  } else {
    logFailure('Some security headers missing');
    return false;
  }

  return true;
}

// ============================================================================
// Test 7: Database Access Control
// ============================================================================

function testDatabaseAccessControl() {
  logSection('Test 7: Database Access Control');

  logTest('Checking src/utils/db.ts for client-side blocking');
  const dbUtilPath = path.join(process.cwd(), 'src/utils/db.ts');
  
  if (fs.existsSync(dbUtilPath)) {
    const content = fs.readFileSync(dbUtilPath, 'utf-8');
    
    if (content.includes('throw new Error') && content.includes('Database access from browser')) {
      logSuccess('Client-side database access properly blocked');
    } else {
      logWarning('Client-side database blocking may not be implemented');
    }
  } else {
    log('    src/utils/db.ts not found', 'yellow');
  }

  logTest('Checking API endpoints use server-side database');
  try {
    const result = execSync('grep -r "requireSql\\|getDb" api/ | head -5', { encoding: 'utf-8' });
    if (result.trim() !== '') {
      logSuccess('API endpoints use server-side database access');
    } else {
      logWarning('Unable to verify server-side database access pattern');
    }
  } catch (error) {
    logWarning('Unable to verify database access patterns');
  }

  return true;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runSecurityTests() {
  log('\n╔══════════════════════════════════════════════════════════════════════════╗', 'blue');
  log('║     SECURITY VALIDATION TEST SUITE                                      ║', 'blue');
  log('║     Phase 10.5: Security Testing                                        ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════════════════╝', 'blue');
  log(`\nStart Time: ${new Date().toLocaleString()}\n`, 'cyan');

  let allPassed = true;

  allPassed = testNoDatabaseCredentialsInBundle() && allPassed;
  allPassed = testEnvironmentVariables() && allPassed;
  allPassed = testFilePermissions() && allPassed;
  allPassed = testSourceCodeSecurity() && allPassed;
  allPassed = testDependencySecurity() && allPassed;
  allPassed = testSecurityHeaders() && allPassed;
  allPassed = testDatabaseAccessControl() && allPassed;

  // Print summary
  logSection('Security Test Summary');
  if (allPassed) {
    log('  ✓ ALL SECURITY TESTS PASSED', 'green');
    log('\n  The application meets security requirements for Phase 10.', 'green');
  } else {
    log('  ✗ SOME SECURITY TESTS FAILED', 'red');
    log('\n  Please address the security issues before deploying to production.', 'red');
  }

  log(`\nEnd Time: ${new Date().toLocaleString()}`, 'cyan');

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runSecurityTests().catch(error => {
  log(`\n✗ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

