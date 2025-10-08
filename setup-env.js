#!/usr/bin/env node

/**
 * Environment Setup Script for Local Development
 * Ensures all necessary environment variables are set for local development
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Setting up local development environment...');

// Default environment variables for local development
const defaultEnvVars = {
  NODE_ENV: 'development',
  PORT: '3000',
  VITE_PORT: '5173',
  
  // Database configuration (use local PostgreSQL or Neon)
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/gudcity_reda',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-jwt-secret-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'local-dev-refresh-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  
  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // API Configuration
  API_RATE_LIMIT_WINDOW_MS: '900000', // 15 minutes
  API_RATE_LIMIT_MAX_REQUESTS: '100',
  
  // Security Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Feature Flags
  ENABLE_SECURITY_AUDIT: 'true',
  ENABLE_RATE_LIMITING: 'true',
  ENABLE_CSRF_PROTECTION: 'true'
};

function createEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  
  // Check if .env.local already exists
  if (fs.existsSync(envPath)) {
    console.log('✅ .env.local already exists');
    return;
  }
  
  // Create .env.local with default values
  const envContent = Object.entries(defaultEnvVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local with default values');
}

function checkRequiredEnvVars() {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️  Missing required environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n📝 Please set these variables in your .env.local file or environment');
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  return true;
}

function validateDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.log('❌ DATABASE_URL is not set');
    return false;
  }
  
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    console.log('✅ Using local database');
    return true;
  }
  
  if (dbUrl.includes('neon.tech') || dbUrl.includes('supabase.co')) {
    console.log('✅ Using cloud database');
    return true;
  }
  
  console.log('⚠️  DATABASE_URL format is unclear, but proceeding...');
  return true;
}

function main() {
  try {
    console.log('🔍 Checking environment setup...');
    
    // Create .env.local if it doesn't exist
    createEnvFile();
    
    // Check required environment variables
    const envVarsOk = checkRequiredEnvVars();
    
    // Validate database URL
    const dbUrlOk = validateDatabaseUrl();
    
    if (!envVarsOk || !dbUrlOk) {
      console.log('\n❌ Environment setup incomplete');
      console.log('Please fix the issues above and try again');
      process.exit(1);
    }
    
    console.log('\n🎉 Environment setup completed successfully!');
    console.log('You can now run: npm run dev');
    
  } catch (error) {
    console.error('❌ Environment setup failed:', error.message);
    process.exit(1);
  }
}

main();
