/**
 * CustomerNotificationService Wrapper
 * 
 * This file provides a wrapper for the CustomerNotificationService's respondToApproval method
 * that uses our new SQL function for better transaction handling.
 */

import sql from '../utils/db';
import { logger } from '../utils/logger';
import { CustomerNotificationService } from './customerNotificationService';
import { LoyaltyCardService } from './loyaltyCardService';
import * as serverFunctions from '../server';
import { createNotificationSyncEvent, createEnrollmentSyncEvent, createCardSyncEvent, createBusinessCustomerSyncEvent } from '../utils/realTimeSync';
import { 
  EnrollmentErrorCode, 
  createDetailedError, 
  reportEnrollmentError,
  formatEnrollmentErrorForUser
} from '../utils/enrollmentErrorReporter';
import { 
  ApprovalResponse, 
  CustomerNotification,
  CustomerNotificationType
} from '../types/customer';
import { ensureEnrollmentProcedureExists } from '../utils/db';
import { queryClient } from '../utils/queryClient';

/**
 * Maximum retry attempts for database operations
 */
const MAX_RETRIES = 5; // Increased from 3 to 5 for more reliability

/**
 * Helper function to retry database operations with exponential backoff
 */
async function withRetry<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    // Use a race with a timeout to handle hanging connections
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), 10000)
      )
    ]) as T;
  } catch (error) {
    if (retries <= 0) throw error;
    
    // Wait with exponential backoff
    const delay = Math.min(1000 * (2 ** (MAX_RETRIES - retries)), 5000);
    logger.warn(`Operation failed, retrying in ${delay}ms`, { retriesLeft: retries, error });
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(operation, retries - 1);
  }
}

/**
 * Safely respond to an approval request with proper error handling and transaction support
 * Uses a stored procedure for enrollment approvals to ensure atomicity
 */
