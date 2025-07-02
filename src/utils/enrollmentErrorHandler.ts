/**
 * Enrollment Error Handler
 * 
 * This utility provides centralized error handling for enrollment-related operations
 */

import { logger } from './logger';
import { EnrollmentErrorCode, formatEnrollmentErrorForUser } from './enrollmentErrorReporter';
import { queryClient } from './queryClient';

/**
 * Interface for enrollment error context
 */
export interface EnrollmentErrorContext {
  customerId?: string;
  businessId?: string;
  programId?: string;
  requestId?: string;
  operation: string;
  component: string;
}

/**
 * Interface for enrollment error result
 */
export interface EnrollmentErrorResult {
  success: boolean;
  error?: string;
  errorCode?: EnrollmentErrorCode;
  errorContext?: EnrollmentErrorContext;
}

/**
 * Handle enrollment errors in a consistent way
 */
export function handleEnrollmentError(
  error: any,
  context: EnrollmentErrorContext
): EnrollmentErrorResult {
  // Log the error with context
  logger.error('Enrollment error', {
    error,
    context
  });
  
  // Determine error code based on error message or type
  let errorCode = EnrollmentErrorCode.GENERIC_ERROR;
  
  if (error.errorCode) {
    // Use provided error code if available
    errorCode = error.errorCode;
  } else if (error.message) {
    // Determine error code from message
    if (error.message.includes('not found')) {
      if (error.message.includes('request')) {
        errorCode = EnrollmentErrorCode.REQUEST_NOT_FOUND;
      } else if (error.message.includes('program')) {
        errorCode = EnrollmentErrorCode.PROGRAM_NOT_FOUND;
      } else if (error.message.includes('customer')) {
        errorCode = EnrollmentErrorCode.CUSTOMER_NOT_FOUND;
      } else if (error.message.includes('business')) {
        errorCode = EnrollmentErrorCode.BUSINESS_NOT_FOUND;
      } else if (error.message.includes('approval')) {
        errorCode = EnrollmentErrorCode.APPROVAL_REQUEST_NOT_FOUND;
      }
    } else if (error.message.includes('already enrolled')) {
      errorCode = EnrollmentErrorCode.ALREADY_ENROLLED;
    } else if (error.message.includes('permission')) {
      errorCode = EnrollmentErrorCode.INSUFFICIENT_PERMISSIONS;
    } else if (error.message.includes('timeout')) {
      errorCode = EnrollmentErrorCode.TIMEOUT_ERROR;
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      errorCode = EnrollmentErrorCode.NETWORK_ERROR;
    } else if (error.message.includes('transaction')) {
      errorCode = EnrollmentErrorCode.TRANSACTION_ERROR;
    }
  }
  
  // Format user-friendly error message
  const errorMessage = formatEnrollmentErrorForUser({
    code: errorCode,
    message: error.message || 'Unknown error',
    details: {
      message: error.message || 'Unknown error',
      location: context.component,
      context: context,
      timestamp: new Date().toISOString()
    }
  });
  
  return {
    success: false,
    error: errorMessage,
    errorCode,
    errorContext: context
  };
}

/**
 * Recover from enrollment errors when possible
 */
export async function recoverFromEnrollmentError(
  error: EnrollmentErrorResult,
  userId?: string
): Promise<boolean> {
  // Attempt recovery based on error code
  switch (error.errorCode) {
    case EnrollmentErrorCode.NOTIFICATION_ERROR:
      // Refresh notifications to ensure UI is in sync
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['customerNotifications', userId] });
        await queryClient.invalidateQueries({ queryKey: ['customerApprovals', userId] });
        return true;
      }
      return false;
      
    case EnrollmentErrorCode.CARD_CREATION_ERROR:
      // If card creation failed but enrollment succeeded, try to sync enrollments to cards
      if (userId && error.errorContext?.customerId) {
        try {
          const LoyaltyCardService = await import('../services/loyaltyCardService');
          await LoyaltyCardService.default.syncEnrollmentsToCards(error.errorContext.customerId);
          await queryClient.invalidateQueries({ queryKey: ['loyaltyCards', userId] });
          return true;
        } catch (syncError) {
          logger.error('Recovery attempt failed', { error: syncError });
          return false;
        }
      }
      return false;
      
    case EnrollmentErrorCode.TRANSACTION_ERROR:
      // For transaction errors, refresh all related data
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: ['loyaltyCards', userId] });
        await queryClient.invalidateQueries({ queryKey: ['customerNotifications', userId] });
        await queryClient.invalidateQueries({ queryKey: ['customerApprovals', userId] });
        await queryClient.invalidateQueries({ queryKey: ['enrolledPrograms', userId] });
        return true;
      }
      return false;
      
    default:
      // No recovery action for other error types
      return false;
  }
}

/**
 * Get user-friendly error message for an enrollment error code
 */
export function getEnrollmentErrorMessage(errorCode: EnrollmentErrorCode): string {
  switch (errorCode) {
    case EnrollmentErrorCode.REQUEST_NOT_FOUND:
      return 'The enrollment request could not be found. It may have expired or been processed already.';
    
    case EnrollmentErrorCode.ALREADY_ENROLLED:
      return 'You are already enrolled in this program.';
    
    case EnrollmentErrorCode.PROGRAM_NOT_FOUND:
      return 'The loyalty program could not be found. It may have been removed.';
    
    case EnrollmentErrorCode.CUSTOMER_NOT_FOUND:
      return 'Your customer profile could not be found. Please try logging out and back in.';
    
    case EnrollmentErrorCode.BUSINESS_NOT_FOUND:
      return 'The business could not be found. It may have been removed.';
    
    case EnrollmentErrorCode.CARD_CREATION_ERROR:
      return 'Your enrollment was processed but we couldn\'t create your loyalty card. Please check your cards page in a few moments.';
    
    case EnrollmentErrorCode.NOTIFICATION_ERROR:
      return 'Your enrollment was processed but we couldn\'t create a notification. Please refresh the page.';
    
    case EnrollmentErrorCode.TRANSACTION_ERROR:
      return 'The enrollment process was interrupted. Please try again or contact support.';
    
    case EnrollmentErrorCode.TIMEOUT_ERROR:
      return 'The operation timed out. Please try again when the system is less busy.';
    
    case EnrollmentErrorCode.NETWORK_ERROR:
      return 'A network error occurred. Please check your connection and try again.';
    
    case EnrollmentErrorCode.INSUFFICIENT_PERMISSIONS:
      return 'You don\'t have permission to perform this action.';
    
    case EnrollmentErrorCode.GENERIC_ERROR:
    default:
      return 'An unexpected error occurred. Please try again later or contact support.';
  }
} 