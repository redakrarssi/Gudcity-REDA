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
import { createNotificationSyncEvent, createEnrollmentSyncEvent, createCardSyncEvent } from '../utils/realTimeSync';
import { 
  EnrollmentErrorCode, 
  createDetailedError, 
  reportEnrollmentError 
} from '../utils/enrollmentErrorReporter';
import { 
  EnrollmentErrorResponse, 
  EnrollmentProcessStep, 
  handleEnrollmentError, 
  tryEnrollmentOperation,
  isEnrollmentError,
  createEnrollmentSuccess,
  EnrollmentSuccessResponse,
  EnrollmentOperationResponse
} from '../utils/enrollmentErrorHandler';

/**
 * Enhanced response type for the safeRespondToApproval function
 */
export interface ApprovalResponse {
  success: boolean;
  message?: string;
  errorCode?: EnrollmentErrorCode;
  errorLocation?: string;
  details?: any;
  cardId?: string;
  status?: string;
}

// Type guard to check if a result is an error response
function isErrorResponse(result: any): result is EnrollmentErrorResponse {
  return result && typeof result === 'object' && 'errorCode' in result;
}

/**
 * Improved version of respondToApproval that uses a SQL transaction
 * with enhanced error reporting
 * 
 * @param requestId The ID of the approval request
 * @param approved Whether the request was approved
 * @returns Promise with detailed response including any error information
 */
