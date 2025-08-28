/**
 * Secure Error Response Utility
 * Prevents information disclosure in API error responses
 */

import { v4 as uuidv4 } from 'uuid';

export interface SecureErrorResponse {
  error: string;
  requestId: string;
  timestamp: string;
  debug?: {
    message: string;
    type: string;
  };
}

export interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

/**
 * Generate a unique request ID for error tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${uuidv4().substring(0, 8)}`;
}

/**
 * Get generic error message based on status code
 */
export function getGenericErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request - Invalid input provided';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Access denied';
    case 404:
      return 'Resource not found';
    case 409:
      return 'Resource conflict';
    case 422:
      return 'Validation failed';
    case 429:
      return 'Too many requests';
    case 500:
      return 'Internal server error';
    case 503:
      return 'Service temporarily unavailable';
    default:
      return 'An error occurred';
  }
}

/**
 * Enhanced environment detection for security
 */
export function isDevelopmentEnvironment(): boolean {
  // SECURITY: More comprehensive environment detection
  const env = process.env.NODE_ENV || process.env.APP_ENV || '';
  const isDev = env === 'development' || env === 'dev' || env === 'local';
  const isTest = env === 'test';
  
  // Never expose debug info in production-like environments
  if (process.env.FORCE_PRODUCTION === 'true') {
    return false;
  }
  
  return isDev && !isTest;
}

/**
 * Create a secure error response that doesn't leak sensitive information
 */
export function createSecureErrorResponse(
  error: any, 
  isDevelopment: boolean = false,
  customRequestId?: string
): { statusCode: number; response: SecureErrorResponse } {
  const statusCode = error?.statusCode || error?.status || 500;
  const requestId = customRequestId || generateRequestId();
  
  const response: SecureErrorResponse = {
    error: getGenericErrorMessage(statusCode),
    requestId,
    timestamp: new Date().toISOString()
  };
  
  // SECURITY: Only add debug information in verified development environment
  if (isDevelopment && isDevelopmentEnvironment() && error) {
    // Sanitize error message to prevent information disclosure
    const sanitizedMessage = sanitizeErrorMessage(error.message || 'Unknown error');
    const sanitizedType = sanitizeErrorType(error.name || error.constructor?.name || 'Error');
    
    response.debug = {
      message: sanitizedMessage,
      type: sanitizedType
    };
  }
  
  return { statusCode, response };
}

/**
 * Sanitize error messages to prevent information disclosure
 */
function sanitizeErrorMessage(message: string): string {
  // Remove potentially sensitive information
  const sensitivePatterns = [
    /database|db|sql|query/i,
    /password|secret|key|token/i,
    /file|path|directory/i,
    /stack|trace/i,
    /internal|system/i
  ];
  
  let sanitized = message;
  
  // Replace sensitive patterns with generic messages
  sensitivePatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
  });
  
  // Limit message length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100) + '...';
  }
  
  return sanitized;
}

/**
 * Sanitize error types to prevent information disclosure
 */
function sanitizeErrorType(type: string): string {
  // Only allow safe error types
  const safeTypes = [
    'Error', 'ValidationError', 'AuthenticationError', 'AuthorizationError',
    'NotFoundError', 'ConflictError', 'RateLimitError', 'ServerError'
  ];
  
  if (safeTypes.includes(type)) {
    return type;
  }
  
  // Return generic type for unknown error types
  return 'Error';
}

/**
 * Error classification for security purposes
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization', 
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown'
}

/**
 * Classify error for logging and monitoring
 */
export function classifyError(error: any): ErrorCategory {
  const statusCode = error?.statusCode || error?.status;
  const message = error?.message?.toLowerCase() || '';
  
  if (statusCode === 401 || message.includes('unauthorized') || message.includes('authentication')) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  if (statusCode === 403 || message.includes('forbidden') || message.includes('access denied')) {
    return ErrorCategory.AUTHORIZATION;
  }
  
  if (statusCode === 400 || statusCode === 422 || message.includes('validation') || message.includes('invalid')) {
    return ErrorCategory.VALIDATION;
  }
  
  if (statusCode === 404 || message.includes('not found')) {
    return ErrorCategory.NOT_FOUND;
  }
  
  if (statusCode === 409 || message.includes('conflict') || message.includes('duplicate')) {
    return ErrorCategory.CONFLICT;
  }
  
  if (statusCode === 429 || message.includes('rate limit') || message.includes('too many')) {
    return ErrorCategory.RATE_LIMIT;
  }
  
  if (statusCode >= 500) {
    return ErrorCategory.SERVER_ERROR;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Secure error logging that doesn't expose sensitive information in logs
 */
export function logSecureError(
  error: any, 
  requestId: string, 
  context?: Record<string, any>
): void {
  const category = classifyError(error);
  const logData = {
    requestId,
    category,
    timestamp: new Date().toISOString(),
    statusCode: error?.statusCode || error?.status || 500,
    message: error?.message || 'Unknown error',
    context: context ? sanitizeLogContext(context) : undefined
  };
  
  // Use appropriate log level based on error category
  if (category === ErrorCategory.SERVER_ERROR) {
    console.error('SECURE ERROR LOG:', logData);
  } else if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.AUTHORIZATION) {
    console.warn('SECURITY LOG:', logData);
  } else {
    console.info('ERROR LOG:', logData);
  }
}

/**
 * Sanitize context data for logging (remove sensitive fields)
 */
function sanitizeLogContext(context: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password', 'password_hash', 'token', 'secret', 'key', 
    'authorization', 'cookie', 'session', 'credit_card', 
    'ssn', 'phone', 'address', 'api_key', 'database_url',
    'jwt_secret', 'refresh_token'
  ];
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(context)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => keyLower.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogContext(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
<<<<<<< Current (Your changes)

/**
 * Check if we're in development environment
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.NODE_ENV === 'dev' ||
         !process.env.NODE_ENV;
}
=======
>>>>>>> Incoming (Background Agent changes)
