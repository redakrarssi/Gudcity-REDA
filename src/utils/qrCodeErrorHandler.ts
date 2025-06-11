/**
 * QR Code Error Handler
 * 
 * Provides specialized error handling and categorization for QR code operations.
 */
import sql from './db';

/**
 * Error types specific to QR code operations
 */
export enum QrErrorType {
  VALIDATION = 'validation',
  DATABASE = 'database',
  SECURITY = 'security',
  RATE_LIMIT = 'rate_limit',
  EXPIRATION = 'expiration',
  BUSINESS_LOGIC = 'business_logic',
  UNKNOWN = 'unknown'
}

/**
 * Base class for QR code-related errors
 */
export class QrCodeError extends Error {
  public errorType: QrErrorType;
  public timestamp: Date;
  public context: Record<string, any>;
  public errorCode: string;
  
  constructor(
    message: string, 
    errorType: QrErrorType = QrErrorType.UNKNOWN,
    context: Record<string, any> = {},
    errorCode: string = 'QR_ERR_UNKNOWN'
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorType = errorType;
    this.timestamp = new Date();
    this.context = context;
    this.errorCode = errorCode;
    
    // Set prototype explicitly for instanceof to work correctly with transpiled code
    Object.setPrototypeOf(this, QrCodeError.prototype);
  }
  
  /**
   * Get a user-friendly message suitable for display to end users
   */
  getUserMessage(): string {
    switch (this.errorType) {
      case QrErrorType.VALIDATION:
        return 'The QR code information provided is invalid or incomplete.';
      case QrErrorType.DATABASE:
        return 'We encountered a technical issue while processing your QR code.';
      case QrErrorType.SECURITY:
        return 'This QR code operation could not be completed due to security concerns.';
      case QrErrorType.RATE_LIMIT:
        return 'Too many QR code operations requested. Please try again later.';
      case QrErrorType.EXPIRATION:
        return 'This QR code has expired and is no longer valid.';
      case QrErrorType.BUSINESS_LOGIC:
        return 'This QR code operation could not be completed due to business rules.';
      default:
        return 'An unexpected error occurred while processing the QR code.';
    }
  }
  
  /**
   * Serialize error for logging or API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      errorType: this.errorType,
      errorCode: this.errorCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context
    };
  }
}

/**
 * Validation error for QR code data
 */
export class QrValidationError extends QrCodeError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      message,
      QrErrorType.VALIDATION,
      context,
      'QR_ERR_VALIDATION'
    );
    Object.setPrototypeOf(this, QrValidationError.prototype);
  }
}

/**
 * Database error for QR code operations
 */
export class QrDatabaseError extends QrCodeError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      message,
      QrErrorType.DATABASE,
      context,
      'QR_ERR_DATABASE'
    );
    Object.setPrototypeOf(this, QrDatabaseError.prototype);
  }
}

/**
 * Security error for QR code operations
 */
export class QrSecurityError extends QrCodeError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      message,
      QrErrorType.SECURITY,
      context,
      'QR_ERR_SECURITY'
    );
    Object.setPrototypeOf(this, QrSecurityError.prototype);
  }
}

/**
 * Rate limit error for QR code operations
 */
export class QrRateLimitError extends QrCodeError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      message,
      QrErrorType.RATE_LIMIT,
      context,
      'QR_ERR_RATE_LIMIT'
    );
    Object.setPrototypeOf(this, QrRateLimitError.prototype);
  }
}

/**
 * Expiration error for QR codes
 */
export class QrExpirationError extends QrCodeError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      message,
      QrErrorType.EXPIRATION,
      context,
      'QR_ERR_EXPIRATION'
    );
    Object.setPrototypeOf(this, QrExpirationError.prototype);
  }
}

/**
 * Business logic error for QR code operations
 */
export class QrBusinessLogicError extends QrCodeError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      message,
      QrErrorType.BUSINESS_LOGIC,
      context,
      'QR_ERR_BUSINESS_LOGIC'
    );
    Object.setPrototypeOf(this, QrBusinessLogicError.prototype);
  }
}

/**
 * Log a QR code error to the database and console
 */
export async function logQrCodeError(
  error: Error,
  context: Record<string, any> = {}
): Promise<void> {
  // Determine error type
  let errorType = QrErrorType.UNKNOWN;
  let errorCode = 'QR_ERR_UNKNOWN';
  
  if (error instanceof QrCodeError) {
    errorType = error.errorType;
    errorCode = error.errorCode;
    // Merge the error's context with the provided context
    context = { ...error.context, ...context };
  } else {
    // Try to categorize based on error message
    const message = error.message.toLowerCase();
    if (message.includes('invalid') || message.includes('validation') || message.includes('schema')) {
      errorType = QrErrorType.VALIDATION;
      errorCode = 'QR_ERR_VALIDATION';
    } else if (message.includes('database') || message.includes('sql') || message.includes('query')) {
      errorType = QrErrorType.DATABASE;
      errorCode = 'QR_ERR_DATABASE';
    } else if (message.includes('security') || message.includes('unauthorized') || message.includes('forbidden')) {
      errorType = QrErrorType.SECURITY;
      errorCode = 'QR_ERR_SECURITY';
    } else if (message.includes('rate limit') || message.includes('too many requests')) {
      errorType = QrErrorType.RATE_LIMIT;
      errorCode = 'QR_ERR_RATE_LIMIT';
    } else if (message.includes('expired') || message.includes('expiration')) {
      errorType = QrErrorType.EXPIRATION;
      errorCode = 'QR_ERR_EXPIRATION';
    }
  }
  
  // Log to console
  console.error(`QR Code Error [${errorType}]: ${error.message}`, {
    errorType,
    errorCode,
    stack: error.stack,
    context
  });
  
  try {
    // Log to database
    await sql`
      INSERT INTO error_logs (
        error_type,
        error_code,
        message,
        stack_trace,
        context_data,
        created_at
      ) VALUES (
        ${errorType},
        ${errorCode},
        ${error.message},
        ${error.stack || null},
        ${JSON.stringify(context)},
        NOW()
      )
    `;
  } catch (dbError) {
    // If we can't log to the database, at least log to console
    console.error('Failed to log QR code error to database:', dbError);
  }
}

/**
 * Map an error to the appropriate QR code error type
 */
export function mapToQrCodeError(
  error: any, 
  context: Record<string, any> = {}
): QrCodeError {
  if (error instanceof QrCodeError) {
    // If it's already a QR code error, return it
    return error;
  }
  
  const message = typeof error === 'string' 
    ? error 
    : error instanceof Error 
      ? error.message 
      : 'Unknown error';
  
  // Try to categorize based on error message or context
  const lowerMessage = message.toLowerCase();
  
  if (context.validationError || lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
    return new QrValidationError(message, context);
  }
  
  if (context.securityError || lowerMessage.includes('security') || lowerMessage.includes('unauthorized')) {
    return new QrSecurityError(message, context);
  }
  
  if (context.rateLimit || lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    return new QrRateLimitError(message, context);
  }
  
  if (context.expiration || lowerMessage.includes('expired') || lowerMessage.includes('expiration')) {
    return new QrExpirationError(message, context);
  }
  
  if (context.databaseError || lowerMessage.includes('database') || lowerMessage.includes('sql')) {
    return new QrDatabaseError(message, context);
  }
  
  if (context.businessLogic || lowerMessage.includes('business') || lowerMessage.includes('rule')) {
    return new QrBusinessLogicError(message, context);
  }
  
  // Default to a generic QR code error
  return new QrCodeError(message, QrErrorType.UNKNOWN, context);
}
