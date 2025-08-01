#!/usr/bin/env node
/**
 * Database Credentials Migration Script
 * 
 * This script updates all files with hardcoded database credentials to use environment variables.
 * It creates a .env.local file with the credentials and updates scripts to use this file.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Hardcoded database URL found in the codebase
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Add a random string for QR_SECRET_KEY
const QR_SECRET_KEY = `gudcity-secure-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`;

// Ensure .env.local exists with the credentials
function setupEnvFile() {
  console.log('Setting up .env.local file...');
  
  // Define the content of the .env file
  const envContent = `VITE_DATABASE_URL=${DATABASE_URL}
VITE_QR_SECRET_KEY=${QR_SECRET_KEY}
VITE_QR_TOKEN_ROTATION_DAYS=30
VITE_QR_RATE_LIMIT_MAX=20
VITE_QR_RATE_LIMIT_WINDOW_MS=60000
`;

  // Write the .env.local file
  writeFileSync('.env.local', envContent);
  console.log('✅ Created .env.local file with secure credentials');
  
  // Make sure .env.local is in .gitignore
  let gitignore = '';
  try {
    gitignore = readFileSync('.gitignore', 'utf8');
  } catch (err) {
    console.warn('⚠️ .gitignore file not found, creating it');
    gitignore = '';
  }
  
  if (!gitignore.includes('.env.local')) {
    gitignore += '\n# Environment variables\n.env.local\n';
    writeFileSync('.gitignore', gitignore);
    console.log('✅ Added .env.local to .gitignore');
  }
}

// Find files with hardcoded database credentials
function findFilesWithCredentials() {
  console.log('Finding files with hardcoded database credentials...');
  
  const filesToUpdate = [];
  const directoriesToSearch = ['.', 'src', 'src/services', 'src/utils'];
  
  for (const dir of directoriesToSearch) {
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        const filePath = join(dir, file);
        
        // Skip directories and non-JS/TS files
        if (!filePath.endsWith('.js') && 
            !filePath.endsWith('.mjs') && 
            !filePath.endsWith('.ts') && 
            !filePath.endsWith('.tsx')) {
          continue;
        }
        
        try {
          const content = readFileSync(filePath, 'utf8');
          if (content.includes(DATABASE_URL) || 
              content.includes('neondb_owner:npg_rpc6Nh5oKGzt') ||
              content.includes('gudcity-qrcode-security-key')) {
            filesToUpdate.push(filePath);
          }
        } catch (err) {
          console.warn(`⚠️ Could not read file ${filePath}: ${err.message}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not read directory ${dir}: ${err.message}`);
    }
  }
  
  console.log(`Found ${filesToUpdate.length} files with hardcoded credentials`);
  return filesToUpdate;
}

// Update files to use environment variables
function updateFiles(filesToUpdate) {
  console.log('Updating files to use environment variables...');
  
  for (const filePath of filesToUpdate) {
    try {
      let content = readFileSync(filePath, 'utf8');
      
      // Replace hardcoded database URLs
      content = content.replace(
        /const DATABASE_URL = "postgres:\/\/neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler\.eu-central-1\.aws\.neon\.tech\/neondb\?sslmode=require";/g,
        'const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;'
      );
      
      // Replace QR code security keys
      content = content.replace(
        /private static readonly SECRET_KEY = (?:process\.env\.QR_SECRET_KEY \|\| )?"gudcity-qrcode-security-key(?:-with-additional-entropy-for-hmac-generation)?";/g,
        'private static readonly SECRET_KEY = process.env.VITE_QR_SECRET_KEY || "fallback-key-do-not-use-in-production";'
      );
      
      // Update pool configuration
      content = content.replace(
        /const pool = new Pool\(\{\s+connectionString: DATABASE_URL,\s+ssl: true\s+\}\);/g,
        'const pool = new Pool({\n  connectionString: DATABASE_URL,\n  ssl: true\n});'
      );
      
      writeFileSync(filePath, content);
      console.log(`✅ Updated ${filePath}`);
    } catch (err) {
      console.error(`❌ Error updating ${filePath}: ${err.message}`);
    }
  }
}

// Main function
async function main() {
  console.log('Starting database credentials migration...');
  
  // Setup environment file
  setupEnvFile();
  
  // Find and update files
  const filesToUpdate = findFilesWithCredentials();
  updateFiles(filesToUpdate);
  
  console.log('\n🎉 Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Review the updated files to ensure everything works correctly');
  console.log('2. Use "npm run dev" to start the application with the updated credentials');
  console.log('3. For production, set up proper environment variables in your hosting platform');
}

// Run the migration
main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
