/**
 * Enrollment Error Reporter
 * 
 * This utility provides error reporting and tracking for enrollment-related errors.
 */

import { logger } from './logger';

/**
 * Enrollment error codes
 */
export enum EnrollmentErrorCode {
  GENERIC_ERROR = 'err_generic',
  UNKNOWN_ERROR = 'err_unknown',
  DATABASE_ERROR = 'err_database',
  TRANSACTION_ERROR = 'err_transaction',
  VALIDATION_ERROR = 'err_validation',
  ALREADY_ENROLLED = 'err_already_enrolled',
  PROGRAM_NOT_FOUND = 'err_program_not_found',
  CUSTOMER_NOT_FOUND = 'err_customer_not_found',
  BUSINESS_NOT_FOUND = 'err_business_not_found',
  REQUEST_NOT_FOUND = 'err_request_not_found',
  APPROVAL_REQUEST_NOT_FOUND = 'err_approval_not_found',
  NOTIFICATION_ERROR = 'err_notification',
  CARD_CREATION_ERROR = 'err_card_creation',
  INSUFFICIENT_PERMISSIONS = 'err_permissions',
  INVALID_STATUS = 'err_invalid_status',
  INVALID_REQUEST = 'err_invalid_request',
  INVALID_POINTS = 'err_invalid_points',
  TIMEOUT_ERROR = 'err_timeout',
  CONNECTION_ERROR = 'err_connection',
  NETWORK_ERROR = 'err_network',
  SERVER_ERROR = 'err_server',
  CLIENT_ERROR = 'err_client'
}

/**
 * Interface for detailed error information
 */
export interface DetailedError {
  message: string;
  stack?: string;
  location: string;
  context: Record<string, any>;
  timestamp: string;
}

/**
 * Interface for enrollment error report
 */
export interface EnrollmentErrorReport {
  code: EnrollmentErrorCode;
  message: string;
  details: DetailedError;
  requestId?: string;
  customerId?: string;
  programId?: string;
  timestamp: string;
}

/**
 * Create a detailed error object from an error
 */
export function createDetailedError(
  error: any,
  location: string,
  context: Record<string, any> = {}
): DetailedError {
  return {
    message: error?.message || String(error),
    stack: error?.stack,
    location,
    context,
    timestamp: new Date().toISOString()
  };
}

/**
 * Report an enrollment error for tracking
 */
export function reportEnrollmentError(
  code: EnrollmentErrorCode,
  message: string,
  details: DetailedError | any,
  requestId?: string,
  customerId?: string,
  programId?: string
): EnrollmentErrorReport {
  const report: EnrollmentErrorReport = {
    code,
    message,
    details: details as DetailedError,
    requestId,
    customerId,
    programId,
    timestamp: new Date().toISOString()
  };
  
  // Log the error for tracking
  logger.error('Enrollment error', report);
  
  // In a production environment, you might want to send this to an error tracking service
  // or store it in a database for later analysis
  
  return report;
}

/**
 * Format an enrollment error for display to users
 */
export function formatEnrollmentErrorForUser(error: EnrollmentErrorReport | any): string {
  // Handle case where error is not an EnrollmentErrorReport
  if (!error || !error.code) {
    return 'An unexpected error occurred. Please try again later.';
  }
  
  // Format based on error code
  switch (error.code) {
    case EnrollmentErrorCode.APPROVAL_REQUEST_NOT_FOUND:
      return 'The enrollment request could not be found. It may have expired or been processed already.';
    
    case EnrollmentErrorCode.DATABASE_ERROR:
      return 'A database error occurred while processing your request. Please try again later.';
    
    case EnrollmentErrorCode.NOTIFICATION_ERROR:
      return 'Failed to create notification for the enrollment process.';
    
    case EnrollmentErrorCode.CARD_CREATION_ERROR:
      return 'Your enrollment was processed but we couldn\'t create your loyalty card. Please contact support.';
    
    case EnrollmentErrorCode.TRANSACTION_ERROR:
      return 'The enrollment process was interrupted. Please try again or contact support.';
    
    case EnrollmentErrorCode.UNKNOWN_ERROR:
    default:
      return 'An unexpected error occurred. Please try again later or contact support.';
  }
} 