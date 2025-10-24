/**
 * Database Retry Utility
 * 
 * Provides mechanisms for handling transient database errors through retry with
 * exponential backoff and circuit breaking to prevent cascading failures.
 */
import sql from './db';
import { logQrCodeError, QrDatabaseError } from './qrCodeErrorHandler';

// Circuit breaker state
let circuitBreakerOpen = false;
let lastFailureTime = 0;
const CIRCUIT_BREAKER_TIMEOUT_MS = 30000; // 30 seconds

// Default retry configuration
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 3000,
  timeoutMs: 10000,
  backoffFactor: 2
};

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  backoffFactor?: number;
}

/**
 * Check if the circuit breaker is open (too many failures)
 */
export function isCircuitBreakerOpen(): boolean {
  // If circuit is open but the timeout has passed, close it
  if (circuitBreakerOpen && Date.now() - lastFailureTime > CIRCUIT_BREAKER_TIMEOUT_MS) {
    console.log('📊 Circuit breaker reset after timeout period');
    circuitBreakerOpen = false;
  }
  
  return circuitBreakerOpen;
}

/**
 * Open the circuit breaker to prevent further database calls
 */
export function openCircuitBreaker(): void {
  circuitBreakerOpen = true;
  lastFailureTime = Date.now();
  console.error('🔌 Circuit breaker opened due to persistent database failures');
}

/**
 * Reset the circuit breaker manually
 */
export function resetCircuitBreaker(): void {
  circuitBreakerOpen = false;
  console.log('🔌 Circuit breaker manually reset');
}

/**
 * Check if an error is a transient database error that can be retried
 */
function isRetryableError(error: any): boolean {
  // Database connection errors
  if (error.code === 'ECONNREFUSED' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNRESET' || 
      error.code === 'ENOTFOUND') {
    return true;
  }
  
  // Postgres-specific error codes for transient errors
  if (error.code === '08006' || // Connection failure
      error.code === '08001' || // Unable to connect
      error.code === '08004' || // Rejected connection
      error.code === '40001' || // Serialization failure
      error.code === '40P01' || // Deadlock detected
      error.code === '57P01' || // Admin shutdown
      error.code === '57P02' || // Crash shutdown
      error.code === '57P03') { // Cannot connect now
    return true;
  }
  
  // Check error message for common transient error indicators
  const errorMessage = error.message?.toLowerCase() || '';
  return errorMessage.includes('timeout') || 
         errorMessage.includes('temporarily unavailable') || 
         errorMessage.includes('connection') || 
         errorMessage.includes('network') ||
         errorMessage.includes('deadlock') ||
         errorMessage.includes('too many connections');
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const { initialDelayMs, maxDelayMs, backoffFactor } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };
  
  // Calculate exponential backoff with jitter
  const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt);
  const jitter = Math.random() * 0.3 + 0.85; // Random between 0.85 and 1.15
  const delay = exponentialDelay * jitter;
  
  // Ensure the delay doesn't exceed the maximum
  return Math.min(delay, maxDelayMs);
}

/**
 * Wait for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a database query with retry capability for transient errors
 * 
 * @param queryFn Function that returns a SQL query to execute
 * @param context Optional context information for logging
 * @param config Retry configuration options
 * @returns Query result
 */
