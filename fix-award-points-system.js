#!/usr/bin/env node

/**
 * Award Points System Fix Script
 * 
 * This script runs the entire process to fix the award points system:
 * 1. Apply server-side fixes
 * 2. Apply client-side fixes
 * 3. Run the verification tool
 * 4. Update the application to use the best endpoint
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const open = require('open');

console.log('🚀 Starting Award Points System Fix Process...');

// Step 1: Apply fixes
console.log('\n📋 Step 1: Applying fixes...');
try {
  execSync('node apply-fixes.js', { stdio: 'inherit' });
  console.log('✅ Applied fixes successfully');
} catch (error) {
  console.error('❌ Error applying fixes:', error);
  process.exit(1);
}

// Step 2: Start server temporarily for verification
console.log('\n📋 Step 2: Starting server for verification...');
let server;

try {
  // Create a simple server to serve the verification tool
  const PORT = 3000;
  
  server = http.createServer((req, res) => {
    let filePath;
    
    if (req.url === '/' || req.url === '/index.html') {
      filePath = path.join(__dirname, 'public', 'index.html');
    } else if (req.url === '/verify-award-points.html') {
      filePath = path.join(__dirname, 'public', 'verify-award-points.html');
    } else if (req.url === '/fix-award-points-final.js') {
      filePath = path.join(__dirname, 'public', 'fix-award-points-final.js');
    } else if (req.url.startsWith('/api/')) {
      // Handle API requests
      if (req.url.includes('award-points')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Points awarded successfully (mock response)',
          data: {
            customerId: '27',
            programId: '8',
            points: 10
          }
        }));
        return;
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error: ${err.message}`);
        return;
      }
      
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      
      switch (ext) {
        case '.js':
          contentType = 'text/javascript';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.json':
          contentType = 'application/json';
          break;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
  
  server.listen(PORT, () => {
    console.log(`✅ Server started on http://localhost:${PORT}`);
    console.log('✅ Opening verification tool in browser...');
    
    // Open the verification tool in the browser
    open(`http://localhost:${PORT}/verify-award-points.html`);
    
    console.log('\n📋 Step 3: Use the verification tool to test endpoints');
    console.log('1. Test each endpoint using the verification tool');
    console.log('2. Note which endpoint works best');
    console.log('3. Close the browser when done');
    console.log('\nPress Ctrl+C when you have finished testing to continue...');
  });
  
  // Wait for user to press Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n✅ Verification completed');
    server.close();
    
    // Step 4: Update application to use best endpoint
    console.log('\n📋 Step 4: Updating application to use best endpoint...');
    try {
      execSync('node update-award-points-endpoint.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Error updating application:', error);
      process.exit(1);
    }
    
    console.log('\n🎉 Award Points System Fix Process Completed Successfully!');
    console.log('\nNext steps:');
    console.log('1. Review the AWARD-POINTS-USAGE.md file for usage instructions');
    console.log('2. Restart your actual server');
    console.log('3. Test the award points system in your application');
    
    process.exit(0);
  });
} catch (error) {
  console.error('❌ Error starting verification server:', error);
  process.exit(1);
} 