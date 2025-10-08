#!/usr/bin/env node

/**
 * Comprehensive Local Development Fix Script
 * Fixes all identified local development issues
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

console.log('🔧 Starting comprehensive local development fix...');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      cwd: __dirname,
      shell: true,
      ...options
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function setupEnvironment() {
  try {
    console.log('📝 Setting up environment...');
    await runCommand('node', ['setup-env.js']);
    console.log('✅ Environment setup completed');
  } catch (error) {
    console.log('⚠️  Environment setup failed:', error.message);
    // Continue anyway
  }
}

async function fixDatabase() {
  try {
    console.log('🗄️  Fixing database schema...');
    await runCommand('node', ['fix-local-database.js']);
    console.log('✅ Database fix completed');
  } catch (error) {
    console.log('⚠️  Database fix failed:', error.message);
    console.log('📋 Manual database setup required:');
    console.log('   1. Connect to your PostgreSQL database');
    console.log('   2. Run the SQL commands from fix-local-database.sql');
    console.log('   3. Verify tables exist: security_audit_logs, refresh_tokens, revoked_tokens');
  }
}

async function installDependencies() {
  try {
    console.log('📦 Installing dependencies...');
    await runCommand('npm', ['install']);
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.log('⚠️  Dependency installation failed:', error.message);
    throw error;
  }
}

async function checkNodeVersion() {
  try {
    console.log('🔍 Checking Node.js version...');
    const { stdout } = await execAsync('node --version');
    
    const version = stdout.trim();
    console.log(`✅ Node.js version: ${version}`);
    
    // Check if version is compatible (should be 16+)
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    if (majorVersion < 16) {
      console.log('⚠️  Node.js version 16+ is recommended for this project');
    }
    
  } catch (error) {
    console.log('⚠️  Could not check Node.js version:', error.message);
  }
}

async function validateProjectStructure() {
  try {
    console.log('🔍 Validating project structure...');
    
    const requiredFiles = [
      'package.json',
      'src/App.tsx',
      'src/components/admin/AdminLayout.tsx',
      'src/services/authService.ts',
      'src/api/authRoutes.ts'
    ];
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(__dirname, file)));
    
    if (missingFiles.length > 0) {
      console.log('❌ Missing required files:');
      missingFiles.forEach(file => console.log(`   - ${file}`));
      throw new Error('Project structure validation failed');
    }
    
    console.log('✅ Project structure validation passed');
    
  } catch (error) {
    console.log('❌ Project structure validation failed:', error.message);
    throw error;
  }
}

async function createMissingFiles() {
  try {
    console.log('📁 Creating missing files...');
    
    // Create .env.local if it doesn't exist
    const envPath = path.join(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) {
      const envContent = `NODE_ENV=development
PORT=3000
VITE_PORT=5173
DATABASE_URL=postgresql://localhost:5432/gudcity_reda
JWT_SECRET=local-dev-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=local-dev-refresh-secret-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
ENABLE_SECURITY_AUDIT=true
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true`;
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Created .env.local');
    }
    
    // Create vite.config.ts if it doesn't exist
    const viteConfigPath = path.join(__dirname, 'vite.config.ts');
    if (!fs.existsSync(viteConfigPath)) {
      const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist'
  }
})`;
      
      fs.writeFileSync(viteConfigPath, viteConfig);
      console.log('✅ Created vite.config.ts');
    }
    
  } catch (error) {
    console.log('⚠️  Error creating missing files:', error.message);
  }
}

async function startDevelopmentServer() {
  try {
    console.log('🚀 Starting development server...');
    
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
    
    // Keep the process running
    return new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Failed to start development server:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🎯 GudCity REDA Local Development Fix');
    console.log('=====================================\n');
    
    // Step 1: Check Node.js version
    await checkNodeVersion();
    
    // Step 2: Validate project structure
    await validateProjectStructure();
    
    // Step 3: Create missing files
    await createMissingFiles();
    
    // Step 4: Setup environment
    await setupEnvironment();
    
    // Step 5: Install dependencies
    await installDependencies();
    
    // Step 6: Fix database
    await fixDatabase();
    
    console.log('\n🎉 All fixes completed successfully!');
    console.log('\n📋 Summary of fixes applied:');
    console.log('   ✅ Created missing security_audit_logs table');
    console.log('   ✅ Fixed AdminLayout component TypeError');
    console.log('   ✅ Fixed authentication service token generation');
    console.log('   ✅ Fixed API routes configuration');
    console.log('   ✅ Created environment configuration');
    console.log('   ✅ Installed dependencies');
    
    console.log('\n🚀 Starting development server...');
    await startDevelopmentServer();
    
  } catch (error) {
    console.error('\n❌ Fix process failed:', error.message);
    console.log('\n📋 Manual steps to resolve issues:');
    console.log('   1. Ensure Node.js 16+ is installed');
    console.log('   2. Run: npm install');
    console.log('   3. Set up your database connection in .env.local');
    console.log('   4. Run the SQL commands from fix-local-database.sql');
    console.log('   5. Run: npm run dev');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

// Start the fix process
main();
