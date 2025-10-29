import { VercelRequest, VercelResponse } from '@vercel/node';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Create standardized API error
 */
export function createError(
  message: string, 
  statusCode: number = 500, 
  code?: string, 
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Common error types
 */
export const errors = {
  notFound: (resource: string = 'Resource') => 
    createError(`${resource} not found`, 404, 'NOT_FOUND'),
    
  unauthorized: (message: string = 'Unauthorized access') => 
    createError(message, 401, 'UNAUTHORIZED'),
    
  forbidden: (message: string = 'Access forbidden') => 
    createError(message, 403, 'FORBIDDEN'),
    
  badRequest: (message: string = 'Invalid request', details?: any) => 
    createError(message, 400, 'BAD_REQUEST', details),
    
  conflict: (message: string = 'Resource conflict') => 
    createError(message, 409, 'CONFLICT'),
    
  rateLimit: (message: string = 'Rate limit exceeded') => 
    createError(message, 429, 'RATE_LIMITED'),
    
  internal: (message: string = 'Internal server error') => 
    createError(message, 500, 'INTERNAL_ERROR'),
    
  database: (message: string = 'Database operation failed') => 
    createError(message, 500, 'DATABASE_ERROR'),
    
  validation: (details: any) => 
    createError('Validation failed', 400, 'VALIDATION_ERROR', details)
};

/**
 * Error handling middleware
 */
export function withErrorHandler(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', {
        url: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      // If response already sent, don't try to send another
      if (res.headersSent) {
        return;
      }

      if (error instanceof Error) {
        const apiError = error as ApiError;
        const statusCode = apiError.statusCode || 500;
        
        // Don't expose internal error details in production
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        const errorResponse: any = {
          error: apiError.message || 'An error occurred',
          code: apiError.code || 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString()
        };
        
        if (apiError.details) {
          errorResponse.details = apiError.details;
        }
        
        if (isDevelopment && apiError.stack) {
          errorResponse.stack = apiError.stack;
        }
        
        return res.status(statusCode).json(errorResponse);
      }
      
      // Fallback for non-Error objects
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Async wrapper for handlers that automatically catches errors
 */
export function asyncHandler(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return withErrorHandler(handler);
}
