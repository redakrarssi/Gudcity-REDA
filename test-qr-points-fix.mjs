#!/usr/bin/env node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

/**
 * Script to test and fix customer point awarding issues with the 405 error
 */
async function main() {
  console.log('🔍 Starting point awarding system diagnosis');
  
  if (!DATABASE_URL) {
    console.error('❌ Database URL not found in environment variables');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    // Get customer ID 4 details as seen in the diagnostic script
    console.log('Checking customer ID 4 details...');
    
    const customerResult = await pool.query(`
      SELECT * FROM users WHERE id = 4
    `);
    
    if (customerResult.rows.length === 0) {
      console.log('❌ Customer ID 4 not found in users table');
      
      // Try the customers table
      const customersFallback = await pool.query(`
        SELECT * FROM customers WHERE id = 4
      `);
      
      if (customersFallback.rows.length > 0) {
        console.log('✅ Customer ID 4 found in customers table');
        console.log(customersFallback.rows[0]);
      } else {
        console.log('❌ Customer ID 4 not found in customers table either');
      }
    } else {
      console.log('✅ Customer ID 4 found in users table');
      console.log(customerResult.rows[0]);
    }
    
    // Check program enrollment
    console.log('\nChecking program enrollments for customer ID 4...');
    
    const enrollments = await pool.query(`
      SELECT * FROM customer_programs
      WHERE customer_id = '4'
    `);
    
    if (enrollments.rows.length === 0) {
      console.log('❌ Customer ID 4 is not enrolled in any programs');
    } else {
      console.log(`✅ Customer ID 4 is enrolled in ${enrollments.rows.length} programs:`);
      enrollments.rows.forEach((enrollment, idx) => {
        console.log(`${idx + 1}: Program ID ${enrollment.program_id}, Points: ${enrollment.current_points}`);
      });
      
      // Let's check the first program to use for our test
      const testProgramId = enrollments.rows[0].program_id;
      
      // Check if loyalty card exists for this program
      const cardCheck = await pool.query(`
        SELECT * FROM loyalty_cards
        WHERE customer_id = '4' AND program_id = $1
      `, [testProgramId]);
      
      if (cardCheck.rows.length === 0) {
        console.log(`❌ No loyalty card found for customer 4 in program ${testProgramId}`);
      } else {
        console.log(`✅ Found loyalty card for customer 4 in program ${testProgramId}:`);
        console.log(cardCheck.rows[0]);
      }
      
      // Test award points API directly
      try {
        console.log(`\nTesting award points API for customer 4, program ${testProgramId}...`);
        
        // First get authentication - use a business owner account
        // This part would need to be adapted to your authentication system
        // For now, let's try to read a token from a file
        let token;
        try {
          token = await fs.readFile('test-token.txt', 'utf8');
          console.log('✅ Read authentication token from file');
        } catch (err) {
          console.log('❌ Could not read authentication token, skipping API test');
          console.log('👉 To test the API, create a file called test-token.txt with a valid JWT token');
        }
        
        if (token) {
          console.log('Calling award-points API...');
          
          const response = await fetch('http://localhost:3000/api/businesses/award-points', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token.trim()}`
            },
            body: JSON.stringify({
              customerId: '4',
              programId: testProgramId,
              points: 1,
              description: 'Test points from diagnostic script',
              source: 'MANUAL'
            })
          });
          
          const status = response.status;
          console.log(`API Response Status: ${status}`);
          
          if (status === 405) {
            console.log('❌ Got 405 Method Not Allowed - API route may be misconfigured');
            console.log('Allowed methods:', response.headers.get('Allow'));
          }
          
          let data;
          try {
            data = await response.json();
          } catch (err) {
            console.log('❌ Failed to parse JSON response');
            const text = await response.text();
            console.log('Raw response:', text);
            data = { error: 'Failed to parse JSON' };
          }
          
          console.log('API Response:', JSON.stringify(data, null, 2));
          
          if (status === 200 && data.success) {
            console.log('✅ Successfully awarded points to customer!');
          } else {
            console.log('❌ Failed to award points. See details above.');
          }
          
          // Check if points were actually added in the database
          console.log('\nVerifying points were added in the database...');
          
          const pointsCheck = await pool.query(`
            SELECT * FROM customer_programs
            WHERE customer_id = '4' AND program_id = $1
          `, [testProgramId]);
          
          if (pointsCheck.rows.length > 0) {
            console.log(`Current points for customer 4 in program ${testProgramId}: ${pointsCheck.rows[0].current_points}`);
          }
        }
      } catch (apiError) {
        console.error('❌ Error calling API:', apiError);
      }
    }
    
    // Check for programmatic issues
    console.log('\nChecking for potential issues in the system...');
    
    // Check API route configuration
    try {
      const routes = await fs.readFile('src/api/api.ts', 'utf8');
      console.log('✅ Found API client configuration file');
    } catch (err) {
      console.log('❌ Could not read API configuration file');
    }
    
    try {
      const businessRoutes = await fs.readFile('src/api/businessRoutes.ts', 'utf8');
      if (businessRoutes.includes('router.post(\'/award-points\'')) {
        console.log('✅ Found award-points POST route in businessRoutes.ts');
      } else {
        console.log('❌ Could not find award-points POST route in businessRoutes.ts');
      }
    } catch (err) {
      console.log('❌ Could not read business routes file');
    }
    
    // Provide recommendations
    console.log('\n📋 Recommendations:');
    console.log('1. Ensure all enrollments have corresponding loyalty_cards');
    console.log('2. Verify API authentication is working properly');
    console.log('3. Check that the route handler for award-points is properly registered');
    console.log('4. Ensure the web server is not blocking POST requests to this endpoint');
    console.log('5. Check for middleware that might be interfering with the request');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 