#!/usr/bin/env node

/**
 * Remove Hardcoded Credentials Script
 * Removes hardcoded database credentials from files that are safe to modify
 * Following reda.md rules - only modifies files that are safe to change
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardcoded credentials to remove
const HARDCODED_CREDENTIALS = [
  'postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  'neondb_owner:npg_rpc6Nh5oKGzt'
];

// Demo JWT tokens to remove
const DEMO_TOKENS = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoiYnVzaW5lc3MiLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MTgwMDAwMDAwMH0.6S5-JBrSGmmBE0LiveQG4X4LnexCv_0FjmLB64uTIl8'
];

// Files that are safe to modify according to reda.md rules
const SAFE_TO_MODIFY_FILES = [
  // Test and utility files
  'test-direct.js',
  'test-settings-page.mjs',
  'test-points-simple.js',
  'verify-points-update.mjs',
  'fix-customer-points.js',
  'test-live-business-notifications.mjs',
  'fix-all-qr-issues.mjs',
  'update-business-profile.js',
  'check-customer-4-enrollments.mjs',
  'fix-card-rewards.mjs',
  'patch-business-profile.js',
  'check-customer-card.mjs',
  'fix-business-settings.mjs',
  'fix-qr-cards.js',
  'check-schema.js',
  'check-promo-codes.mjs',
  'fix-qr-scanner-points.mjs',
  'check-qrcode-logs.mjs',
  'fix-customer-27.mjs',
  'fix-loyalty-cards.mjs',
  'fix-all-qr-cards.cjs',
  'test-dashboard-analytics.mjs',
  'test-customer-settings.mjs',
  'test-update.mjs',
  'check-table-constraints.mjs',
  
  // Setup and migration files
  'setup-business-locations-schema.mjs',
  'setup-loyalty-programs.mjs',
  'check-db-schema.mjs',
  'setup-qrcode-schema.mjs',
  'fix-all-customer-cards.mjs',
  'fix-all-card-issues.mjs',
  'check-fix-customer-cards.mjs',
  'check-db.mjs',
  'setup-promotion-schema.mjs',
  'universal-card-setup.mjs',
  'setup-business-profile-schema.mjs',
  'check-customer-programs-schema.mjs',
  'setup-business-settings-schema.mjs',
  'db-credentials-migration.mjs',
  'check-loyalty-program-schema.mjs',
  
  // Environment and configuration files
  'create-env.js',
  'start-with-env.js',
  'fix-auth-login.mjs',
  
  // Demo and test files
  'fix-award-points-system.cjs',
  'fix-award-points-final.js',
  'public/fix-405-error.js',
  'award-points-fix.html'
];

// Files that should NOT be modified (critical files)
const CRITICAL_FILES = [
  'src/middleware/auth.ts',
  'src/services/authService.ts',
  'src/utils/db.ts',
  'src/server.ts',
  'src/api/businessRoutes.ts',
  'src/api/awardPointsHandler.ts',
  'package.json',
  'vite.config.ts',
  'tsconfig.json'
];

/**
 * Check if file is safe to modify
 */
function isSafeToModify(filePath) {
  const fileName = path.basename(filePath);
  
  // Never modify critical files
  if (CRITICAL_FILES.includes(fileName)) {
    return false;
  }
  
  // Check if file is in safe list
  return SAFE_TO_MODIFY_FILES.includes(fileName);
}

/**
 * Remove hardcoded credentials from a file
 */
