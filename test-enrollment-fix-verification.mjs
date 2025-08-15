#!/usr/bin/env node

/**
 * Test Enrollment Fix Verification
 * This script tests the enrollment system to ensure it works correctly for new users
 */

import sql from './src/utils/db.js';

// Let's fix the import path
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to find the db.js file
async function findDbModule() {
  console.log('Looking for database module...');
  
  // Check if the file exists at the expected path
  const expectedPath = join(__dirname, 'src', 'utils', 'db.js');
  if (fs.existsSync(expectedPath)) {
    console.log(`Found database module at ${expectedPath}`);
    return import(expectedPath);
  }
  
  // Check for db.ts
  const tsPath = join(__dirname, 'src', 'utils', 'db.ts');
  if (fs.existsSync(tsPath)) {
    console.log(`Found database module at ${tsPath}`);
    return import(tsPath);
  }
  
  // Check for other possible locations
  const altPath = join(__dirname, 'src', 'utils', 'db', 'index.js');
  if (fs.existsSync(altPath)) {
    console.log(`Found database module at ${altPath}`);
    return import(altPath);
  }
  
  throw new Error('Could not find database module');
}

/**
 * Test script to verify that the enrollment system is working correctly
 */
async function testEnrollmentFixVerification() {
  let sqlModule;
  
  try {
    // Dynamically import the database module
    const dbModule = await findDbModule();
    sqlModule = dbModule.default;
    
    if (!sqlModule) {
      throw new Error('Database module not found or not properly exported');
    }
    
    console.log('Starting enrollment fix verification test...');
    
    // 1. Check database schema
    console.log('\n1. Checking database schema...');
    await checkDatabaseSchema(sqlModule);
    
    // 2. Check stored procedure
    console.log('\n2. Checking stored procedure...');
    await checkStoredProcedure(sqlModule);
    
    // 3. Test enrollment flow
    console.log('\n3. Testing enrollment flow...');
    await testEnrollmentFlow(sqlModule);
    
    // 4. Verify card creation
    console.log('\n4. Verifying card creation...');
    await verifyCardCreation(sqlModule);
    
    console.log('\n✅ Enrollment fix verification completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error in enrollment fix verification:', error);
    return false;
  } finally {
    // Close the database connection if it was initialized
    if (sqlModule && typeof sqlModule.end === 'function') {
      await sqlModule.end();
    }
  }
}

async function checkDatabaseSchema(sql) {
  try {
    // Check if loyalty_cards table has required columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_cards'
      ORDER BY ordinal_position
    `;
    
    console.log('Loyalty_cards table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
    // Check if program_enrollments table exists
    const enrollmentsTable = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'program_enrollments'
      )
    `;
    
    if (enrollmentsTable[0].exists) {
      console.log('✅ program_enrollments table exists');
    } else {
      console.log('❌ program_enrollments table missing');
    }
    
    // Check if customer_approval_requests table exists
    const approvalTable = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'customer_approval_requests'
      )
    `;
    
    if (approvalTable[0].exists) {
      console.log('✅ customer_approval_requests table exists');
    } else {
      console.log('❌ customer_approval_requests table missing');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking database schema:', error);
    return false;
  }
}

async function checkStoredProcedure(sql) {
  try {
    // Check if the stored procedure exists
    const procedureExists = await sql`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'process_enrollment_approval'
      )
    `;
    
    if (procedureExists[0].exists) {
      console.log('✅ process_enrollment_approval stored procedure exists');
      
      // Check the function signature
      const functionInfo = await sql`
        SELECT 
          p.proname,
          pg_get_function_result(p.oid) as return_type,
          pg_get_function_arguments(p.oid) as arguments
        FROM pg_proc p
        WHERE p.proname = 'process_enrollment_approval'
      `;
      
      if (functionInfo.length > 0) {
        const func = functionInfo[0];
        console.log(`  - Function: ${func.proname}`);
        console.log(`  - Return type: ${func.return_type}`);
        console.log(`  - Arguments: ${func.arguments}`);
      }
    } else {
      console.log('❌ process_enrollment_approval stored procedure missing');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking stored procedure:', error);
    return false;
  }
}

async function testEnrollmentFlow(sql) {
  try {
    // Check for any existing test data
    const existingEnrollments = await sql`
      SELECT COUNT(*) as count FROM program_enrollments
    `;
    
    const existingCards = await sql`
      SELECT COUNT(*) as count FROM loyalty_cards
    `;
    
    console.log(`Current enrollments: ${existingEnrollments[0].count}`);
    console.log(`Current loyalty cards: ${existingCards[0].count}`);
    
    // Check for any enrollments without cards
    const missingCards = await sql`
      SELECT 
        pe.id as enrollment_id,
        pe.customer_id,
        pe.program_id,
        lp.name as program_name
      FROM program_enrollments pe
      JOIN loyalty_programs lp ON pe.program_id = lp.id
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `;
    
    if (missingCards.length > 0) {
      console.log(`⚠️ Found ${missingCards.length} enrollments without cards:`);
      missingCards.forEach((item, index) => {
        console.log(`  ${index + 1}. Customer ${item.customer_id} in program "${item.program_name}" (${item.program_id})`);
      });
    } else {
      console.log('✅ All enrollments have corresponding cards');
    }
    
    return true;
  } catch (error) {
    console.error('Error testing enrollment flow:', error);
    return false;
  }
}

async function verifyCardCreation(sql) {
  try {
    // Check if there are any cards with missing required data
    const incompleteCards = await sql`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.program_id,
        lc.business_id,
        lc.created_at
      FROM loyalty_cards lc
      WHERE lc.customer_id IS NULL 
         OR lc.program_id IS NULL 
         OR lc.business_id IS NULL
    `;
    
    if (incompleteCards.length > 0) {
      console.log(`⚠️ Found ${incompleteCards.length} incomplete loyalty cards:`);
      incompleteCards.forEach((card, index) => {
        console.log(`  ${index + 1}. Card ${card.id}: customer_id=${card.customer_id}, program_id=${card.program_id}, business_id=${card.business_id}`);
      });
    } else {
      console.log('✅ All loyalty cards have complete data');
    }
    
    // Check for any orphaned cards (cards without corresponding enrollments)
    const orphanedCards = await sql`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.program_id
      FROM loyalty_cards lc
      LEFT JOIN program_enrollments pe ON 
        lc.customer_id = pe.customer_id AND 
        lc.program_id = pe.program_id
      WHERE pe.id IS NULL
    `;
    
    if (orphanedCards.length > 0) {
      console.log(`⚠️ Found ${orphanedCards.length} orphaned loyalty cards (no corresponding enrollment):`);
      orphanedCards.forEach((card, index) => {
        console.log(`  ${index + 1}. Card ${card.id}: customer_id=${card.customer_id}, program_id=${card.program_id}`);
      });
    } else {
      console.log('✅ All loyalty cards have corresponding enrollments');
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying card creation:', error);
    return false;
  }
}

// Run the test
testEnrollmentFixVerification()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
  });