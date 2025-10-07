#!/usr/bin/env node

/**
 * API Server for admin businesses
 * This script starts an Express server that runs on port 3000 for the admin businesses API
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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
