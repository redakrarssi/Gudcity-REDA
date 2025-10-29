// Middleware exports for easy importing in serverless functions
export { withAuth, withRole, generateToken, generateRefreshToken, verifyRefreshToken } from '../_lib/auth';
export { withCors } from '../_lib/cors';
export { withValidation, validateInput, sanitizeInput } from '../_lib/validation';
export { withRateLimit, withStrictRateLimit } from '../_lib/rate-limit';
export { withErrorHandler, asyncHandler, createError, errors } from '../_lib/error-handler';
export { sendSuccess, sendError, sendPaginated, sendCreated, sendNoContent, getPaginationParams, getSortParams } from '../_lib/response';
export { default as sql, testConnection, withTransaction } from '../_lib/db';

// Utility function to combine multiple middlewares
export function compose(...middlewares: Function[]) {
  return middlewares.reduce((a, b) => (...args: any[]) => a(b(...args)));
}