export async function safeRespondToApproval(requestId: string, approved: boolean): Promise<ApprovalResponse> {
  logger.info('Processing approval response with safe wrapper', { requestId, approved });
  
  try {
    // 1. Get the approval request details first to ensure we have them for later steps
    const approvalRequestResult = await tryEnrollmentOperation(
      async () => {
        const result = await sql`
          SELECT ar.*, lp.name as program_name, u.name as business_name
          FROM customer_approval_requests ar
          LEFT JOIN loyalty_programs lp ON ar.entity_id = lp.id::text
          LEFT JOIN users u ON lp.business_id = u.id
          WHERE ar.id = ${requestId}
        `;
        
        if (!result.length) {
          throw new Error('Approval request not found');
        }
        
        return result[0];
      },
      EnrollmentProcessStep.REQUEST_LOOKUP,
      { 
        approvalId: requestId, 
        approved 
      }
    );
    
    // Check if the operation returned an error
    if (isErrorResponse(approvalRequestResult)) {
      return approvalRequestResult;
    }
    
    const request = approvalRequestResult;
    const customerId = request.customer_id?.toString();
    const businessId = request.business_id?.toString();
    const programId = request.entity_id;
    
    // Parse the data JSON safely
    let data: Record<string, any> = {};
    try {
      if (typeof request.data === 'string') {
        data = JSON.parse(request.data);
      } else if (request.data && typeof request.data === 'object') {
        data = request.data;
      }
    } catch (jsonError) {
      logger.warn('Error parsing approval request data', { error: jsonError });
    }
    
    // Special handling for decline case
    if (!approved) {
      logger.info('Processing decline request', { requestId, customerId, businessId, programId });
      
      // Process decline in a transaction
      const declineResult = await tryEnrollmentOperation(
        async () => {
          await sql`
            BEGIN;
            
            -- Update approval request status
            UPDATE customer_approval_requests
            SET status = 'REJECTED', 
                responded_at = NOW(),
                updated_at = NOW()
            WHERE id = ${requestId};
            
            -- Mark notification as actioned
            UPDATE customer_notifications
            SET action_taken = TRUE,
                is_read = TRUE,
                read_at = NOW()
            WHERE reference_id = ${requestId};
            
            COMMIT;
          `;
          
          return true;
        },
        EnrollmentProcessStep.DECLINE_PROCESSING,
        { 
          approvalId: requestId, 
          customerId,
          businessId,
          programId,
          approved: false
        }
      );
      
      // Check if the decline operation returned an error
      if (isErrorResponse(declineResult)) {
        return declineResult;
      }
      
      // Send notification to business about the decline
      try {
        const programName = data.programName || request.program_name || 'program';
        const businessName = data.businessName || request.business_name || 'business';
        
        const notificationResult = await tryEnrollmentOperation(
          async () => {
            const notification = await CustomerNotificationService.createNotification({
              customerId: businessId,
              businessId: businessId,
              type: 'ENROLLMENT_REJECTED',
              title: 'Enrollment Request Rejected',
              message: `A customer has declined enrollment in ${programName}`,
              requiresAction: false,
              actionTaken: false,
              isRead: false,
              data: {
                programId: programId,
                programName: programName,
                customerId: customerId
              }
            });
            
            // Emit real-time notification if possible
            if (notification && typeof serverFunctions !== 'undefined' && 
                serverFunctions.emitNotification && typeof serverFunctions.emitNotification === 'function') {
              serverFunctions.emitNotification(businessId, notification);
            }
            
            return notification;
          },
          EnrollmentProcessStep.NOTIFICATION_SERVICE,
          { 
            approvalId: requestId, 
            customerId,
            businessId,
            programId,
            approved: false
          }
        );
        
        // Continue even if notification creation fails - this is non-critical
        if (isErrorResponse(notificationResult)) {
          logger.warn('Failed to send decline notification to business, but continuing', { 
            error: notificationResult,
            requestId, 
            businessId 
          });
        }
        
        return createEnrollmentSuccess(
          `You declined to join ${programName}`,
          undefined,
          'DECLINED'
        );
      } catch (notificationError) {
        logger.error('Error sending decline notification', { error: notificationError });
        // Continue even if notification fails - the decline was still processed
        return createEnrollmentSuccess(
          `You declined to join the program`,
          undefined,
          'DECLINED'
        );
      }
    }
    
    // 2. For approval case, continue with the SQL transaction
    const sqlResult = await tryEnrollmentOperation(
      async () => {
        const result = await sql`SELECT process_enrollment_approval(${requestId}, ${approved})`;
        return result[0]?.process_enrollment_approval === true;
      },
      EnrollmentProcessStep.DATABASE_UPDATE,
      { 
        approvalId: requestId, 
        customerId,
        businessId,
        programId,
        approved, 
        location: 'SQL process_enrollment_approval function'
      }
    );
    
    // Check if the operation returned an error
    if (isErrorResponse(sqlResult)) {
      logger.error('SQL function failed with error', { error: sqlResult });
      
      // Try fallback to the original method
      try {
        const fallbackResult = await CustomerNotificationService.respondToApproval(requestId, approved);
        if (fallbackResult) {
          return { 
            success: true,
            message: 'Processed via fallback method'
          };
        } else {
          return {
            success: false,
            message: 'Both primary and fallback methods failed',
            errorCode: EnrollmentErrorCode.TRANSACTION_FAILED,
            errorLocation: 'Multiple enrollment handlers',
            details: {
              primaryError: sqlResult,
              fallbackResult: false
            }
          };
        }
      } catch (fallbackError) {
        return handleEnrollmentError(
          { 
            primaryError: sqlResult, 
            fallbackError,
            message: 'Both primary and fallback methods failed with errors'
          },
          EnrollmentProcessStep.TRANSACTION_PROCESSING,
          { 
            approvalId: requestId, 
            customerId,
            businessId,
            programId,
            approved,
            location: 'Multiple enrollment handlers'
          }
        );
      }
    }
    
    const success = sqlResult;
    
    if (!success) {
      logger.error('SQL function returned false', { requestId, approved });
      
      // Try fallback to the original method
      try {
        const fallbackResult = await CustomerNotificationService.respondToApproval(requestId, approved);
        if (fallbackResult) {
          return { 
            success: true,
            message: 'Processed via fallback method'
          };
        } else {
          return {
            success: false,
            message: 'Both primary and fallback methods failed',
            errorCode: EnrollmentErrorCode.TRANSACTION_FAILED,
            errorLocation: 'Multiple enrollment handlers'
          };
        }
      } catch (fallbackError) {
        return handleEnrollmentError(
          fallbackError,
          EnrollmentProcessStep.TRANSACTION_PROCESSING,
          { 
            approvalId: requestId, 
            customerId,
            businessId,
            programId,
            approved 
          }
        );
      }
    }
    
    // 3. If approved, ensure the loyalty card was created
    let cardId: string | undefined;
    if (approved) {
      try {
        // Check if card exists
        const cardResult = await sql`
          SELECT id FROM loyalty_cards
          WHERE customer_id = ${customerId}
          AND program_id = ${programId}
        `;
        
        if (cardResult.length > 0) {
          const rawId = cardResult[0].id;
          cardId = typeof rawId === 'string' ? rawId : String(rawId);
          logger.info('Found existing loyalty card', { cardId, customerId, programId });
        } else {
          // Create card if not exists by syncing enrollments
          logger.info('No card found, syncing enrollments to cards', { customerId, programId });
          
          const syncResult = await tryEnrollmentOperation(
            async () => LoyaltyCardService.syncEnrollmentsToCards(customerId),
            EnrollmentProcessStep.CARD_SYNC,
            { 
              approvalId: requestId, 
              customerId,
              businessId,
              programId,
              approved
            }
          );
          
          // Check if the operation returned an error
          if (isErrorResponse(syncResult)) {
            logger.warn('Card sync failed but continuing', { error: syncResult });
            // Continue execution even if card sync fails
          } else if (syncResult && Array.isArray(syncResult) && syncResult.length > 0) {
            const rawId = syncResult[0];
            cardId = typeof rawId === 'string' ? rawId : String(rawId);
            logger.info('Created loyalty card through sync', { cardId, customerId, programId });
          } else {
            logger.warn('No cards created through sync', { customerId, programId });
          }
        }
      } catch (cardError) {
        logger.error('Error ensuring loyalty card exists', { error: cardError });
        // Continue execution even if card check fails - this is non-critical
      }
    }
    
    // 4. Emit real-time notifications and sync events
    try {
      const programName = data.programName || request.program_name || 'program';
      const businessName = data.businessName || request.business_name || 'business';
      
      // Create notification sync event for real-time UI updates
      createNotificationSyncEvent(
        customerId,
        businessId,
        'UPDATE'
      );
      
      if (cardId) {
        // Create card sync event to trigger card display update
        createCardSyncEvent(
          cardId, 
          customerId, 
          businessId, 
          'INSERT', 
          { 
            programId: programId, 
            programName: programName
          }
        );
      }
    } catch (syncError) {
      logger.error('Error creating sync events', { error: syncError });
      // Non-critical error, continue
    }
    
    // Return success result
    return { 
      success: true,
      message: `You've joined ${request.program_name || 'the program'}`,
      cardId,
      status: 'APPROVED'
    };
  } catch (error) {
    logger.error('Unhandled error in safeRespondToApproval', { error, requestId, approved });
    
    // Report the unexpected error for tracking
    const reportedError = reportEnrollmentError(
      EnrollmentErrorCode.UNKNOWN_ERROR,
      'Unhandled exception in safeRespondToApproval',
      createDetailedError(
        error, 
        'customerNotificationServiceWrapper.safeRespondToApproval - Unhandled exception',
        { requestId, approved }
      ),
      requestId
    );
    
    return {
      success: false,
      message: 'An unexpected error occurred while processing your request',
      errorCode: reportedError.code,
      errorLocation: 'Approval response handler',
      details: reportedError.details
    };
  }
} 