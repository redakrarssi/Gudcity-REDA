/**
 * Secure Error Handler
 * 
 * SECURITY: Prevents information leakage through error messages
 * Provides detailed errors in development, generic errors in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Handle errors securely in API endpoints
 */
export function handleApiError(error: any, res: any): void {
  // Always log full error server-side
  console.error('[API Error]', {
    message: error.message,
    stack: isDevelopment ? error.stack : undefined,
    code: error.code,
    name: error.name,
    timestamp: new Date().toISOString(),
  });
  
  // In production: generic message only
  if (isProduction) {
    // Determine appropriate status code
    const statusCode = getStatusCode(error);
    
    return res.status(statusCode).json({
      error: 'An error occurred while processing your request',
      code: 'INTERNAL_ERROR',
      // NO stack trace, NO SQL details, NO file paths
    });
  }
  
  // In development: detailed error for debugging
  return res.status(getStatusCode(error)).json({
    error: sanitizeErrorMessage(error.message),
    stack: error.stack,
    code: error.code || 'INTERNAL_ERROR',
    name: error.name,
    // Development only
  });
}

/**
 * Sanitize error message (remove sensitive information)
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return 'An error occurred';
  
  // Remove SQL error details
  if (message.toLowerCase().includes('sql') ||
      message.toLowerCase().includes('postgres') ||
      message.toLowerCase().includes('database') ||
      message.toLowerCase().includes('query')) {
    return 'A database error occurred';
  }
  
  // Remove file paths (Unix and Windows)
  let sanitized = message.replace(/\/[^\s\)]+/g, '[path]');
  sanitized = sanitized.replace(/[A-Z]:\\[^\s\)]+/gi, '[path]');
  
  // Remove connection strings
  sanitized = sanitized.replace(/postgres:\/\/[^\s]+/gi, '[connection]');
  sanitized = sanitized.replace(/mysql:\/\/[^\s]+/gi, '[connection]');
  sanitized = sanitized.replace(/mongodb:\/\/[^\s]+/gi, '[connection]');
  
  // Remove stack trace
  if (sanitized.includes('\n')) {
    sanitized = sanitized.split('\n')[0];
  }
  
  // Remove function names and line numbers
  sanitized = sanitized.replace(/at\s+\w+\s+\([^\)]+\)/g, '');
  
  return sanitized;
}

/**
 * Determine HTTP status code from error
 */
function getStatusCode(error: any): number {
  if (error.statusCode) return error.statusCode;
  if (error.status) return error.status;
  
  // Map error types to status codes
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'UnauthorizedError') return 401;
  if (error.name === 'ForbiddenError') return 403;
  if (error.name === 'NotFoundError') return 404;
  if (error.name === 'ConflictError') return 409;
  if (error.name === 'TooManyRequestsError') return 429;
  
  // Default to 500 for unknown errors
  return 500;
}

/**
 * Create safe error response object
 */
export function createSafeErrorResponse(error: any): {
  statusCode: number;
  response: any;
} {
  const statusCode = getStatusCode(error);
  
  if (isProduction) {
    return {
      statusCode,
      response: {
        error: getGenericErrorMessage(statusCode),
        code: 'ERROR',
      },
    };
  }
  
  return {
    statusCode,
    response: {
      error: sanitizeErrorMessage(error.message),
      code: error.code || 'ERROR',
      name: error.name,
    },
  };
}

/**
 * Get generic error message based on status code
 */
function getGenericErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'Invalid request';
    case 401: return 'Authentication required';
    case 403: return 'Access denied';
    case 404: return 'Resource not found';
    case 409: return 'Resource conflict';
    case 429: return 'Too many requests';
    case 500: return 'Internal server error';
    default: return 'An error occurred';
  }
}

/**
 * Log error securely (safe for production)
 */
export function logSecureError(error: any, context?: string): void {
  const errorInfo = {
    message: sanitizeErrorMessage(error.message || error.toString()),
    name: error.name,
    code: error.code,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };
  
  // In development, include stack trace
  if (isDevelopment) {
    (errorInfo as any).stack = error.stack;
  }
  
  console.error('[Secure Error Log]', errorInfo);
  
  // In production, you might want to send to external logging service
  // e.g., Sentry, LogRocket, Datadog, etc.
  if (isProduction) {
    // Example: Send to external service
    // sendToLoggingService(errorInfo);
  }
}

/**
 * Express middleware for secure error handling
 */
export function secureErrorMiddleware(err: any, req: any, res: any, next: any): void {
  // Log error securely
  logSecureError(err, `${req.method} ${req.path}`);
  
  // Send safe error response
  const { statusCode, response } = createSafeErrorResponse(err);
  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export default {
  handleApiError,
  sanitizeErrorMessage,
  createSafeErrorResponse,
  logSecureError,
  secureErrorMiddleware,
  asyncHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