function removeHardcodedCredentials(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return { modified: false, error: 'File not found' };
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let replacements = [];
    
    // Remove hardcoded database credentials
    HARDCODED_CREDENTIALS.forEach(credential => {
      if (content.includes(credential)) {
        const replacement = 'process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || ""';
        content = content.replace(new RegExp(credential.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
        replacements.push(`Replaced hardcoded credential with environment variable`);
        modified = true;
      }
    });
    
    // Remove demo JWT tokens
    DEMO_TOKENS.forEach(token => {
      if (content.includes(token)) {
        const replacement = 'process.env.JWT_TOKEN || ""';
        content = content.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
        replacements.push(`Replaced demo JWT token with environment variable`);
        modified = true;
      }
    });
    
    // Remove hardcoded connection strings
    const connectionStringPatterns = [
      /connectionString:\s*["']postgres:\/\/[^"']+["']/g,
      /DATABASE_URL\s*=\s*["']postgres:\/\/[^"']+["']/g,
      /VITE_DATABASE_URL\s*=\s*["']postgres:\/\/[^"']+["']/g
    ];
    
    connectionStringPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          if (match.includes('connectionString:')) {
            return 'connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || ""';
          } else if (match.includes('DATABASE_URL =')) {
            return 'DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || ""';
          } else if (match.includes('VITE_DATABASE_URL =')) {
            return 'VITE_DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || ""';
          }
          return match;
        });
        replacements.push(`Replaced hardcoded connection string with environment variable`);
        modified = true;
      }
    });
    
    // Remove hardcoded secrets
    const secretPatterns = [
      /SECRET_KEY\s*=\s*["'][^"']+["']/g,
      /JWT_SECRET\s*=\s*["'][^"']+["']/g,
      /QR_SECRET_KEY\s*=\s*["'][^"']+["']/g
    ];
    
    secretPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          if (match.includes('SECRET_KEY =')) {
            return 'SECRET_KEY = process.env.QR_SECRET_KEY || ""';
          } else if (match.includes('JWT_SECRET =')) {
            return 'JWT_SECRET = process.env.JWT_SECRET || ""';
          } else if (match.includes('QR_SECRET_KEY =')) {
            return 'QR_SECRET_KEY = process.env.QR_SECRET_KEY || ""';
          }
          return match;
        });
        replacements.push(`Replaced hardcoded secret with environment variable`);
        modified = true;
      }
    });
    
    if (modified) {
      // Create backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
      console.log(`📦 Created backup: ${backupPath}`);
      
      // Write modified content
      fs.writeFileSync(filePath, content);
      console.log(`✅ Modified: ${filePath}`);
      replacements.forEach(replacement => {
        console.log(`   - ${replacement}`);
      });
    }
    
    return { modified, replacements };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { modified: false, error: error.message };
  }
}

/**
 * Scan directory for files with hardcoded credentials
 */
function scanDirectory(dirPath, depth = 0) {
  if (depth > 3) return; // Limit recursion depth
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .git
        if (item !== 'node_modules' && item !== '.git' && !item.startsWith('.')) {
          scanDirectory(fullPath, depth + 1);
        }
      } else if (stat.isFile()) {
        // Check if file is safe to modify
        if (isSafeToModify(fullPath)) {
          const result = removeHardcodedCredentials(fullPath);
          if (result.modified) {
            console.log(`🔧 Processed: ${fullPath}`);
          }
        } else {
          // Just check for hardcoded credentials without modifying
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const hasCredentials = HARDCODED_CREDENTIALS.some(cred => content.includes(cred));
            const hasDemoTokens = DEMO_TOKENS.some(token => content.includes(token));
            
            if (hasCredentials || hasDemoTokens) {
              console.log(`⚠️  Found hardcoded credentials in critical file (not modified): ${fullPath}`);
            }
          } catch (error) {
            // Ignore files that can't be read
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning directory ${dirPath}:`, error.message);
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔒 Starting hardcoded credentials removal...');
  console.log('📋 Following reda.md rules - only modifying safe files');
  console.log('');
  
  const startTime = Date.now();
  
  // Scan current directory
  scanDirectory('.');
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('');
  console.log('✅ Credentials removal completed!');
  console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
  console.log('');
  console.log('🔒 Security Recommendations:');
  console.log('1. Set up proper environment variables');
  console.log('2. Rotate all database credentials');
  console.log('3. Remove any remaining hardcoded secrets');
  console.log('4. Implement credential scanning in CI/CD');
  console.log('5. Use a secrets management service');
  console.log('');
  console.log('⚠️  IMPORTANT: Review all changes before deploying!');
}

// Run the script
main();