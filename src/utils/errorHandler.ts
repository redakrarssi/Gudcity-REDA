import sql from '../dev-only/db';
import env from './env';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// For business logic errors
export class BusinessError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

// For authentication errors
export class AuthError extends AppError {
  constructor(message: string = 'Authentication error') {
    super(message, 401);
  }
}

// For authorization errors
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

// For not found errors
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

// For database validation errors
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

// Log error details
export function logError(error: Error, req?: any): void {
  // Create a formatted error object for logging
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    requestInfo: req ? {
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
      ip: req.ip,
      userId: req.user?.id
    } : undefined
  };
  
  // Log to console in development
  if (env.isDevelopment()) {
    console.error('ERROR DETAILS:', JSON.stringify(errorDetails, null, 2));
  } else {
    // In production, only log basic error info to console
    console.error(`ERROR: ${error.message}`);
  }
  
  // Log to database if it's a production error
  if (env.isProduction() && error instanceof AppError && error.isOperational) {
    logErrorToDatabase(errorDetails, req?.user?.id).catch(dbError => {
      console.error('Failed to log error to database:', dbError);
    });
  }
}

// Log errors to database for monitoring
async function logErrorToDatabase(errorDetails: any, userId?: number): Promise<void> {
  try {
    // Create error_logs table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS error_logs (
        id SERIAL PRIMARY KEY,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        error_type VARCHAR(100),
        user_id INTEGER,
        request_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Insert error log
    await sql`
      INSERT INTO error_logs (
        error_message,
        error_stack,
        error_type,
        user_id,
        request_data
      ) VALUES (
        ${errorDetails.message},
        ${errorDetails.stack || null},
        ${errorDetails.constructor?.name || 'UnknownError'},
        ${userId || null},
        ${errorDetails.requestInfo ? JSON.stringify(errorDetails.requestInfo) : null}
      )
    `;
  } catch (dbError) {
    // Just log to console if database logging fails
    console.error('Failed to log error to database:', dbError);
  }
}

// Global error handler for async functions
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    fn(req, res, next).catch((error: Error) => {
      logError(error, req);
      next(error);
    });
  };
}

// Transaction wrapper for database operations
export async function withTransaction<T>(operation: () => Promise<T>): Promise<T> {
  try {
    // Start transaction using tagged template literal
    await sql`BEGIN`;
    
    // Run the operation
    const result = await operation();
    
    // Commit if successful using tagged template literal
    await sql`COMMIT`;
    
    return result;
  } catch (error) {
    // Rollback on error using tagged template literal
    await sql`ROLLBACK`;
    throw error;
  }
}

export default {
  AppError,
  BusinessError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  logError,
  asyncHandler,
  withTransaction
}; 