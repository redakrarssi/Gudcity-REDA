#!/usr/bin/env node

/**
 * Development Server
 * Runs both the frontend (Vite) and backend (API) servers for local development
 */

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting development servers...');

// Start the API server
console.log('📡 Starting API server on port 3000...');
const apiServer = spawn('node', ['start-api-server.cjs'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// Start the Vite dev server
console.log('🎨 Starting Vite dev server on port 5173...');
const viteServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...');
  apiServer.kill();
  viteServer.kill();
  process.exit(0);
});

// Handle errors
apiServer.on('error', (err) => {
  console.error('❌ API server error:', err);
});

viteServer.on('error', (err) => {
  console.error('❌ Vite server error:', err);
});

console.log('✅ Development servers started!');
console.log('📡 API server: http://localhost:3000');
console.log('🎨 Frontend: http://localhost:5173');
