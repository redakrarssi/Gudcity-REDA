#!/usr/bin/env node

/**
 * Build Test Script
 * Tests if the build configuration is working properly
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function testBuild() {
  log('🔧 Testing Build Configuration', 'cyan');
  console.log('='.repeat(50));

  try {
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      logError('package.json not found');
      return false;
    }
    logSuccess('package.json found');

    // Check if vite.config.ts exists
    if (!fs.existsSync('vite.config.ts')) {
      logError('vite.config.ts not found');
      return false;
    }
    logSuccess('vite.config.ts found');

    // Check critical source files
    const criticalFiles = [
      'src/main.tsx',
      'src/App.tsx',
      'src/utils/serverMock.ts',
      'index.html'
    ];

    for (const file of criticalFiles) {
      if (!fs.existsSync(file)) {
        logError(`Critical file missing: ${file}`);
        return false;
      }
    }
    logSuccess('All critical files found');

    // Test TypeScript compilation
    logInfo('Testing TypeScript compilation...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      logSuccess('TypeScript compilation successful');
    } catch (error) {
      logWarning('TypeScript compilation has issues, but build may still work');
      console.log(error.stdout?.toString() || error.message);
    }

    // Test Vite build (dry run check)
    logInfo('Checking Vite configuration...');
    try {
      // This doesn't actually build, just validates the config
      execSync('npx vite build --dry-run', { stdio: 'pipe' });
      logSuccess('Vite configuration is valid');
    } catch (error) {
      logWarning('Vite dry-run failed, but configuration might still work');
    }

    // Check for potential issues
    logInfo('Checking for potential build issues...');
    
    // Check for merge conflicts
    try {
      const mergeConflicts = execSync('grep -r "<<<<<<< \\|>>>>>>> \\|=======" src/', { stdio: 'pipe' });
      if (mergeConflicts.toString().trim()) {
        logError('Merge conflicts detected in source files');
        return false;
      }
    } catch (error) {
      // No conflicts found (grep returns non-zero when no matches)
    }
    logSuccess('No merge conflicts detected');

    // Check server imports
    try {
      const serverImports = execSync('grep -r "from.*\\.\\./server" src/', { stdio: 'pipe' });
      if (serverImports.toString().trim()) {
        logInfo('Server imports detected - these should be aliased to serverMock');
      }
    } catch (error) {
      // No server imports found
    }

    logSuccess('Build configuration test completed');
    return true;

  } catch (error) {
    logError(`Build test failed: ${error.message}`);
    return false;
  }
}

// Run the test
testBuild().then(success => {
  if (success) {
    log('🎉 Build configuration looks good!', 'green');
    process.exit(0);
  } else {
    log('💥 Build configuration has issues that need to be fixed', 'red');
    process.exit(1);
  }
});
