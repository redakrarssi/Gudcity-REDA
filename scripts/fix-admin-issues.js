#!/usr/bin/env node

/**
 * Fix Admin Issues Script
 * This script helps diagnose and fix common admin businesses endpoint issues
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000
};

// Test endpoints in order of complexity
const testEndpoints = [
  { path: '/api/admin/public-test', name: 'Public Test', auth: false },
  { path: '/api/admin/simple-businesses', name: 'Simple Businesses', auth: false },
  { path: '/api/admin/basic-businesses', name: 'Basic Businesses', auth: true },
  { path: '/api/admin/businesses', name: 'Full Businesses', auth: true }
];

// Test function
async function testEndpoint(path, name, requiresAuth) {
  return new Promise((resolve) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fix-Admin-Issues/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ 
            name, 
            path, 
            statusCode: res.statusCode, 
            success: true, 
            response,
            requiresAuth
          });
        } catch (error) {
          resolve({ 
            name, 
            path, 
            statusCode: res.statusCode, 
            success: false, 
            error: 'Invalid JSON response',
            rawData: data.substring(0, 200) + (data.length > 200 ? '...' : ''),
            requiresAuth
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ 
        name, 
        path, 
        success: false, 
        error: error.message,
        requiresAuth
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ 
        name, 
        path, 
        success: false, 
        error: 'Request timeout',
        requiresAuth
      });
    });

    req.end();
  });
}

// Check server status
async function checkServerStatus() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: config.host,
      port: config.port,
      path: '/health',
      method: 'GET'
    }, (res) => {
      resolve({ running: true, status: res.statusCode });
    });

    req.on('error', () => {
      resolve({ running: false, status: null });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ running: false, status: null });
    });

    req.end();
  });
}

// Generate diagnostic report
function generateDiagnosticReport(results, serverStatus) {
  const report = {
    timestamp: new Date().toISOString(),
    serverStatus: serverStatus,
    endpointResults: results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      authRequired: results.filter(r => r.requiresAuth).length
    },
    recommendations: []
  };

  // Generate recommendations
  if (!serverStatus.running) {
    report.recommendations.push('Server is not running. Start the server with: npm run dev');
  }

  if (results.every(r => !r.success)) {
    report.recommendations.push('All endpoints are failing. Check server logs and database connection');
  }

  const publicEndpoints = results.filter(r => !r.requiresAuth);
  const authEndpoints = results.filter(r => r.requiresAuth);
  
  if (publicEndpoints.every(r => !r.success) && authEndpoints.some(r => r.success)) {
    report.recommendations.push('Public endpoints failing but auth endpoints working. Check route registration');
  }

  if (authEndpoints.every(r => !r.success)) {
    report.recommendations.push('Auth endpoints failing. Check authentication middleware and admin user setup');
  }

  return report;
}

// Main function
async function diagnoseAndFix() {
  console.log('🔧 Admin Businesses Endpoint Diagnostic Tool\n');
  console.log(`📍 Testing server: http://${config.host}:${config.port}\n`);
  
  // Check server status
  console.log('🔍 Checking server status...');
  const serverStatus = await checkServerStatus();
  
  if (serverStatus.running) {
    console.log(`✅ Server is running (Status: ${serverStatus.status})`);
  } else {
    console.log('❌ Server is not running');
    console.log('\n💡 Solution: Start the server with: npm run dev');
    return;
  }
  
  console.log('\n🔍 Testing admin endpoints...\n');
  
  // Test all endpoints
  const results = [];
  for (const endpoint of testEndpoints) {
    console.log(`🔍 Testing: ${endpoint.name} (${endpoint.path})`);
    const result = await testEndpoint(endpoint.path, endpoint.name, endpoint.auth);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${endpoint.name}: Status ${result.statusCode}`);
      if (result.response && result.response.message) {
        console.log(`   Message: ${result.response.message}`);
      }
    } else {
      console.log(`❌ ${endpoint.name}: ${result.error}`);
      if (result.rawData) {
        console.log(`   Raw response: ${result.rawData}`);
      }
    }
    console.log('');
  }
  
  // Generate diagnostic report
  const report = generateDiagnosticReport(results, serverStatus);
  
  // Display summary
  console.log('📊 Diagnostic Summary:');
  console.log('======================');
  console.log(`Server Status: ${serverStatus.running ? 'Running' : 'Not Running'}`);
  console.log(`Total Endpoints: ${report.summary.total}`);
  console.log(`Successful: ${report.summary.successful}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Auth Required: ${report.summary.authRequired}`);
  
  // Display recommendations
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  // Save report to file
  const reportFile = path.join(__dirname, 'admin-diagnostic-report.json');
  try {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  } catch (error) {
    console.log('\n⚠️ Could not save report file:', error.message);
  }
  
  // Quick fixes
  console.log('\n🔧 Quick Fixes:');
  console.log('================');
  
  if (report.summary.failed > 0) {
    console.log('1. Check server console for error messages');
    console.log('2. Verify database connection and tables exist');
    console.log('3. Ensure admin user is properly configured');
    console.log('4. Check if all required middleware is loaded');
    console.log('5. Restart the server to reload routes');
  }
  
  if (report.summary.successful === report.summary.total) {
    console.log('🎉 All endpoints are working correctly!');
  }
}

// Run the diagnostic if this script is executed directly
if (require.main === module) {
  diagnoseAndFix().catch(console.error);
}

module.exports = { diagnoseAndFix, testEndpoint, checkServerStatus };