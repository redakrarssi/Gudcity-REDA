/**
 * Secure Error Response Utility
 * Prevents information disclosure and provides consistent error handling
 */

import { v4 as uuidv4 } from 'uuid';

// Sensitive data patterns to filter out
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credit_card/i,
  /ssn/i,
  /social_security/i,
  /api_key/i,
  /private_key/i,
  /database_url/i,
  /connection_string/i,
  /jwt_secret/i,
  /qr_secret/i,
  /neondb_owner/i,
  /npg_rpc6Nh5oKGzt/i
];

/**
 * Sanitize error message to prevent information disclosure
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  
  // Remove sensitive data patterns
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Remove file paths that might expose system structure
  sanitized = sanitized.replace(/\/[\/\w\-\.]+\.(js|ts|jsx|tsx|json|sql)/g, '[FILE]');
  
  // Remove stack traces in production
  if (process.env.NODE_ENV === 'production') {
    sanitized = sanitized.replace(/at\s+.*\s+\(.*\)/g, '');
    sanitized = sanitized.replace(/at\s+.*/g, '');
  }
  
  return sanitized;
}

/**
 * Determine if we're in a development environment
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.NODE_ENV === 'test' ||
         process.env.VITE_DEBUG === 'true';
}

/**
 * Create a secure error response
 */
export function createSecureErrorResponse(
  error: Error | unknown, 
  isDevelopment: boolean = false
): { statusCode: number; response: any } {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();
  
  // Determine error type and status code
  let statusCode = 500;
  let errorType = 'InternalServerError';
  let message = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorType = 'ValidationError';
      message = 'Invalid request data';
    } else if (error.name === 'UnauthorizedError') {
      statusCode = 401;
      errorType = 'UnauthorizedError';
      message = 'Authentication required';
    } else if (error.name === 'ForbiddenError') {
      statusCode = 403;
      errorType = 'ForbiddenError';
      message = 'Access denied';
    } else if (error.name === 'NotFoundError') {
      statusCode = 404;
      errorType = 'NotFoundError';
      message = 'Resource not found';
    } else if (error.name === 'ConflictError') {
      statusCode = 409;
      errorType = 'ConflictError';
      message = 'Resource conflict';
    } else if (error.name === 'RateLimitError') {
      statusCode = 429;
      errorType = 'RateLimitError';
      message = 'Too many requests';
    }
    
    // Sanitize error message
    const sanitizedMessage = sanitizeErrorMessage(error.message);
    if (isDevelopment) {
      message = sanitizedMessage;
    }
  }
  
  // Create base response
  const response: any = {
    error: errorType,
    message,
    requestId,
    timestamp
  };
  
  // Add development-specific information
  if (isDevelopment) {
    response.debug = {
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      originalMessage: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  return { statusCode, response };
}

/**
 * Log error securely without exposing sensitive information
 */
export function logSecureError(
  error: Error | unknown, 
  requestId: string, 
  context: Record<string, any> = {}
): void {
  const timestamp = new Date().toISOString();
  const isDevelopment = isDevelopmentEnvironment();
  
  // Sanitize context
  const sanitizedContext = { ...context };
  Object.keys(sanitizedContext).forEach(key => {
    const value = sanitizedContext[key];
    if (typeof value === 'string') {
      SENSITIVE_PATTERNS.forEach(pattern => {
        if (pattern.test(key) || pattern.test(value)) {
          sanitizedContext[key] = '[REDACTED]';
        }
      });
    }
  });
  
  // Log error with appropriate detail level
  const logData = {
    timestamp,
    requestId,
    error: error instanceof Error ? {
      name: error.name,
      message: sanitizeErrorMessage(error.message),
      stack: isDevelopment ? error.stack : undefined
    } : 'Unknown error',
    context: sanitizedContext
  };
  
  if (isDevelopment) {
    console.error('🔴 Error Details:', logData);
  } else {
    console.error('🔴 Error:', {
      timestamp,
      requestId,
      errorType: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? sanitizeErrorMessage(error.message) : 'Unknown error'
    });
  }
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(data: any, message?: string): any {
  return {
    success: true,
    data,
    message: message || 'Operation completed successfully',
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate and sanitize input data
 */
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Remove potential script tags and dangerous content
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Validate required fields in request data
 */
export function validateRequiredFields(data: any, requiredFields: string[]): {
  isValid: boolean;
  missingFields: string[];
  sanitizedData: any;
} {
  const missingFields: string[] = [];
  const sanitizedData = sanitizeInput(data);
  
  requiredFields.forEach(field => {
    if (!sanitizedData[field] || 
        (typeof sanitizedData[field] === 'string' && sanitizedData[field].trim() === '')) {
      missingFields.push(field);
    }
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    sanitizedData
  };
}
