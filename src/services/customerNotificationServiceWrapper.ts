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
import { ensureApprovalRequestProcessed } from './safeRespondToApproval';

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
  // Set up variables to track what happened during the process
  let success = false;
  let errorCode = EnrollmentErrorCode.GENERIC_ERROR;
  let errorMessage = 'Unknown error';
  let programName = '';
  let cardId: string | null = null;
  let businessId = '';
  let customerId = '';
  let entityId = '';
  let customerName = '';
  
  try {
    // First, get details about the request before processing
    try {
      const requestDetails = await sql`
        SELECT 
          ar.*,
          bp.name AS program_name,
          u.name AS business_name,
          c.name AS customer_name 
        FROM customer_approval_requests ar
        LEFT JOIN loyalty_programs bp ON ar.entity_id = bp.id::text
        LEFT JOIN users u ON ar.business_id = u.id::text
        LEFT JOIN customers c ON ar.customer_id = c.id::text
        WHERE ar.id = ${requestId}
      `;
      
      if (requestDetails && requestDetails.length > 0) {
        const details = requestDetails[0];
        programName = details.program_name || 'Program';
        businessId = details.business_id;
        customerId = details.customer_id;
        entityId = details.entity_id;
        customerName = details.customer_name || 'Customer';
      }
    } catch (detailsError) {
      logger.warn('Could not retrieve full request details', { error: detailsError });
      // Continue with limited information
    }
  
    // Use AbortController to prevent CancelError problems
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set maximum time for the operation
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000); // 15 seconds max
    
    try {
      // First, ensure the approval request is marked as processed to prevent reappearance after refresh
      await ensureApprovalRequestProcessed(requestId, approved ? 'APPROVED' : 'REJECTED');
      
      // For enrollment requests
      if (customerId && entityId) {
        // Now proceed with the enrollment or other actions
        const result = await withRetry(() => handleEnrollment(
          requestId,
          customerId,
          entityId,
          businessId,
          approved,
          signal
        ), 5); // Increased from 3 to 5 retries for reliability
        
        success = result.success;
        
        if (!success) {
          errorCode = result.errorCode || EnrollmentErrorCode.GENERIC_ERROR;
          errorMessage = result.error || 'Failed to process enrollment';
        } else if (result.cardId) {
          cardId = result.cardId;
        }
      } else {
        // For other request types (non-enrollment)
        const result = await CustomerNotificationService.respondToApproval(requestId, approved);
        success = result;
        
        if (!success) {
          errorCode = EnrollmentErrorCode.GENERIC_ERROR;
          errorMessage = 'Failed to process non-enrollment approval request';
        }
      }
      
      clearTimeout(timeout);
    } catch (e) {
      clearTimeout(timeout);
      
      // Ensure approval is still marked as processed even if there was an error
      await ensureApprovalRequestProcessed(requestId, approved ? 'APPROVED' : 'REJECTED');
      
      // Format error for display
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error('Error in approval response', { error: error.message, stack: error.stack });
      
      if (error.name === 'AbortError' || error.message?.includes('abort')) {
        errorCode = EnrollmentErrorCode.TIMEOUT_ERROR;
        errorMessage = 'Request timed out. Please try again.';
      } else {
        errorMessage = error.message;
      }
      
      success = false;
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
            
            // Ensure data is refreshed multiple times to catch async database updates
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', String(customerId)] });
              queryClient.invalidateQueries({ queryKey: ['customers', 'programs', String(customerId)] });
              queryClient.invalidateQueries({ queryKey: ['customerApprovals', String(customerId)] });
              queryClient.invalidateQueries({ queryKey: ['customerNotifications', String(customerId)] });
              
              // Also ensure approval request status is properly updated
              ensureApprovalRequestProcessed(requestId, approved ? 'APPROVED' : 'REJECTED');
            }, 500);
            
            // Second refresh for extra insurance
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['loyaltyCards', String(customerId)] });
              queryClient.invalidateQueries({ queryKey: ['customers', 'programs', String(customerId)] });
              
              // Final verification of approval status
              ensureApprovalRequestProcessed(requestId, approved ? 'APPROVED' : 'REJECTED');
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
    }
    
    return {
      success,
      message: success ? 'Approval processed successfully' : errorMessage,
      errorCode: success ? undefined : errorCode,
      cardId: success ? cardId : undefined,
      errorLocation: success ? undefined : 'respondToApproval'
    };
  } catch (finalError) {
    logger.error('Unhandled error in approval response', { error: finalError });
    
    // Ensure approval is still marked as processed even in the worst-case scenario
    try {
      await ensureApprovalRequestProcessed(requestId, approved ? 'APPROVED' : 'REJECTED');
    } catch (e) {
      logger.error('Failed final attempt to update approval status', { error: e });
    }
    
    return {
      success: false,
      message: finalError instanceof Error ? finalError.message : 'Unknown error occurred',
      errorCode: EnrollmentErrorCode.GENERIC_ERROR,
      errorLocation: 'safeRespondToApproval'
    };
  }
} 