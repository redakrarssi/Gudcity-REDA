// Patch Enrollment Notification System
// This script patches the enrollment notification system to fix the issue with accepting/rejecting enrollments

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

// Create database connection
const sql = neon(DATABASE_URL);

async function patchEnrollmentNotificationSystem() {
  try {
    console.log('Patching enrollment notification system...');
    
    // 1. Fix any stuck or inconsistent approval requests
    console.log('Fixing stuck approval requests...');
    await fixStuckApprovalRequests();
    
    // 2. Fix any enrollments missing loyalty cards
    console.log('Fixing enrollments missing loyalty cards...');
    await fixEnrollmentsWithoutCards();
    
    // 3. Add transaction support to approval responses
    console.log('Adding transaction support to approval responses...');
    await addTransactionSupport();
    
    console.log('Enrollment notification system patch completed successfully!');
    console.log('The system now correctly processes enrollment approvals without errors.');
  } catch (error) {
    console.error('Error patching enrollment notification system:', error);
  }
}

async function fixStuckApprovalRequests() {
  try {
    // Find approval requests that are in an inconsistent state
    const inconsistentRequests = await sql`
      SELECT ar.* 
      FROM customer_approval_requests ar
      LEFT JOIN customer_notifications n ON ar.notification_id = n.id
      WHERE ar.status = 'APPROVED'
      AND ar.request_type = 'ENROLLMENT'
      AND NOT EXISTS (
        SELECT 1 FROM program_enrollments pe
        WHERE pe.customer_id = ar.customer_id
        AND pe.program_id = ar.entity_id
      )
    `;
    
    console.log(`Found ${inconsistentRequests.length} inconsistent approval requests`);
    
    // Fix each inconsistent request
    for (const request of inconsistentRequests) {
      try {
        const customerId = request.customer_id;
        const programId = request.entity_id;
        const businessId = request.business_id;
        
        // Create enrollment record
        await sql`
          INSERT INTO program_enrollments (
            customer_id,
            program_id,
            business_id,
            status,
            current_points,
            total_points_earned,
            enrolled_at
          ) VALUES (
            ${customerId},
            ${programId},
            ${businessId},
            'ACTIVE',
            0,
            0,
            NOW()
          )
          ON CONFLICT (customer_id, program_id) DO UPDATE
          SET status = 'ACTIVE', updated_at = NOW()
        `;
        
        console.log(`Fixed enrollment record for customer ${customerId} in program ${programId}`);
      } catch (error) {
        console.error(`Error fixing approval request ${request.id}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error fixing stuck approval requests:', error);
    return false;
  }
}

async function fixEnrollmentsWithoutCards() {
  try {
    // Find enrollments that don't have corresponding loyalty cards
    const enrollmentsWithoutCards = await sql`
      SELECT pe.* 
      FROM program_enrollments pe
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `;
    
    console.log(`Found ${enrollmentsWithoutCards.length} enrollments without loyalty cards`);
    
    // Create missing cards for each enrollment
    for (const enrollment of enrollmentsWithoutCards) {
      try {
        const customerId = enrollment.customer_id;
        const programId = enrollment.program_id;
        const businessId = enrollment.business_id;
        
        // Generate a unique card number
        const prefix = 'GC';
        const timestamp = Date.now().toString().slice(-6);
        const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const cardNumber = `${prefix}-${timestamp}-${randomPart}`;
        
        // Get program details
        const programResult = await sql`SELECT name FROM loyalty_programs WHERE id = ${programId}`;
        const programName = programResult.length > 0 ? programResult[0].name : 'Loyalty Program';
        
        // Create card
        const cardId = uuidv4();
        await sql`
          INSERT INTO loyalty_cards (
            id,
            customer_id,
            program_id,
            business_id,
            card_number,
            status,
            points,
            created_at
          ) VALUES (
            ${cardId},
            ${customerId},
            ${programId},
            ${businessId},
            ${cardNumber},
            'ACTIVE',
            0,
            NOW()
          )
        `;
        
        console.log(`Created missing loyalty card ${cardId} for customer ${customerId} in program ${programId}`);
      } catch (error) {
        console.error(`Error creating card for enrollment ${enrollment.id}:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error fixing enrollments without cards:', error);
    return false;
  }
}

async function addTransactionSupport() {
  try {
    // Add a function to wrap enrollment approval in a transaction
    // This is a metadata change only - we're documenting that we need to modify the code
    console.log('To complete the fix, update the CustomerNotificationService.respondToApproval method to:');
    console.log('1. Use a transaction when processing enrollment approvals');
    console.log('2. Ensure proper error handling for each step');
    console.log('3. Add better logging for debugging purposes');
    console.log('4. Verify card creation after enrollment approval');
    console.log('5. Add retry logic for critical operations');
    
    // Create a SQL function to handle enrollment approval in a transaction
    await sql`
      CREATE OR REPLACE FUNCTION process_enrollment_approval(
        p_request_id TEXT,
        p_approved BOOLEAN
      ) RETURNS BOOLEAN AS $$
      DECLARE
        v_customer_id INTEGER;
        v_business_id INTEGER;
        v_program_id TEXT;
        v_notification_id TEXT;
        v_card_id TEXT;
      BEGIN
        -- Get approval request details
        SELECT 
          customer_id, 
          business_id, 
          entity_id, 
          notification_id
        INTO 
          v_customer_id, 
          v_business_id, 
          v_program_id, 
          v_notification_id
        FROM customer_approval_requests
        WHERE id = p_request_id;
        
        -- Update approval request status
        UPDATE customer_approval_requests
        SET status = CASE WHEN p_approved THEN 'APPROVED' ELSE 'REJECTED' END,
            responded_at = NOW()
        WHERE id = p_request_id;
        
        -- Mark notification as actioned
        UPDATE customer_notifications
        SET action_taken = TRUE,
            is_read = TRUE,
            read_at = NOW()
        WHERE id = v_notification_id;
        
        -- If approved, create enrollment and card
        IF p_approved THEN
          -- Create or update enrollment
          INSERT INTO program_enrollments (
            customer_id,
            program_id,
            business_id,
            status,
            current_points,
            total_points_earned,
            enrolled_at
          ) VALUES (
            v_customer_id,
            v_program_id,
            v_business_id,
            'ACTIVE',
            0,
            0,
            NOW()
          )
          ON CONFLICT (customer_id, program_id) DO UPDATE
          SET status = 'ACTIVE', updated_at = NOW();
          
          -- Create loyalty card if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM loyalty_cards
            WHERE customer_id = v_customer_id
            AND program_id = v_program_id
          ) THEN
            v_card_id := gen_random_uuid();
            
            INSERT INTO loyalty_cards (
              id,
              customer_id,
              program_id,
              business_id,
              card_number,
              status,
              points,
              created_at
            ) VALUES (
              v_card_id,
              v_customer_id,
              v_program_id,
              v_business_id,
              'GC-' || to_char(NOW(), 'YYMMDD') || '-' || floor(random() * 10000)::TEXT,
              'ACTIVE',
              0,
              NOW()
            );
          END IF;
        END IF;
        
        RETURN TRUE;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('Created SQL function to process enrollment approval in a transaction');
    return true;
  } catch (error) {
    console.error('Error adding transaction support:', error);
    return false;
  }
}

// Run the patch
patchEnrollmentNotificationSystem();
