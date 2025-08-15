#!/usr/bin/env node

/**
 * Simple Enrollment Test
 * This script tests the basic enrollment process to identify where it's failing
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

// Create database connection
const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 10
});

async function testSimpleEnrollment() {
  try {
    console.log('Starting simple enrollment test...');
    
    // 1. Check if the stored procedure exists
    console.log('\n1. Checking stored procedure...');
    const procedureExists = await sql`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'process_enrollment_approval'
      )
    `;
    
    if (procedureExists[0].exists) {
      console.log('✅ process_enrollment_approval stored procedure exists');
    } else {
      console.log('❌ process_enrollment_approval stored procedure missing');
      return false;
    }
    
    // 2. Check if we have any approval requests
    console.log('\n2. Checking approval requests...');
    
    // First check what columns exist in the customer_approval_requests table
    const approvalColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_approval_requests'
      ORDER BY ordinal_position
    `;
    
    console.log('Customer approval requests table columns:');
    approvalColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    const approvalRequests = await sql`
      SELECT 
        ar.id,
        ar.customer_id,
        ar.business_id,
        ar.entity_id,
        ar.request_type,
        ar.status
      FROM customer_approval_requests ar
      WHERE ar.request_type = 'ENROLLMENT'
      ORDER BY ar.id DESC
      LIMIT 5
    `;
    
    if (approvalRequests.length === 0) {
      console.log('❌ No enrollment approval requests found');
      return false;
    }
    
    console.log(`Found ${approvalRequests.length} enrollment approval requests:`);
    approvalRequests.forEach((req, index) => {
      console.log(`  ${index + 1}. ID: ${req.id}, Customer: ${req.customer_id}, Program: ${req.entity_id}, Status: ${req.status}`);
    });
    
    // 3. Check if we have any program enrollments
    console.log('\n3. Checking program enrollments...');
    
    // First check what columns exist in the program_enrollments table
    const enrollmentColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'program_enrollments'
      ORDER BY ordinal_position
    `;
    
    console.log('Program enrollments table columns:');
    enrollmentColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    const enrollments = await sql`
      SELECT 
        pe.id,
        pe.customer_id,
        pe.program_id,
        pe.status
      FROM program_enrollments pe
      ORDER BY pe.id DESC
      LIMIT 5
    `;
    
    console.log(`Found ${enrollments.length} program enrollments:`);
    enrollments.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. ID: ${enrollment.id}, Customer: ${enrollment.customer_id}, Program: ${enrollment.program_id}, Status: ${enrollment.status}`);
    });
    
    // 4. Check if we have any loyalty cards
    console.log('\n4. Checking loyalty cards...');
    
    // First check what columns exist in the loyalty_cards table
    const cardColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_cards'
      ORDER BY ordinal_position
    `;
    
    console.log('Loyalty cards table columns:');
    cardColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    const cards = await sql`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.program_id,
        lc.business_id
      FROM loyalty_cards lc
      ORDER BY lc.id DESC
      LIMIT 5
    `;
    
    console.log(`Found ${cards.length} loyalty cards:`);
    cards.forEach((card, index) => {
      console.log(`  ${index + 1}. ID: ${card.id}, Customer: ${card.customer_id}, Program: ${card.program_id}, Business: ${card.business_id}`);
    });
    
    // 5. Check for enrollments without cards
    console.log('\n5. Checking for enrollments without cards...');
    const missingCards = await sql`
      SELECT 
        pe.id as enrollment_id,
        pe.customer_id,
        pe.program_id
      FROM program_enrollments pe
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `;
    
    if (missingCards.length > 0) {
      console.log(`⚠️ Found ${missingCards.length} enrollments without cards:`);
      missingCards.forEach((item, index) => {
        console.log(`  ${index + 1}. Enrollment ${item.enrollment_id}: Customer ${item.customer_id}, Program ${item.program_id}`);
      });
    } else {
      console.log('✅ All enrollments have corresponding cards');
    }
    
    // 6. Test the stored procedure with a sample request
    console.log('\n6. Testing stored procedure...');
    if (approvalRequests.length > 0) {
      const testRequest = approvalRequests[0];
      console.log(`Testing with request ID: ${testRequest.id}`);
      
      try {
        const result = await sql`SELECT process_enrollment_approval(${testRequest.id}::uuid, true)`;
        console.log('Stored procedure result:', result);
        
        if (result && result[0] && result[0].process_enrollment_approval) {
          console.log('✅ Stored procedure returned:', result[0].process_enrollment_approval);
        } else {
          console.log('❌ Stored procedure did not return expected result');
        }
      } catch (error) {
        console.error('❌ Error calling stored procedure:', error);
      }
    }
    
    // 7. Check if customer_business_relationships table exists
    console.log('\n7. Checking customer_business_relationships table...');
    const relationshipTableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'customer_business_relationships'
      )
    `;
    
    if (relationshipTableExists[0].exists) {
      console.log('✅ customer_business_relationships table exists');
      
      // Check its structure
      const relationshipColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'customer_business_relationships'
        ORDER BY ordinal_position
      `;
      
      console.log('Customer business relationships table columns:');
      relationshipColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ customer_business_relationships table missing');
    }
    
    console.log('\n✅ Simple enrollment test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error in simple enrollment test:', error);
    return false;
  }
}

// Run the test
testSimpleEnrollment()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
  });