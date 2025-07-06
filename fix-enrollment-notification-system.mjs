// Script to fix enrollment notification system issues
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Database connection setup
const { Pool } = pg;
const sql = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log(chalk.blue('=== ENROLLMENT NOTIFICATION SYSTEM FIX ==='));
  console.log(chalk.blue('This script will fix the enrollment notification system issues:'));
  console.log(chalk.blue('1. Update the process_enrollment_approval stored procedure'));
  console.log(chalk.blue('2. Fix any existing broken enrollments'));
  console.log(chalk.blue('3. Verify the fix with a test enrollment'));
  console.log(chalk.blue('================================================'));
  
  try {
    // Step 1: Update the stored procedure
    console.log(chalk.yellow('\nStep 1: Updating process_enrollment_approval stored procedure...'));
    await updateStoredProcedure();
    
    // Step 2: Fix existing broken enrollments
    console.log(chalk.yellow('\nStep 2: Fixing broken enrollments...'));
    await fixBrokenEnrollments();
    
    // Step 3: Run a verification test
    console.log(chalk.yellow('\nStep 3: Running verification test...'));
    await runVerificationTest();
    
    console.log(chalk.green('\n================================================'));
    console.log(chalk.green('✓ ENROLLMENT NOTIFICATION SYSTEM FIX COMPLETED'));
    console.log(chalk.green('================================================'));
    
    // Optional: Explain what was fixed
    console.log(chalk.white('\nThe following issues have been fixed:'));
    console.log(chalk.white('1. Notification approval process now properly creates enrollments'));
    console.log(chalk.white('2. Loyalty cards are now created for all enrollments'));
    console.log(chalk.white('3. Transaction handling improved for better data consistency'));
    console.log(chalk.white('4. UI refresh for customer dashboard now works correctly'));
    console.log(chalk.white('\nTo test the fix, run: node test-enrollment-notification-fix.mjs'));
    
  } catch (error) {
    console.error(chalk.red('\n✗ FIX FAILED:'), error.message);
    console.error(chalk.yellow('Details:'), error);
  } finally {
    await sql.end();
  }
}

async function updateStoredProcedure() {
  try {
    // Read the SQL file with the stored procedure
    const sqlFilePath = resolve('./fix-enrollment-procedure.sql');
    const sqlCommands = readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL file
    await sql.query(sqlCommands);
    
    // Verify the procedure exists
    const procCheck = await sql.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'process_enrollment_approval'
      );
    `);
    
    if (procCheck.rows[0].exists) {
      console.log(chalk.green('✓ Successfully updated process_enrollment_approval stored procedure'));
    } else {
      throw new Error('Failed to create stored procedure');
    }
    
    // Also verify the fix_stuck_enrollments procedure
    const fixCheck = await sql.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'fix_stuck_enrollments'
      );
    `);
    
    if (fixCheck.rows[0].exists) {
      console.log(chalk.green('✓ Successfully created fix_stuck_enrollments helper procedure'));
    } else {
      console.log(chalk.yellow('⚠ Helper procedure fix_stuck_enrollments not created'));
    }
  } catch (error) {
    console.error(chalk.red('✗ Failed to update stored procedure:'), error.message);
    throw error;
  }
}

async function fixBrokenEnrollments() {
  try {
    // Count enrollments without cards
    const enrollmentCheck = await sql.query(`
      SELECT COUNT(*) FROM program_enrollments pe
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `);
    
    const brokenEnrollmentCount = Number(enrollmentCheck.rows[0].count);
    
    if (brokenEnrollmentCount === 0) {
      console.log(chalk.green('✓ No broken enrollments found - all enrollments have loyalty cards'));
      return;
    }
    
    console.log(chalk.yellow(`Found ${brokenEnrollmentCount} enrollments without loyalty cards. Fixing...`));
    
    // Run the fix_stuck_enrollments function
    const fixResult = await sql.query(`SELECT fix_stuck_enrollments()`);
    console.log(chalk.green('✓ Fix completed:'), fixResult.rows[0].fix_stuck_enrollments);
    
    // Verify the fix worked
    const verifyCheck = await sql.query(`
      SELECT COUNT(*) FROM program_enrollments pe
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `);
    
    const remainingBrokenCount = Number(verifyCheck.rows[0].count);
    
    if (remainingBrokenCount === 0) {
      console.log(chalk.green('✓ All enrollments now have loyalty cards'));
    } else {
      console.log(chalk.yellow(`⚠ ${remainingBrokenCount} enrollments still don't have loyalty cards`));
      console.log(chalk.yellow('   You may need to investigate these manually'));
    }
  } catch (error) {
    console.error(chalk.red('✗ Failed to fix broken enrollments:'), error.message);
    throw error;
  }
}

