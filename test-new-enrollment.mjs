#!/usr/bin/env node

/**
 * Test New Enrollment
 * This script tests the enrollment process with a new user/program combination
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

async function testNewEnrollment() {
  // Create a fresh connection
  const sql = postgres(DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 1
  });
  
  try {
    console.log('Testing new enrollment process...');
    
    // Test with Customer 29, Program 11 (new enrollment)
    const customerId = 29;
    const programId = 11;
    const requestId = '91fab0d8-423e-4867-90cc-e395f6c89a95';
    
    console.log(`Testing with: Customer ${customerId}, Program ${programId}, Request ${requestId}`);
    
    // Check initial state
    console.log('\n1. Checking initial state...');
    
    // First get the customer record ID for user 29
    const customerRecord = await sql`
      SELECT id FROM customers WHERE user_id = ${customerId}
    `;
    const actualCustomerId = customerRecord[0]?.id;
    console.log('Customer record ID:', actualCustomerId || 'Not found');
    
    const initialEnrollment = await sql`
      SELECT * FROM program_enrollments
      WHERE customer_id = ${actualCustomerId} AND program_id = ${programId}
    `;
    console.log('Initial enrollment:', initialEnrollment[0] || 'None');
    
    const initialCard = await sql`
      SELECT * FROM loyalty_cards
      WHERE customer_id = ${actualCustomerId} AND program_id = ${programId}
    `;
    console.log('Initial card:', initialCard[0] || 'None');
    
    // Test the stored procedure
    console.log('\n2. Testing stored procedure...');
    try {
      const result = await sql`SELECT process_enrollment_approval(${requestId}::uuid, true) as card_id`;
      console.log('Stored procedure result:', result);
      
      if (result && result[0] && result[0].card_id) {
        console.log('✅ Function returned card ID:', result[0].card_id);
        
        // Check final state
        console.log('\n3. Checking final state...');
        const finalEnrollment = await sql`
          SELECT * FROM program_enrollments
          WHERE customer_id = ${actualCustomerId} AND program_id = ${programId}
        `;
        console.log('Final enrollment:', finalEnrollment[0] || 'None');
        
        const finalCard = await sql`
          SELECT * FROM loyalty_cards
          WHERE customer_id = ${actualCustomerId} AND program_id = ${programId}
        `;
        console.log('Final card:', finalCard[0] || 'None');
        
        // Check if approval request was updated
        const updatedRequest = await sql`
          SELECT status, response_at FROM customer_approval_requests
          WHERE id = ${requestId}
        `;
        console.log('Updated request:', updatedRequest[0] || 'None');
        
        if (finalEnrollment.length > 0 && finalCard.length > 0) {
          console.log('\n🎉 SUCCESS: New enrollment and card created successfully!');
        } else {
          console.log('\n❌ FAILED: Enrollment or card not created');
        }
        
      } else {
        console.log('❌ Function did not return expected result');
      }
    } catch (error) {
      console.error('❌ Error calling function:', error);
    }
    
    console.log('\n✅ Test completed!');
    return true;
  } catch (error) {
    console.error('❌ Error in test:', error);
    return false;
  } finally {
    await sql.end();
  }
}

// Run the test
testNewEnrollment()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running script:', error);
    process.exit(1);
  });