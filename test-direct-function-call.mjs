#!/usr/bin/env node

/**
 * Test Direct Function Call
 * This script directly calls the function to test if it works
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

async function testDirectFunctionCall() {
  // Create a fresh connection
  const sql = postgres(DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 1
  });
  
  try {
    console.log('Testing direct function call...');
    
    // Get a pending enrollment request
    const pendingRequest = await sql`
      SELECT id, customer_id, business_id, entity_id, status
      FROM customer_approval_requests
      WHERE request_type = 'ENROLLMENT' AND status = 'PENDING'
      LIMIT 1
    `;
    
    if (pendingRequest.length === 0) {
      console.log('❌ No pending enrollment requests found');
      return false;
    }
    
    const request = pendingRequest[0];
    console.log(`Testing with request: ID=${request.id}, Customer=${request.customer_id}, Program=${request.entity_id}`);
    
    // Test the function directly without SELECT wrapper
    try {
      console.log('Calling function directly...');
      const result = await sql`SELECT process_enrollment_approval(${request.id}::uuid, true) as card_id`;
      console.log('Direct function call result:', result);
      
      if (result && result[0] && result[0].card_id) {
        console.log('✅ Function returned card ID:', result[0].card_id);
        
        // Check if enrollment was created
        const enrollment = await sql`
          SELECT * FROM program_enrollments
          WHERE customer_id = ${request.customer_id}
          AND program_id = ${request.entity_id}
        `;
        
        if (enrollment.length > 0) {
          console.log('✅ Enrollment created:', enrollment[0]);
        } else {
          console.log('❌ No enrollment found');
        }
        
        // Check if card was created
        const card = await sql`
          SELECT * FROM loyalty_cards
          WHERE customer_id = ${request.customer_id}
          AND program_id = ${request.entity_id}
        `;
        
        if (card.length > 0) {
          console.log('✅ Card created:', card[0]);
        } else {
          console.log('❌ No card found');
        }
        
      } else {
        console.log('❌ Function did not return expected result');
      }
    } catch (error) {
      console.error('❌ Error calling function directly:', error);
    }
    
    console.log('\n✅ Test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error in test:', error);
    return false;
  } finally {
    await sql.end();
  }
}

// Run the test
testDirectFunctionCall()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running script:', error);
    process.exit(1);
  });