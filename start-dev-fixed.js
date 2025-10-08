#!/usr/bin/env node

/**
 * Local Development Fix Script
 * Fixes local development issues and starts the development server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 Starting local development fix...');

async function runDatabaseFix() {
  try {
    console.log('📡 Running database fix...');
    
    // Check if we have the database fix script
    const fixScript = path.join(__dirname, 'fix-local-database.js');
    if (!fs.existsSync(fixScript)) {
      console.log('⚠️  Database fix script not found, skipping database setup');
      return;
    }
    
    // Run the database fix script
    const fixProcess = spawn('node', [fixScript], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    return new Promise((resolve, reject) => {
      fixProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Database fix completed');
          resolve();
        } else {
          console.log('⚠️  Database fix completed with warnings');
          resolve(); // Don't fail the whole process
        }
      });
      
      fixProcess.on('error', (error) => {
        console.log('⚠️  Database fix failed:', error.message);
        resolve(); // Don't fail the whole process
      });
    });
    
  } catch (error) {
    console.log('⚠️  Database fix error:', error.message);
    // Don't fail the whole process
  }
}

async function startDevelopmentServer() {
  try {
    console.log('🚀 Starting development server...');
    
    // Check if we're in the right directory
    const packageJson = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJson)) {
      console.error('❌ package.json not found. Please run this script from the project root.');
      process.exit(1);
    }
    
    // Start the Vite development server
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      cwd: __dirname,
      shell: true
    });
    
    devProcess.on('close', (code) => {
      console.log(`Development server exited with code ${code}`);
    });
    
    devProcess.on('error', (error) => {
      console.error('Failed to start development server:', error);
    });
    
  } catch (error) {
    console.error('❌ Failed to start development server:', error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    // Run database fix first
    await runDatabaseFix();
    
    // Then start the development server
    await startDevelopmentServer();
    
  } catch (error) {
    console.error('❌ Development setup failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down development server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down development server...');
  process.exit(0);
});

// Start the process
main();