export async function safeRespondToApproval(requestId: string, approved: boolean): Promise<ApprovalResponse> {
  logger.info('Processing approval response', { requestId, approved });
  
  // Use an AbortController to prevent request cancellation
  const controller = new AbortController();
  const signal = controller.signal;
  
  try {
    // Ensure our stored procedure exists
    await ensureEnrollmentProcedureExists();
    
    // Get the request details first
    const request = await sql`
      SELECT 
        r.id, 
        r.customer_id as "customerId", 
        r.business_id as "businessId", 
        r.entity_id as "entityId", 
        r.request_type as "requestType",
        r.data,
        n.id as "notificationId",
        u1.name as "businessName",
        u2.name as "customerName",
        lp.name as "programName"
      FROM customer_approval_requests r
      LEFT JOIN customer_notifications n ON r.notification_id = n.id
      LEFT JOIN users u1 ON r.business_id = u1.id
      LEFT JOIN users u2 ON r.customer_id = u2.id
      LEFT JOIN loyalty_programs lp ON r.entity_id = lp.id::text
      WHERE r.id = ${requestId}
    `;
    
    if (!request || request.length === 0) {
      const error = createDetailedError(
        EnrollmentErrorCode.REQUEST_NOT_FOUND,
        `Approval request not found: ${requestId}`,
        'request_lookup'
      );
      reportEnrollmentError(error);
      return { 
        success: false, 
        error: formatEnrollmentErrorForUser(error),
        errorCode: EnrollmentErrorCode.REQUEST_NOT_FOUND
      };
    }
    
    const { customerId, businessId, entityId, requestType, programName, businessName, customerName, notificationId } = request[0];
    
    // Call the stored procedure based on request type
    let cardId: string | undefined;
    
    if (requestType === 'ENROLLMENT') {
      try {
        // Handle enrollment approval with robust error handling and retries
        // Use withRetry for database operation with timeout handling
        const result = await withRetry(async () => {
          return await sql`SELECT process_enrollment_approval(${requestId}::uuid, ${approved})`;
        });
        
        if (result && result[0] && result[0].process_enrollment_approval) {
          cardId = result[0].process_enrollment_approval;
        }
        
        // Double check the notification is marked as actioned
        if (notificationId) {
          try {
            await sql`
              UPDATE customer_notifications
              SET action_taken = TRUE, is_read = TRUE, read_at = NOW()
              WHERE id = ${notificationId}
            `;
          } catch (notifError) {
            logger.warn('Failed to update notification status', { notificationId, error: notifError });
            // Non-critical error, continue execution
          }
        }
        
        // Verify enrollment record exists if approved
        if (approved) {
          const enrollmentCheck = await sql`
            SELECT id FROM program_enrollments
            WHERE customer_id = ${customerId}
            AND program_id = ${entityId}
          `;
          
          if (!enrollmentCheck || enrollmentCheck.length === 0) {
            logger.warn('Enrollment record not found after approval', { customerId, programId: entityId });
            
            // Try to create enrollment if missing
            try {
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
                  ${entityId},
                  ${businessId},
                  'ACTIVE',
                  0,
                  0,
                  NOW()
                )
                ON CONFLICT (customer_id, program_id) 
                DO UPDATE SET status = 'ACTIVE', updated_at = NOW()
              `;
              
              logger.info('Created missing enrollment record', { customerId, programId: entityId });
            } catch (fixError) {
              logger.error('Failed to create missing enrollment record', { error: fixError });
            }
          }
          
          // ENSURE CARD CREATION - This is critical
          // Even if we have a cardId, force sync the cards again to be sure
          try {
            // First try to directly create the card if needed
            if (!cardId) {
              const cardResult = await withRetry(async () => {
                return await sql`
                  INSERT INTO loyalty_cards (
                    customer_id,
                    business_id,
                    program_id,
                    card_number,
                    card_type,
                    status,
                    points,
                    created_at,
                    updated_at
                  )
                  SELECT
                    ${customerId},
                    ${businessId},
                    ${entityId},
                    'GC-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6) || '-C',
                    'STANDARD',
                    'ACTIVE',
                    0,
                    NOW(),
                    NOW()
                  WHERE NOT EXISTS (
                    SELECT 1 FROM loyalty_cards
                    WHERE customer_id = ${customerId}
                    AND program_id = ${entityId}
                  )
                  RETURNING id
                `;
              });
              
              if (cardResult && cardResult.length > 0) {
                cardId = cardResult[0].id;
                logger.info('Created missing card directly', { cardId, customerId, programId: entityId });
              }
            }
            
            // Verify card exists again or use service to create it
            const cardCheck = await sql`
              SELECT id FROM loyalty_cards
              WHERE customer_id = ${customerId}
              AND program_id = ${entityId}
            `;
            
            if (!cardCheck || cardCheck.length === 0) {
              logger.warn('Card still not found, using service to create it', { customerId, programId: entityId });
              
              // Use the card service to ensure the card is created
              const createdCardIds = await LoyaltyCardService.syncEnrollmentsToCards(String(customerId));
              
              if (createdCardIds && createdCardIds.length > 0) {
                logger.info('Created cards through service', { createdCardIds, customerId });
                
                // Get the ID of the card we just created
                const newCardCheck = await sql`
                  SELECT id FROM loyalty_cards
                  WHERE customer_id = ${customerId}
                  AND program_id = ${entityId}
                  ORDER BY created_at DESC
                  LIMIT 1
                `;
                
                if (newCardCheck && newCardCheck.length > 0) {
                  cardId = newCardCheck[0].id;
                  logger.info('Retrieved card ID after service sync', { cardId });
                }
              }
            } else if (!cardId) {
              // We found a card but didn't have the ID
              cardId = cardCheck[0].id;
            }
            
            // FINAL VERIFICATION - Ensure card exists, try one more method as last resort
            if (!cardId) {
              logger.warn('Final attempt to create card', { customerId, programId: entityId });
              
              // As a last resort, try to manually create the relationship and force card creation
              await sql`
                WITH enrollment_check AS (
                  INSERT INTO program_enrollments (
                    customer_id, program_id, business_id, status, current_points, enrolled_at
                  ) VALUES (
                    ${customerId}, ${entityId}, ${businessId}, 'ACTIVE', 0, NOW()
                  )
                  ON CONFLICT (customer_id, program_id) DO NOTHING
                )
                INSERT INTO loyalty_cards (
                  customer_id, business_id, program_id, card_number, status, points, created_at
                ) VALUES (
                  ${customerId}, 
                  ${businessId}, 
                  ${entityId}, 
                  'GC-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6) || '-C',
                  'ACTIVE',
                  0,
                  NOW()
                )
                ON CONFLICT (customer_id, program_id) DO NOTHING
                RETURNING id
              `;
              
              // Refresh from database
              const finalCheck = await sql`
                SELECT id FROM loyalty_cards
                WHERE customer_id = ${customerId}
                AND program_id = ${entityId}
                LIMIT 1
              `;
              
              if (finalCheck && finalCheck.length > 0) {
                cardId = finalCheck[0].id;
                logger.info('Final card creation successful', { cardId });
              }
            }
          } catch (cardError) {
            logger.error('Error in card creation process', { error: cardError });
            // Continue execution - we've tried our best to ensure card creation
          }
        }
        
      } catch (dbError: any) {
        // Check for specific database error types
        let errorCode = EnrollmentErrorCode.TRANSACTION_ERROR;
        
        if (dbError.message?.includes('timeout')) {
          errorCode = EnrollmentErrorCode.TIMEOUT_ERROR;
        } else if (dbError.code === '23505') {
          errorCode = EnrollmentErrorCode.ALREADY_ENROLLED;
        } else if (dbError.code === '23503') {
          errorCode = EnrollmentErrorCode.VALIDATION_ERROR;
        }
        
        const error = createDetailedError(
          errorCode,
          `Database transaction error: ${dbError.message || 'Unknown error'}`,
          'enrollment_transaction'
        );
        reportEnrollmentError(error, { requestId, approved });
        
        return { 
          success: false, 
          error: formatEnrollmentErrorForUser(error),
          errorCode
        };
      }
    } else {
      // For other request types, use the standard response method
      // This is for future expansion to other approval types
      const success = await CustomerNotificationService.respondToApproval(requestId, approved);
      if (!success) {
        const error = createDetailedError(
          EnrollmentErrorCode.GENERIC_ERROR,
          `Failed to process approval response`,
          'approval_handler'
        );
        reportEnrollmentError(error);
        return { 
          success: false, 
          error: formatEnrollmentErrorForUser(error),
          errorCode: EnrollmentErrorCode.GENERIC_ERROR
        };
      }
    }
    
    // Create sync events for real-time updates
    try {
      // Generate appropriate titles and messages
      const customerNotificationTitle = approved 
        ? 'Enrollment Accepted' 
        : 'Enrollment Declined';
      const customerNotificationMessage = approved 
        ? `You have been enrolled in ${programName || 'the program'}`
        : `You have declined enrollment in ${programName || 'the program'}`;
        
      const businessNotificationTitle = approved 
        ? 'Customer Joined Program' 
        : 'Enrollment Declined';
      const businessNotificationMessage = approved 
        ? `${customerName || 'A customer'} has joined your ${programName || 'loyalty program'}`
        : `${customerName || 'A customer'} has declined to join your ${programName || 'loyalty program'}`;
      
      // Create sync events for real-time updates
      if (customerId && businessId && entityId) {
        // Create customer relationship sync event to update the business dashboard
        createBusinessCustomerSyncEvent(
          String(customerId),
          String(businessId),
          approved ? 'INSERT' : 'DECLINED'
        );
        
        // Create enrollment sync event
        createEnrollmentSyncEvent(
          String(customerId),
          String(businessId),
          String(entityId),
          approved ? 'INSERT' : 'DELETE'
        );
        
        // Create card sync event if a card was created
        if (approved && cardId) {
          createCardSyncEvent(
            String(cardId),
            String(customerId),
            String(businessId),
            'INSERT',
            {
              programId: String(entityId),
              programName: programName || 'Loyalty Program'
            }
          );
        }
        
        // Create notification sync event
        createNotificationSyncEvent(
          requestId, // Use requestId as notification id
          String(customerId),
          String(businessId),
          'INSERT',
          {
            type: approved ? 'ENROLLMENT_ACCEPTED' : 'ENROLLMENT_REJECTED',
            programId: String(entityId),
            programName: programName || 'Loyalty Program'
          }
        );
          
        // Ensure the card is properly linked in the UI by invalidating caches
        if (typeof queryClient !== 'undefined') {
          try {
            // Invalidate all relevant queries to force UI refresh
            queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
            queryClient.invalidateQueries({ queryKey: ['loyaltyCards', String(customerId)] });
            queryClient.invalidateQueries({ queryKey: ['customerNotifications'] });
            queryClient.invalidateQueries({ queryKey: ['customerNotifications', String(customerId)] });
            queryClient.invalidateQueries({ queryKey: ['customerApprovals'] });
            queryClient.invalidateQueries({ queryKey: ['customerApprovals', String(customerId)] });
            
            // Invalidate enrolled programs queries
            queryClient.invalidateQueries({ queryKey: ['customers', 'programs'] });
            queryClient.invalidateQueries({ queryKey: ['customers', 'programs', String(customerId)] });
            
            // Schedule multiple refreshes after a delay to ensure DB operations complete
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', String(customerId)] });
              queryClient.invalidateQueries({ queryKey: ['customers', 'programs', String(customerId)] });
              queryClient.invalidateQueries({ queryKey: ['customerApprovals', String(customerId)] });
              queryClient.invalidateQueries({ queryKey: ['customerNotifications', String(customerId)] });
            }, 500);
            
            // Second refresh for extra insurance
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', String(customerId)] });
              queryClient.invalidateQueries({ queryKey: ['customers', 'programs', String(customerId)] });
            }, 2000);
          } catch (cacheError) {
            logger.warn('Failed to invalidate cache', { error: cacheError });
            // Non-critical error, continue execution
          }
        }
      }
    } catch (notificationError) {
      logger.error('Error creating notifications after enrollment approval', { 
        error: notificationError,
        requestId,
        approved
      });
      // Continue execution even if notifications fail
    }
    
    // Return success response with card ID if available
    return {
      success: true,
      message: approved 
        ? `Successfully enrolled in ${programName || 'the program'}` 
        : `Successfully declined enrollment in ${programName || 'the program'}`,
      cardId: cardId ? String(cardId) : undefined
    };
  } catch (error: any) {
    logger.error('Unexpected error in safeRespondToApproval', { error });
    
    // Determine appropriate error code based on error message
    let errorCode = EnrollmentErrorCode.GENERIC_ERROR;
    
    if (error.message?.includes('network') || error.message?.includes('connection')) {
      errorCode = EnrollmentErrorCode.NETWORK_ERROR;
    } else if (error.message?.includes('timeout')) {
      errorCode = EnrollmentErrorCode.TIMEOUT_ERROR;
    } else if (error.message?.includes('permission')) {
      errorCode = EnrollmentErrorCode.INSUFFICIENT_PERMISSIONS;
    } else if (error.name === 'AbortError' || error.message?.includes('cancel')) {
      errorCode = EnrollmentErrorCode.REQUEST_CANCELLED;
    }
    
    const detailedError = createDetailedError(
      errorCode,
      `Unexpected error: ${error.message || 'Unknown error'}`,
      'approval_response'
    );
    reportEnrollmentError(detailedError);
    
    return { 
      success: false, 
      error: formatEnrollmentErrorForUser(detailedError),
      errorCode,
      errorLocation: 'safeRespondToApproval'
    };
  } finally {
    // This ensures we don't leave hanging requests
    controller.abort();
  }
} 