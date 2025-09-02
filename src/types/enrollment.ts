/**
 * Enrollment types and interfaces
 */

/**
 * Enrollment error codes
 */
export enum EnrollmentErrorCode {
  GENERIC_ERROR = 'err_generic',
  UNKNOWN_ERROR = 'err_unknown',
  DATABASE_ERROR = 'err_database',
  TRANSACTION_ERROR = 'err_transaction',
  TRANSACTION_FAILED = 'err_transaction_failed',
  VALIDATION_ERROR = 'err_validation',
  ALREADY_ENROLLED = 'err_already_enrolled',
  PROGRAM_NOT_FOUND = 'err_program_not_found',
  CUSTOMER_NOT_FOUND = 'err_customer_not_found',
  BUSINESS_NOT_FOUND = 'err_business_not_found',
  REQUEST_NOT_FOUND = 'err_request_not_found',
  APPROVAL_REQUEST_NOT_FOUND = 'err_approval_not_found',
  NOTIFICATION_ERROR = 'err_notification',
  NOTIFICATION_CREATION_FAILED = 'err_notification_creation',
  CARD_CREATION_ERROR = 'err_card_creation',
  CARD_CREATION_FAILED = 'err_card_creation_failed',
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
  location: string;
  context?: any;
  timestamp: string;
  stack?: string;
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
 * Enrollment status types
 */
export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REJECTED';

/**
 * Enrollment request types
 */
export interface EnrollmentRequest {
  customerId: string;
  programId: string;
  businessId: string;
  status: EnrollmentStatus;
  requestDate: string;
  responseDate?: string;
  expiryDate?: string;
} 