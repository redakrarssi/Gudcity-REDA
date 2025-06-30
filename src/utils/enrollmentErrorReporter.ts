/**
 * Enrollment Error Reporter
 * 
 * This utility provides enhanced error reporting for the enrollment approval process
 * to help identify where failures are occurring.
 */

import { logger } from './logger';

// Define error codes for different failure points
export enum EnrollmentErrorCode {
  APPROVAL_REQUEST_NOT_FOUND = 'ERR_APPROVAL_NOT_FOUND',
  DATABASE_ERROR = 'ERR_DATABASE',
  NOTIFICATION_CREATION_FAILED = 'ERR_NOTIFICATION_CREATION',
  ENROLLMENT_CREATION_FAILED = 'ERR_ENROLLMENT_CREATION',
  CARD_CREATION_FAILED = 'ERR_CARD_CREATION',
  TRANSACTION_FAILED = 'ERR_TRANSACTION',
  UNKNOWN_ERROR = 'ERR_UNKNOWN'
}

// Interface for detailed error information
export interface EnrollmentError {
  code: EnrollmentErrorCode;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  customerId?: string;
  programId?: string;
}

// Store recent errors for debugging
const recentErrors: EnrollmentError[] = [];
const MAX_STORED_ERRORS = 50;

/**
 * Report an enrollment error with detailed information
 */
export function reportEnrollmentError(
  code: EnrollmentErrorCode,
  message: string,
  details?: any,
  requestId?: string,
  customerId?: string,
  programId?: string
): EnrollmentError {
  const error: EnrollmentError = {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId,
    customerId,
    programId
  };
  
  // Log the error
  logger.error('Enrollment process error', error);
  
  // Store for later retrieval
  recentErrors.unshift(error);
  if (recentErrors.length > MAX_STORED_ERRORS) {
    recentErrors.pop();
  }
  
  return error;
}

/**
 * Get recent enrollment errors for debugging
 */
export function getRecentEnrollmentErrors(): EnrollmentError[] {
  return [...recentErrors];
}

/**
 * Clear stored enrollment errors
 */
export function clearEnrollmentErrors(): void {
  recentErrors.length = 0;
}

/**
 * Format an enrollment error for display to users
 */
export function formatEnrollmentErrorForUser(error: EnrollmentError): string {
  switch (error.code) {
    case EnrollmentErrorCode.APPROVAL_REQUEST_NOT_FOUND:
      return 'The enrollment request could not be found. It may have expired or been processed already.';
    
    case EnrollmentErrorCode.DATABASE_ERROR:
      return 'A database error occurred while processing your request. Please try again later.';
    
    case EnrollmentErrorCode.NOTIFICATION_CREATION_FAILED:
      return 'Failed to create notification for the enrollment process.';
    
    case EnrollmentErrorCode.ENROLLMENT_CREATION_FAILED:
      return 'Failed to create your program enrollment. Please contact support.';
    
    case EnrollmentErrorCode.CARD_CREATION_FAILED:
      return 'Your enrollment was processed but we couldn\'t create your loyalty card. Please contact support.';
    
    case EnrollmentErrorCode.TRANSACTION_FAILED:
      return 'The enrollment process was interrupted. Please try again or contact support.';
    
    case EnrollmentErrorCode.UNKNOWN_ERROR:
    default:
      return 'An unexpected error occurred. Please try again later or contact support.';
  }
}

/**
 * Create a detailed error object that includes the error location
 */
export function createDetailedError(
  originalError: any,
  location: string,
  context?: Record<string, any>
): any {
  const errorDetails = {
    message: originalError?.message || 'Unknown error',
    stack: originalError?.stack,
    location,
    context,
    timestamp: new Date().toISOString()
  };
  
  logger.error(`Error in ${location}`, errorDetails);
  
  return {
    ...originalError,
    details: errorDetails
  };
} 