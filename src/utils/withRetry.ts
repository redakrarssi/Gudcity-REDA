/**
 * A utility for retrying operations with exponential backoff and jitter
 * to gracefully handle transient errors.
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

/**
 * Wraps an async function with retry logic
 * 
 * @param fn The function to retry
 * @param options Retry configuration options
 * @returns The return value of the function if successful
 * @throws The last error encountered if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { 
    maxRetries = 3,
    baseDelay = 300,
    maxDelay = 10000,
    shouldRetry = () => true,
    onRetry = () => {}
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }
      
      // If this was our last attempt, throw the error
      if (attempt >= maxRetries - 1) {
        throw error;
      }
      
      // Call the onRetry callback
      onRetry(error, attempt);
      
      // Calculate delay with exponential backoff and jitter
      // This prevents all clients from retrying at exactly the same time
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );
      
      // Add jitter - random value between 0-30% of the delay
      const jitter = Math.random() * 0.3 * exponentialDelay;
      
      // Final delay with jitter
      const delay = exponentialDelay + jitter;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the loop
  // but TypeScript needs it for return type completeness
  throw lastError;
}

/**
 * Specialized retry function for database operations
 * that detects common database connection errors
 */
export function withDatabaseRetry<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'shouldRetry'> = {}
): Promise<T> {
  return withRetry(fn, {
    ...options,
    shouldRetry: (error) => {
      // Only retry connection-related errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
          message.includes('connection') ||
          message.includes('timeout') ||
          message.includes('network') ||
          message.includes('socket') ||
          message.includes('econnreset') ||
          message.includes('database') ||
          message.includes('sql')
        );
      }
      return false;
    },
    onRetry: (error, attempt) => {
      console.warn(
        `Database operation failed (attempt ${attempt + 1}/${options.maxRetries || 3}):`,
        error instanceof Error ? error.message : error
      );
    }
  });
} 