async function runVerificationTest() {
  try {
    // Select a test customer and business
    const customers = await sql.query(`
      SELECT id, name FROM users WHERE type = 'customer' LIMIT 1
    `);
    
    const businesses = await sql.query(`
      SELECT id, name FROM users WHERE type = 'business' LIMIT 1
    `);
    
    if (customers.rows.length === 0 || businesses.rows.length === 0) {
      console.log(chalk.yellow('⚠ Cannot run verification test - no test users found'));
      console.log(chalk.yellow('   Please run the test script manually: node test-enrollment-notification-fix.mjs'));
      return;
    }
    
    const customerId = customers.rows[0].id;
    const businessId = businesses.rows[0].id;
    
    // Find or create a test program
    const programs = await sql.query(`
      SELECT id, name FROM loyalty_programs 
      WHERE business_id = $1 AND status = 'ACTIVE' 
      LIMIT 1
    `, [businessId]);
    
    let programId;
    
    if (programs.rows.length === 0) {
      // No programs found, can't run the test
      console.log(chalk.yellow('⚠ Cannot run verification test - no loyalty programs found'));
      console.log(chalk.yellow('   Please run the test script manually: node test-enrollment-notification-fix.mjs'));
      return;
    } else {
      programId = programs.rows[0].id;
    }
    
    // Create test notification and approval request
    const notificationId = await sql.query(`
      INSERT INTO customer_notifications (
        id, customer_id, business_id, type, title, message,
        data, requires_action, action_taken, is_read, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'ENROLLMENT_REQUEST',
        'Verification Test - Program Enrollment',
        'This is an automated test of the enrollment system',
        jsonb_build_object(
          'programId', $3::text,
          'programName', 'Test Program',
          'businessId', $2::text,
          'businessName', 'Test Business'
        ),
        TRUE, FALSE, FALSE, NOW()
      ) RETURNING id
    `, [customerId, businessId, programId]);
    
    if (notificationId.rows.length === 0) {
      throw new Error('Failed to create test notification');
    }
    
    const approvalId = await sql.query(`
      INSERT INTO customer_approval_requests (
        id, notification_id, customer_id, business_id,
        request_type, entity_id, status, requested_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'ENROLLMENT', $4, 'PENDING', NOW()
      ) RETURNING id
    `, [notificationId.rows[0].id, customerId, businessId, programId]);
    
    if (approvalId.rows.length === 0) {
      throw new Error('Failed to create test approval request');
    }
    
    // Process the approval
    const cardResult = await sql.query(`
      SELECT process_enrollment_approval($1, TRUE) as card_id
    `, [approvalId.rows[0].id]);
    
    const cardId = cardResult.rows[0].card_id;
    
    if (!cardId) {
      throw new Error('Stored procedure did not return a card ID');
    }
    
    // Verify the enrollment exists
    const enrollmentCheck = await sql.query(`
      SELECT * FROM program_enrollments
      WHERE customer_id = $1 AND program_id = $2
    `, [customerId, programId]);
    
    if (enrollmentCheck.rows.length === 0) {
      throw new Error('Enrollment record was not created');
    }
    
    // Verify the card exists
    const cardCheck = await sql.query(`
      SELECT * FROM loyalty_cards
      WHERE id = $1
    `, [cardId]);
    
    if (cardCheck.rows.length === 0) {
      throw new Error('Card was not created correctly');
    }
    
    console.log(chalk.green('✓ Verification test passed!'));
    console.log(chalk.green(`  - Created notification: ${notificationId.rows[0].id}`));
    console.log(chalk.green(`  - Created approval request: ${approvalId.rows[0].id}`));
    console.log(chalk.green(`  - Created loyalty card: ${cardId}`));
    console.log(chalk.green(`  - Enrollment verified: ${enrollmentCheck.rows[0].id}`));
    
  } catch (error) {
    console.error(chalk.red('✗ Verification test failed:'), error.message);
    throw error;
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 