/**
 * Enrollment Error Reporter
 * 
 * This utility provides error reporting and tracking for enrollment-related errors.
 */

import { logger } from './logger';

/**
 * Enum for enrollment error codes
 */
export enum EnrollmentErrorCode {
  APPROVAL_REQUEST_NOT_FOUND = 'ERR_APPROVAL_REQUEST_NOT_FOUND',
  DATABASE_ERROR = 'ERR_DATABASE',
  TRANSACTION_FAILED = 'ERR_TRANSACTION',
  CARD_CREATION_FAILED = 'ERR_CARD_CREATION',
  NOTIFICATION_CREATION_FAILED = 'ERR_NOTIFICATION',
  UNKNOWN_ERROR = 'ERR_UNKNOWN'
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
  details: DetailedError,
  requestId?: string,
  customerId?: string,
  programId?: string
): EnrollmentErrorReport {
  const report: EnrollmentErrorReport = {
    code,
    message,
    details,
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