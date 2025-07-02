import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get SQL client
const sql = async (strings, ...values) => {
  const client = await pool.connect();
  try {
    const text = strings.join('?');
    const query = {
      text: text.replace(/\?/g, (_, i) => `$${i + 1}`),
      values
    };
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

async function fixEnrollmentSystem() {
  try {
    console.log('Starting comprehensive enrollment system fix...');
    
    // 1. Fix the database stored procedure
    console.log('\n1. Updating process_enrollment_approval stored procedure...');
    await fixEnrollmentProcedure();
    
    // 2. Fix stuck enrollments
    console.log('\n2. Fixing any stuck enrollments...');
    await fixStuckEnrollments();
    
    // 3. Update error handling in notification service wrapper
    console.log('\n3. Updating notification service wrapper...');
    await updateNotificationServiceWrapper();
    
    // 4. Fix the Cards component enrollment handler
    console.log('\n4. Updating Cards component enrollment handler...');
    await updateCardsComponent();
    
    console.log('\n✅ Enrollment system fix completed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Error fixing enrollment system:', error);
    return false;
  } finally {
    await pool.end();
  }
}

async function fixEnrollmentProcedure() {
  try {
    // Create or replace the function with proper transaction handling
    await sql`
      CREATE OR REPLACE FUNCTION process_enrollment_approval(request_id UUID, is_approved BOOLEAN)
      RETURNS UUID AS $$
      DECLARE
        customer_id_val INTEGER;
        business_id_val INTEGER;
        program_id_val TEXT;
        notification_id_val UUID;
        enrollment_exists BOOLEAN;
        card_id_val UUID;
        card_exists BOOLEAN;
        card_number_val TEXT;
        program_name_val TEXT;
        business_name_val TEXT;
        customer_name_val TEXT;
      BEGIN
        -- Start transaction
        BEGIN
          -- Update the approval request status
          UPDATE customer_approval_requests
          SET status = CASE WHEN is_approved THEN 'APPROVED' ELSE 'REJECTED' END,
              responded_at = NOW(),
              updated_at = NOW()
          WHERE id = request_id
          RETURNING customer_id, business_id, entity_id, notification_id INTO customer_id_val, business_id_val, program_id_val, notification_id_val;
          
          -- If customer_id is null, the request wasn't found
          IF customer_id_val IS NULL THEN
            RAISE EXCEPTION 'Approval request not found: %', request_id;
          END IF;
          
          -- Get program and business names for better notifications
          SELECT name INTO program_name_val FROM loyalty_programs WHERE id = program_id_val::uuid;
          SELECT name INTO business_name_val FROM users WHERE id = business_id_val;
          SELECT name INTO customer_name_val FROM users WHERE id = customer_id_val;
          
          -- Mark notification as actioned
          UPDATE customer_notifications
          SET action_taken = TRUE,
              is_read = TRUE,
              read_at = NOW()
          WHERE id = notification_id_val;
          
          -- Create a notification for the business about the customer's decision
          INSERT INTO customer_notifications (
            id,
            customer_id,
            business_id,
            type,
            title,
            message,
            data,
            requires_action,
            action_taken,
            is_read,
            created_at
          ) VALUES (
            gen_random_uuid(),
            business_id_val,
            business_id_val,
            CASE WHEN is_approved THEN 'ENROLLMENT_ACCEPTED' ELSE 'ENROLLMENT_REJECTED' END,
            CASE WHEN is_approved THEN 'Customer Joined Program' ELSE 'Enrollment Declined' END,
            CASE WHEN is_approved 
                THEN COALESCE(customer_name_val, 'A customer') || ' has joined your ' || COALESCE(program_name_val, 'loyalty program')
                ELSE COALESCE(customer_name_val, 'A customer') || ' has declined to join your ' || COALESCE(program_name_val, 'loyalty program')
            END,
            jsonb_build_object(
              'programId', program_id_val,
              'programName', program_name_val,
              'customerId', customer_id_val,
              'approved', is_approved
            ),
            FALSE,
            FALSE,
            FALSE,
            NOW()
          );
          
          -- Create or update customer-business relationship regardless of approval decision
          INSERT INTO customer_business_relationships (
            customer_id,
            business_id,
            status,
            created_at,
            updated_at
          ) VALUES (
            customer_id_val::text,
            business_id_val::text,
            CASE WHEN is_approved THEN 'ACTIVE' ELSE 'DECLINED' END,
            NOW(),
            NOW()
          )
          ON CONFLICT (customer_id, business_id) 
          DO UPDATE SET 
            status = CASE WHEN is_approved THEN 'ACTIVE' ELSE 'DECLINED' END,
            updated_at = NOW();
          
          -- If not approved, just return null (no card created)
          IF NOT is_approved THEN
            -- Commit transaction
            COMMIT;
            RETURN NULL;
          END IF;
          
          -- Check if already enrolled
          SELECT EXISTS (
            SELECT 1 FROM program_enrollments 
            WHERE customer_id = customer_id_val 
            AND program_id = program_id_val
          ) INTO enrollment_exists;
          
          IF enrollment_exists THEN
            -- Already enrolled, just update status if needed
            UPDATE program_enrollments
            SET status = 'ACTIVE', 
                updated_at = NOW()
            WHERE customer_id = customer_id_val 
            AND program_id = program_id_val 
            AND status != 'ACTIVE';
          ELSE
            -- Create enrollment record
            INSERT INTO program_enrollments (
              customer_id,
              program_id,
              business_id,
              status,
              current_points,
              total_points_earned,
              enrolled_at
            ) VALUES (
              customer_id_val,
              program_id_val,
              business_id_val,
              'ACTIVE',
              0,
              0,
              NOW()
            );
          END IF;
          
          -- Check if card exists
          SELECT EXISTS (
            SELECT 1 FROM loyalty_cards
            WHERE customer_id = customer_id_val
            AND program_id = program_id_val
          ) INTO card_exists;
          
          -- Create card if it doesn't exist
          IF NOT card_exists THEN
            -- Generate a unique card number
            card_number_val := 'GC-' || to_char(NOW(), 'YYMMDD') || '-' || floor(random() * 10000)::TEXT;
            
            -- Generate a new UUID for the card
            card_id_val := gen_random_uuid();
            
            -- Create the card
            INSERT INTO loyalty_cards (
              id,
              customer_id,
              program_id,
              business_id,
              card_number,
              status,
              points,
              card_type,
              tier,
              points_multiplier,
              is_active,
              created_at,
              updated_at
            ) VALUES (
              card_id_val,
              customer_id_val,
              program_id_val,
              business_id_val,
              card_number_val,
              'ACTIVE',
              0,
              'STANDARD',
              'STANDARD',
              1.0,
              true,
              NOW(),
              NOW()
            );
          ELSE
            -- Get the existing card ID
            SELECT id INTO card_id_val
            FROM loyalty_cards
            WHERE customer_id = customer_id_val
            AND program_id = program_id_val
            LIMIT 1;
          END IF;
          
          -- Create notification for customer about their new card
          INSERT INTO customer_notifications (
            id,
            customer_id,
            business_id,
            type,
            title,
            message,
            data,
            requires_action,
            action_taken,
            is_read,
            created_at
          ) VALUES (
            gen_random_uuid(),
            customer_id_val,
            business_id_val,
            'CARD_CREATED',
            'Loyalty Card Created',
            'Your loyalty card for ' || COALESCE(program_name_val, 'the loyalty program') || 
            ' at ' || COALESCE(business_name_val, 'the business') || ' is ready',
            jsonb_build_object(
              'programId', program_id_val,
              'programName', program_name_val,
              'businessName', business_name_val,
              'cardId', card_id_val
            ),
            FALSE,
            FALSE,
            FALSE,
            NOW()
          );
          
          -- Commit transaction
          COMMIT;
          
          -- Return the card ID
          RETURN card_id_val;
        EXCEPTION WHEN OTHERS THEN
          -- Rollback transaction on error
          ROLLBACK;
          RAISE;
        END;
      EXCEPTION WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE NOTICE 'Error in process_enrollment_approval: %', SQLERRM;
        RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Successfully updated process_enrollment_approval stored procedure');
    return true;
  } catch (error) {
    console.error('❌ Error updating stored procedure:', error);
    throw error;
  }
}

async function fixStuckEnrollments() {
  try {
    // Find stuck enrollments - approved but not properly processed
    const stuckEnrollments = await sql`
      SELECT ar.* 
      FROM customer_approval_requests ar
      LEFT JOIN program_enrollments pe ON 
        ar.customer_id = pe.customer_id AND 
        ar.entity_id = pe.program_id
      LEFT JOIN loyalty_cards lc ON 
        ar.customer_id = lc.customer_id AND 
        ar.entity_id = lc.program_id
      WHERE ar.request_type = 'ENROLLMENT'
      AND ar.status = 'APPROVED'
      AND (pe.id IS NULL OR lc.id IS NULL)
    `;
    
    console.log(`Found ${stuckEnrollments.length} stuck enrollments to fix`);
    
    // Fix each stuck enrollment
    for (const enrollment of stuckEnrollments) {
      try {
        const customerId = enrollment.customer_id;
        const programId = enrollment.entity_id;
        const businessId = enrollment.business_id;
        
        // Check if enrollment record exists
        const enrollmentExists = await sql`
          SELECT id FROM program_enrollments
          WHERE customer_id = ${customerId}
          AND program_id = ${programId}
        `;
        
        // Create enrollment record if missing
        if (enrollmentExists.length === 0) {
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
          `;
          
          console.log(`Created missing enrollment record for customer ${customerId} in program ${programId}`);
        }
        
        // Check if card record exists
        const cardExists = await sql`
          SELECT id FROM loyalty_cards
          WHERE customer_id = ${customerId}
          AND program_id = ${programId}
        `;
        
        // Create card record if missing
        if (cardExists.length === 0) {
          const cardId = uuidv4();
          const cardNumber = `GC-${new Date().toISOString().slice(2, 8)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          
          await sql`
            INSERT INTO loyalty_cards (
              id,
              customer_id,
              program_id,
              business_id,
              card_number,
              status,
              points,
              card_type,
              tier,
              points_multiplier,
              is_active,
              created_at,
              updated_at
            ) VALUES (
              ${cardId},
              ${customerId},
              ${programId},
              ${businessId},
              ${cardNumber},
              'ACTIVE',
              0,
              'STANDARD',
              'STANDARD',
              1.0,
              true,
              NOW(),
              NOW()
            )
          `;
          
          console.log(`Created missing card for customer ${customerId} in program ${programId}`);
        }
      } catch (error) {
        console.error(`Error fixing enrollment for customer ${enrollment.customer_id}:`, error);
      }
    }
    
    console.log('✅ Successfully fixed stuck enrollments');
    return true;
  } catch (error) {
    console.error('❌ Error fixing stuck enrollments:', error);
    throw error;
  }
}

async function updateNotificationServiceWrapper() {
  try {
    const filePath = './src/services/customerNotificationServiceWrapper.ts';
    
    // Create the updated content with better error handling
    const updatedContent = `import { v4 as uuidv4 } from 'uuid';
import sql from '../utils/db';
import { CustomerNotificationService } from './customerNotificationService';
import { ApprovalResponse } from '../types/customer';
import { EnrollmentErrorCode } from '../types/enrollment';
import { 
  createDetailedError, 
  reportEnrollmentError, 
  formatEnrollmentErrorForUser 
} from '../utils/enrollmentErrorHandler';
import logger from '../utils/logger';

/**
 * Safe wrapper for responding to approval requests
 * This handles enrollment approvals through a database transaction
 * to ensure consistency between approval status, enrollments, and cards
 * 
 * @param requestId The approval request ID
 * @param approved Whether the request is approved or declined
 * @returns Promise with the result of the approval
 */
export async function safeRespondToApproval(requestId: string, approved: boolean): Promise<ApprovalResponse> {
  let cardId: string | null = null;
  
  try {
    // First, get the request details to determine the type
    const requestDetails = await sql\`
      SELECT 
        ar.request_type,
        ar.customer_id,
        ar.business_id,
        ar.entity_id as program_id,
        ar.notification_id,
        lp.name as program_name,
        u.name as business_name
      FROM customer_approval_requests ar
      LEFT JOIN loyalty_programs lp ON ar.entity_id = lp.id::text
      LEFT JOIN users u ON ar.business_id = u.id
      WHERE ar.id = \${requestId}
    \`;
    
    if (!requestDetails || requestDetails.length === 0) {
      const error = createDetailedError(
        EnrollmentErrorCode.APPROVAL_REQUEST_NOT_FOUND,
        \`Approval request not found: \${requestId}\`,
        'safeRespondToApproval'
      );
      reportEnrollmentError(error, { requestId });
      return { 
        success: false, 
        error: formatEnrollmentErrorForUser(error)
      };
    }
    
    const requestType = requestDetails[0].request_type;
    
    if (requestType === 'ENROLLMENT') {
      try {
        // Use the stored procedure for enrollment approvals
        const result = await sql\`
          SELECT process_enrollment_approval(\${requestId}::uuid, \${approved})
        \`;
        
        if (result && result[0] && result[0].process_enrollment_approval) {
          cardId = result[0].process_enrollment_approval;
        }
        
        // Return success response with appropriate message
        return {
          success: true,
          message: approved 
            ? \`Successfully joined \${requestDetails[0].program_name || 'the program'}\`
            : \`Declined to join \${requestDetails[0].program_name || 'the program'}\`,
          cardId: cardId
        };
      } catch (dbError: any) {
        logger.error('Database error in enrollment approval', { 
          error: dbError, 
          requestId, 
          approved 
        });
        
        const error = createDetailedError(
          EnrollmentErrorCode.TRANSACTION_ERROR,
          \`Database transaction error: \${dbError.message || 'Unknown error'}\`,
          'enrollment_transaction_handler'
        );
        reportEnrollmentError(error, { requestId, approved });
        return { 
          success: false, 
          error: formatEnrollmentErrorForUser(error)
        };
      }
    } else {
      // For other request types, use the standard response method
      // This is for future expansion to other approval types
      const success = await CustomerNotificationService.respondToApproval(requestId, approved);
      if (!success) {
        const error = createDetailedError(
          EnrollmentErrorCode.GENERIC_ERROR,
          \`Failed to process approval response\`,
          'approval_handler'
        );
        reportEnrollmentError(error, { requestId, approved });
        return { 
          success: false, 
          error: formatEnrollmentErrorForUser(error)
        };
      }
      
      return {
        success: true,
        message: approved 
          ? 'Request approved successfully' 
          : 'Request declined successfully'
      };
    }
  } catch (error: any) {
    logger.error('Unexpected error in safeRespondToApproval', { error, requestId, approved });
    
    const reportedError = createDetailedError(
      EnrollmentErrorCode.UNKNOWN_ERROR,
      \`Unexpected error: \${error.message || 'Unknown error'}\`,
      'safeRespondToApproval'
    );
    reportEnrollmentError(reportedError, { requestId, approved });
    
    return { 
      success: false, 
      error: formatEnrollmentErrorForUser(reportedError)
    };
  }
}
`;
    
    // Write the updated content
    fs.writeFileSync(filePath, updatedContent);
    
    console.log('✅ Successfully updated customerNotificationServiceWrapper.ts');
    return true;
  } catch (error) {
    console.error('❌ Error updating service wrapper:', error);
    throw error;
  }
}

async function updateCardsComponent() {
  try {
    const filePath = './src/pages/customer/Cards.tsx';
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find the handleEnrollmentResponse function
    const regex = /const handleEnrollmentResponse = async \(approved: boolean\) => \{[\s\S]*?\};/;
    
    // Check if function exists
    if (!regex.test(content)) {
      console.error('Could not find handleEnrollmentResponse function in Cards.tsx');
      return false;
    }
    
    // Create the updated function
    const updatedFunction = `const handleEnrollmentResponse = async (approved: boolean) => {
    if (!enrollmentRequestState.approvalId) return;
    
    try {
      // Show loading state
      setIsLoading(true);
      
      // Import the safer wrapper service
      const { safeRespondToApproval } = await import('../../services/customerNotificationServiceWrapper');
      
      // Call the wrapper service with proper error handling
      const result = await safeRespondToApproval(
        enrollmentRequestState.approvalId,
        approved
      );
      
      if (result.success) {
        if (approved) {
          addNotification('success', \`You've joined \${enrollmentRequestState.programName}\`);
          
          // Refresh card data
          await refetch();
        } else {
          addNotification('info', \`Declined to join \${enrollmentRequestState.programName}\`);
        }
        
        // Close the modal
        setEnrollmentRequestState({
          isOpen: false,
          businessId: null,
          businessName: null,
          programId: null,
          programName: null,
          notificationId: null,
          approvalId: null
        });
      } else {
        addNotification('error', result.error || 'Failed to process your response');
      }
    } catch (error) {
      console.error('Error responding to enrollment request:', error);
      addNotification('error', 'An error occurred while processing your response');
    } finally {
      setIsLoading(false);
    }
  };`;
    
    // Replace the function in the file
    const updatedContent = content.replace(regex, updatedFunction);
    
    // Write the updated content
    fs.writeFileSync(filePath, updatedContent);
    
    console.log('✅ Successfully updated Cards.tsx');
    return true;
  } catch (error) {
    console.error('❌ Error updating Cards component:', error);
    throw error;
  }
}

// Run the function
fixEnrollmentSystem()
  .then((success) => {
    if (success) {
      console.log('Enrollment system fix completed successfully');
      process.exit(0);
    } else {
      console.log('Enrollment system fix failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