export async function withRetryableQuery<T>(
  queryFn: () => Promise<any>,
  context: Record<string, any> = {},
  config: RetryConfig = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const { maxRetries, timeoutMs } = retryConfig;
  
  // Check if circuit breaker is open to prevent cascading failures
  if (isCircuitBreakerOpen()) {
    throw new QrDatabaseError('Database circuit breaker open - too many recent failures', { 
      circuitBreakerTimeout: CIRCUIT_BREAKER_TIMEOUT_MS,
      lastFailure: new Date(lastFailureTime).toISOString(),
      ...context
    });
  }
  
  let lastError: any;
  let consecutiveErrors = 0;
  
  // Add timeout to the query if specified
  const queryWithTimeout = async () => {
    if (!timeoutMs) return queryFn();
    
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    
    // Race the query against the timeout
    return Promise.race([queryFn(), timeoutPromise]);
  };
  
  // Attempt the query with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait before retrying (except on first attempt)
      if (attempt > 0) {
        const delayMs = calculateBackoffDelay(attempt, retryConfig);
        console.warn(`🔄 Retrying database query (attempt ${attempt}/${maxRetries}) after ${delayMs}ms delay`);
        await delay(delayMs);
      }
      
      // Execute the query
      const result = await queryWithTimeout();
      
      // If we had errors but now succeeded, log recovery
      if (attempt > 0) {
        console.log(`✅ Database query recovered after ${attempt} retries`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      consecutiveErrors++;
      
      // Log the error with retry information
      console.error(`❌ Database query error (attempt ${attempt}/${maxRetries}):`, error);
      
      // If this is not a retryable error, don't retry
      if (!isRetryableError(error)) {
        logQrCodeError(error instanceof Error ? error : new Error(String(error)), { 
          attemptNumber: attempt,
          maxRetries,
          retryable: false,
          ...context 
        });
        throw new QrDatabaseError('Non-retryable database error', { 
          attemptNumber: attempt,
          originalError: error.message || String(error),
          ...context
        });
      }
      
      // If we've reached max retries, throw the final error
      if (attempt === maxRetries) {
        logQrCodeError(error instanceof Error ? error : new Error(String(error)), { 
          attemptNumber: attempt,
          maxRetries,
          ...context 
        });
        
        // Open circuit breaker if we've hit a significant number of consecutive errors
        if (consecutiveErrors >= 5) {
          openCircuitBreaker();
        }
        
        throw new QrDatabaseError(`Database query failed after ${maxRetries} retries`, { 
          attemptNumber: attempt,
          originalError: error.message || String(error),
          ...context
        });
      }
    }
  }
  
  // This should not be reached due to the throws above
  throw lastError || new Error('Unknown database error');
}

/**
 * Execute a database transaction with retry capability for transient errors
 * 
 * @param transactionFn Function containing SQL queries to execute in a transaction
 * @param context Optional context information for logging
 * @param config Retry configuration options
 * @returns Transaction result
 */
export async function withRetryableTransaction<T>(
  transactionFn: () => Promise<T>,
  context: Record<string, any> = {},
  config: RetryConfig = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const { maxRetries } = retryConfig;
  
  // Check if circuit breaker is open
  if (isCircuitBreakerOpen()) {
    throw new QrDatabaseError('Database circuit breaker open - too many recent failures', { 
      circuitBreakerTimeout: CIRCUIT_BREAKER_TIMEOUT_MS,
      lastFailure: new Date(lastFailureTime).toISOString(),
      ...context
    });
  }
  
  let lastError: any;
  
  // Attempt the transaction with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait before retrying (except on first attempt)
      if (attempt > 0) {
        const delayMs = calculateBackoffDelay(attempt, retryConfig);
        console.warn(`🔄 Retrying database transaction (attempt ${attempt}/${maxRetries}) after ${delayMs}ms delay`);
        await delay(delayMs);
      }
      
      // For transaction, we need to handle BEGIN/COMMIT/ROLLBACK
      // We don't use the Postgres BEGIN/COMMIT because we need to control it for retries
      try {
        await sql`BEGIN`;
        const result = await transactionFn();
        await sql`COMMIT`;
        
        // If we had errors but now succeeded, log recovery
        if (attempt > 0) {
          console.log(`✅ Database transaction recovered after ${attempt} retries`);
        }
        
        return result;
      } catch (txError) {
        // Always try to rollback if the transaction fails
        try {
          await sql`ROLLBACK`;
        } catch (rollbackError) {
          console.error('Error during transaction rollback:', rollbackError);
        }
        
        // Re-throw the original error
        throw txError;
      }
    } catch (error: any) {
      lastError = error;
      
      // Log the error with retry information
      console.error(`❌ Database transaction error (attempt ${attempt}/${maxRetries}):`, error);
      
      // If this is not a retryable error, don't retry
      if (!isRetryableError(error)) {
        logQrCodeError(error instanceof Error ? error : new Error(String(error)), { 
          attemptNumber: attempt,
          maxRetries,
          retryable: false,
          transactionFailed: true,
          ...context 
        });
        throw new QrDatabaseError('Non-retryable transaction error', { 
          attemptNumber: attempt,
          originalError: error.message || String(error),
          ...context
        });
      }
      
      // If we've reached max retries, throw the final error
      if (attempt === maxRetries) {
        logQrCodeError(error instanceof Error ? error : new Error(String(error)), { 
          attemptNumber: attempt,
          maxRetries,
          transactionFailed: true,
          ...context 
        });
        
        // Open circuit breaker on repeated transaction failures
        if (attempt >= 3) {
          openCircuitBreaker();
        }
        
        throw new QrDatabaseError(`Database transaction failed after ${maxRetries} retries`, { 
          attemptNumber: attempt,
          originalError: error.message || String(error),
          ...context
        });
      }
    }
  }
  
  // This should not be reached due to the throws above
  throw lastError || new Error('Unknown database transaction error');
}
