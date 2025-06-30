/**
 * Enrollment Error Handler
 * 
 * This utility provides enhanced error handling for the enrollment process
 * with detailed location tracking and error reporting.
 */

import { logger } from './logger';
import { 
  EnrollmentErrorCode, 
  reportEnrollmentError, 
  createDetailedError 
} from './enrollmentErrorReporter';

/**
 * Interface for enrollment error response
 */
export interface EnrollmentErrorResponse {
  success: boolean;
  message: string;
  errorCode?: EnrollmentErrorCode;
  errorLocation?: string;
  details?: any;
  cardId?: string;
}

/**
 * Interface for enrollment success response
 */
export interface EnrollmentSuccessResponse {
  success: true;
  message: string;
  cardId?: string;
  status?: string;
}

/**
 * Type for enrollment operation response
 */
export type EnrollmentOperationResponse = EnrollmentErrorResponse | EnrollmentSuccessResponse;

/**
 * Track enrollment process steps for detailed error reporting
 */
export enum EnrollmentProcessStep {
  REQUEST_LOOKUP = 'Request lookup',
  DATABASE_UPDATE = 'Database update',
  LOYALTY_SERVICE = 'Loyalty program service',
  NOTIFICATION_SERVICE = 'Notification service',
  CARD_CREATION = 'Card creation',
  CARD_SYNC = 'Card synchronization',
  TRANSACTION_PROCESSING = 'Transaction processing',
  RESPONSE_HANDLING = 'Response handling',
  DECLINE_PROCESSING = 'Decline processing'
}

/**
 * Handle enrollment errors with detailed location tracking
 */
export function handleEnrollmentError(
  error: any,
  step: EnrollmentProcessStep,
  context: {
    approvalId: string;
    customerId?: string;
    programId?: string;
    approved?: boolean;
    location?: string;
  }
): EnrollmentErrorResponse {
  // Determine error code based on step
  let errorCode: EnrollmentErrorCode;
  switch (step) {
    case EnrollmentProcessStep.REQUEST_LOOKUP:
      errorCode = EnrollmentErrorCode.APPROVAL_REQUEST_NOT_FOUND;
      break;
    case EnrollmentProcessStep.DATABASE_UPDATE:
      errorCode = EnrollmentErrorCode.DATABASE_ERROR;
      break;
    case EnrollmentProcessStep.LOYALTY_SERVICE:
    case EnrollmentProcessStep.TRANSACTION_PROCESSING:
    case EnrollmentProcessStep.DECLINE_PROCESSING:
      errorCode = EnrollmentErrorCode.TRANSACTION_FAILED;
      break;
    case EnrollmentProcessStep.CARD_CREATION:
    case EnrollmentProcessStep.CARD_SYNC:
      errorCode = EnrollmentErrorCode.CARD_CREATION_FAILED;
      break;
    case EnrollmentProcessStep.NOTIFICATION_SERVICE:
      errorCode = EnrollmentErrorCode.NOTIFICATION_CREATION_FAILED;
      break;
    default:
      errorCode = EnrollmentErrorCode.UNKNOWN_ERROR;
  }
  
  // Create detailed error with location information
  const detailedError = createDetailedError(
    error,
    context.location || `Enrollment process - ${step}`,
    {
      ...context,
      timestamp: new Date().toISOString()
    }
  );
  
  // Generate appropriate error message
  let message = `Error in ${step.toLowerCase()}`;
  if (error?.message) {
    message = `${message}: ${error.message}`;
  }
  
  // Report error for tracking
  const reportedError = reportEnrollmentError(
    errorCode,
    message,
    detailedError,
    context.approvalId,
    context.customerId,
    context.programId
  );
  
  // Return structured error response
  return {
    success: false,
    message: message,
    errorCode: reportedError.code,
    errorLocation: step,
    details: detailedError
  };
}

/**
 * Try to execute an enrollment operation with proper error handling
 */
export async function tryEnrollmentOperation<T>(
  operation: () => Promise<T>,
  step: EnrollmentProcessStep,
  context: {
    approvalId: string;
    customerId?: string;
    programId?: string;
    approved?: boolean;
    location?: string;
  }
): Promise<T | EnrollmentErrorResponse> {
  try {
    const result = await operation();
    
    // Special handling for decline operations
    if (step === EnrollmentProcessStep.DECLINE_PROCESSING && context.approved === false) {
      logger.info('Decline operation completed successfully', { 
        approvalId: context.approvalId,
        step
      });
    }
    
    return result;
  } catch (error) {
    logger.error(`Error in enrollment operation (${step})`, { error, context });
    return handleEnrollmentError(error, step, context);
  }
}

/**
 * Check if a response is an enrollment error
 */
export function isEnrollmentError(response: any): response is EnrollmentErrorResponse {
  return (
    response && 
    typeof response === 'object' && 
    response.success === false &&
    response.errorCode !== undefined
  );
}

/**
 * Create a success response for an enrollment operation
 */
export function createEnrollmentSuccess(
  message: string,
  cardId?: string,
  status?: string
): EnrollmentSuccessResponse {
  return {
    success: true,
    message,
    cardId,
    status
  };
} 