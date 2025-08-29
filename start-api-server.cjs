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

// Check if environment variables are set
if (!process.env.VITE_JWT_SECRET) {
  console.error('❌ Error: VITE_JWT_SECRET is not set in environment variables');
  console.log('⚙️ Run node src/server-fix.mjs first to set up the environment variables');
  process.exit(1);
}

// Import and start the server
const { server } = require('./src/server-fixed.cjs');

console.log('✅ Server setup complete');

// Export the server for testing
module.exports = server;
