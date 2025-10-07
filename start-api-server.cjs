#!/usr/bin/env node

/**
 * API Server for admin businesses
 * This script starts an Express server that runs on port 3000 for the admin businesses API
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from multiple sources
console.log('🔧 Loading environment variables...');

// 1. Load from .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn('⚠️ Warning loading .env:', result.error.message);
  } else {
    console.log('✅ Loaded .env file');
  }
} else {
  console.log('⚠️ No .env file found');
}

// 2. Load from .env.local if it exists
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const result = dotenv.config({ path: envLocalPath });
  if (result.error) {
    console.warn('⚠️ Warning loading .env.local:', result.error.message);
  } else {
    console.log('✅ Loaded .env.local file');
  }
}

// 3. Verify critical environment variables
console.log('🔍 Environment check:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('- VITE_DATABASE_URL:', process.env.VITE_DATABASE_URL ? 'SET' : 'NOT SET');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('- VITE_JWT_SECRET:', process.env.VITE_JWT_SECRET ? 'SET' : 'NOT SET');

console.log('🚀 Starting API server for admin businesses...');

// Ensure a JWT secret exists in development to avoid hard exits
if (!process.env.VITE_JWT_SECRET) {
  const devSecret = 'dev-secret-' + Math.random().toString(36).slice(2);
  process.env.VITE_JWT_SECRET = devSecret;
  process.env.JWT_SECRET = process.env.JWT_SECRET || devSecret;
  console.warn('⚠️ VITE_JWT_SECRET was missing. A temporary development secret has been set.');
}

// Import and start the server
const { server } = require('./src/server-fixed.cjs');

console.log('✅ Server setup complete');

// Export the server for testing
module.exports = server;
