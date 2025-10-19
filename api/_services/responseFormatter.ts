/**
 * Response Formatter Utility
 * Provides consistent API response formatting across all endpoints
 */

import type { ApiResponse, ApiError, ApiMeta } from './types';

/**
 * Create a success response
 */
export function successResponse<T>(data: T, meta?: Partial<ApiMeta>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any,
  meta?: Partial<ApiMeta>
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Common error response builders
 */
export const ErrorResponses = {
  notFound: (resource: string, id?: string | number) =>
    errorResponse(
      'NOT_FOUND',
      `${resource}${id ? ` with ID ${id}` : ''} not found`
    ),

  unauthorized: (message = 'Authentication required') =>
    errorResponse('UNAUTHORIZED', message),

  forbidden: (message = 'Access denied') =>
    errorResponse('FORBIDDEN', message),

  badRequest: (message: string, details?: any) =>
    errorResponse('BAD_REQUEST', message, details),

  validationError: (errors: any) =>
    errorResponse('VALIDATION_ERROR', 'Validation failed', errors),

  serverError: (message = 'Internal server error', details?: any) =>
    errorResponse('SERVER_ERROR', message, details),

  rateLimitExceeded: (retryAfter?: number) =>
    errorResponse(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests',
      { retryAfter }
    ),

  methodNotAllowed: (allowedMethods: string[]) =>
    errorResponse(
      'METHOD_NOT_ALLOWED',
      'Method not allowed',
      { allowedMethods }
    ),

  conflict: (message: string, details?: any) =>
    errorResponse('CONFLICT', message, details),

  databaseError: (message = 'Database operation failed') =>
    errorResponse('DATABASE_ERROR', message),
};

/**
 * Wrap async handler with consistent error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<ApiResponse<T>> {
  return handler()
    .then((data) => successResponse(data))
    .catch((error) => {
      console.error('API Handler Error:', error);
      return errorResponse(
        'SERVER_ERROR',
        error.message || 'Internal server error',
        process.env.NODE_ENV === 'development' ? error.stack : undefined
      );
    });
}

