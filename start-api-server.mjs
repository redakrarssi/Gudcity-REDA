#!/usr/bin/env node

/**
 * API Server for admin businesses
 * This script starts an Express server that runs on port 3000 for the admin businesses API
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
import { server } from './src/server-fixed.mjs';

console.log('✅ Server setup complete');

// Export the server for testing
export default server;
