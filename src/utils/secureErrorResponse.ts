/**
 * SECURE Error Response Utility
 * Prevents information disclosure in API error responses
 */

import { v4 as uuidv4 } from 'uuid';

export interface SecureErrorResponse {
  error: string;
  requestId: string;
  timestamp: string;
  // SECURITY: Removed debug field to prevent information disclosure
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
 * SECURITY: Generic messages that don't reveal system details
 */
export function getGenericErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
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
 * Create a secure error response that doesn't leak sensitive information
 * SECURITY: Never expose internal error details, even in development
 */
export function createSecureErrorResponse(
  error: any, 
  isDevelopment: boolean = false,
  customRequestId?: string
): { statusCode: number; response: SecureErrorResponse } {
  const statusCode = error?.statusCode || error?.status || 500;
  const requestId = customRequestId || generateRequestId();
  
  // SECURITY: Always use generic error messages, never expose internal details
  const response: SecureErrorResponse = {
    error: getGenericErrorMessage(statusCode),
    requestId,
    timestamp: new Date().toISOString()
  };
  
  // SECURITY: Log detailed error information server-side but never expose to client
  if (error) {
    logSecureError(error, requestId, { 
      isDevelopment, 
      originalError: error.message || 'Unknown error',
      errorType: error.name || error.constructor?.name || 'Error'
    });
  }
  
  return { statusCode, response };
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
 * SECURITY: Enhanced classification for security monitoring
 */
export function classifyError(error: any): ErrorCategory {
  const statusCode = error?.statusCode || error?.status;
  const message = error?.message?.toLowerCase() || '';
  
  // SECURITY: Enhanced security event detection
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
 * SECURITY: Enhanced logging for security monitoring
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
    context: context ? sanitizeLogContext(context) : undefined,
    // SECURITY: Add security-relevant metadata
    securityLevel: getSecurityLevel(category),
    ipAddress: context?.ipAddress || 'unknown',
    userAgent: context?.userAgent || 'unknown',
    endpoint: context?.endpoint || 'unknown'
  };
  
  // SECURITY: Use appropriate log level based on error category and security level
  const securityLevel = getSecurityLevel(category);
  
  if (securityLevel === 'CRITICAL') {
    console.error('🚨 CRITICAL SECURITY EVENT:', logData);
    // TODO: Implement security alerting system
  } else if (securityLevel === 'HIGH') {
    console.error('⚠️ HIGH SECURITY EVENT:', logData);
  } else if (category === ErrorCategory.SERVER_ERROR) {
    console.error('ERROR:', logData);
  } else if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.AUTHORIZATION) {
    console.warn('SECURITY:', logData);
  } else {
    console.info('INFO:', logData);
  }
}

/**
 * SECURITY: Determine security level based on error category
 */
function getSecurityLevel(category: ErrorCategory): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return 'HIGH';
    case ErrorCategory.AUTHORIZATION:
      return 'CRITICAL';
    case ErrorCategory.VALIDATION:
      return 'MEDIUM';
    case ErrorCategory.RATE_LIMIT:
      return 'MEDIUM';
    case ErrorCategory.SERVER_ERROR:
      return 'HIGH';
    default:
      return 'LOW';
  }
}

/**
 * Sanitize context data for logging (remove sensitive fields)
 * SECURITY: Enhanced sanitization to prevent data leakage
 */
function sanitizeLogContext(context: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password', 'password_hash', 'token', 'secret', 'key', 
    'authorization', 'cookie', 'session', 'credit_card', 
    'ssn', 'phone', 'address', 'api_key', 'jwt', 'refresh_token',
    'private_key', 'certificate', 'encryption_key', 'salt'
  ];
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(context)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => keyLower.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogContext(value);
    } else if (typeof value === 'string' && value.length > 100) {
      // SECURITY: Truncate long strings to prevent log flooding
      sanitized[key] = value.substring(0, 100) + '...';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check if we're in development environment
 * SECURITY: More restrictive environment detection
 */
export function isDevelopmentEnvironment(): boolean {
  // SECURITY: Only consider development if explicitly set and not production
  return process.env.NODE_ENV === 'development' && process.env.NODE_ENV !== 'production';
}

/**
 * SECURITY: Create a standardized error response for all endpoints
 */
export function createStandardErrorResponse(
  statusCode: number,
  requestId?: string
): { statusCode: number; response: SecureErrorResponse } {
  return createSecureErrorResponse({ statusCode }, false, requestId);
}

/**
 * SECURITY: Handle unexpected errors gracefully
 */
export function handleUnexpectedError(
  error: any,
  requestId?: string
): { statusCode: number; response: SecureErrorResponse } {
  // SECURITY: Always return 500 for unexpected errors to prevent information disclosure
  const statusCode = 500;
  const requestIdToUse = requestId || generateRequestId();
  
  // Log the full error for debugging
  logSecureError(error, requestIdToUse, { 
    errorType: 'unexpected',
    stack: error?.stack
  });
  
  return {
    statusCode,
    response: {
      error: getGenericErrorMessage(statusCode),
      requestId: requestIdToUse,
      timestamp: new Date().toISOString()
    }
  };
}
