/**
 * A reusable hook for standardized data loading patterns across the application.
 * This provides consistent error handling, loading states, and retry logic.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, UseQueryOptions, QueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/withRetry';
import { FEATURES } from '../utils/env';
import { telemetry } from '../utils/telemetry';

// Custom retry interface that's compatible with React Query
interface CustomRetryOptions {
  enabled: boolean;
  maxRetries?: number;
  baseDelay?: number;
}

export interface DataLoaderOptions<TData, TError> {
  // Whether to log errors to the console
  logErrors?: boolean;
  
  // Loading delay to prevent flashing for quick loads
  loadingDelay?: number;
  
  // Retry configuration
  retry?: CustomRetryOptions;
  
  // Fallback data to use if the query fails
  fallbackData?: TData;
  
  // Explicitly enable or disable fallback behavior (overrides env settings)
  fallbackEnabled?: boolean;
  
  // Pass through other React Query options
  queryOptions?: Omit<
    UseQueryOptions<TData, TError, TData, readonly string[]>,
    'queryKey' | 'queryFn'
  >;
}

export interface DataLoaderResult<TData, TError> {
  // Data and status
  data: TData | undefined;
  error: TError | null;
  
  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  
  // Additional status flags
  isUsingStaleData: boolean;
  isUsingFallbackData: boolean;
  
  // Functions
  refetch: () => Promise<any>;
  
  // Allow additional properties from React Query
  [key: string]: any;
}

/**
 * Generic data loader hook with standardized error handling and loading states
 * 
 * @param queryKey - React Query cache key
 * @param queryFn - Function to fetch the data
 * @param options - Additional options
 * @returns Query result with standardized helper methods
 */
export function useDataLoader<TData = unknown, TError = Error>(
  queryKey: readonly string[],
  queryFn: () => Promise<TData>,
  options: DataLoaderOptions<TData, TError> = {}
): DataLoaderResult<TData, TError> {
  // Extract and set default options
  const {
    logErrors = true,
    loadingDelay = 300,
    retry = { enabled: true, maxRetries: 3, baseDelay: 300 },
    fallbackData,
    fallbackEnabled = FEATURES.fallback.enabled,
    queryOptions = {}
  } = options;
  
  // State for delayed loading indicator
  const [showLoading, setShowLoading] = useState(false);
  
  // Set up loading delay to prevent flash for quick loads
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowLoading(true);
    }, loadingDelay);
    
    return () => clearTimeout(timeoutId);
  }, [loadingDelay]);
  
  // Get the timeout from environment or default
  const timeoutMs = FEATURES.fallback.timeout;
  
  // Determine if a custom timeout should be applied
  const shouldApplyTimeout = fallbackEnabled && timeoutMs > 0;
  
  // Wrap query function with retry logic and timeout if enabled
  const enhancedQueryFn = useCallback(async () => {
    let fetchPromise;
    
    // Apply retry logic if enabled
    if (retry.enabled) {
      fetchPromise = withRetry(queryFn, {
        maxRetries: retry.maxRetries || FEATURES.fallback.retryAttempts,
        baseDelay: retry.baseDelay,
        onRetry: (error, attempt) => {
          if (logErrors) {
            logger.warn(`Data fetch retry attempt ${attempt + 1}/${retry.maxRetries || FEATURES.fallback.retryAttempts}:`, error);
          }
          
          // Record retry event in telemetry
          telemetry.recordEvent('db.query.error', {
            queryKey: queryKey.join('/'),
            attempt,
            error: error instanceof Error ? error.message : String(error),
            retrying: true
          }, 'warning');
        }
      });
    } else {
      fetchPromise = queryFn();
    }
    
    // Apply timeout if enabled
    if (shouldApplyTimeout) {
      return Promise.race([
        fetchPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            const timeoutError = new Error(`Query timed out after ${timeoutMs}ms: ${queryKey.join('/')}`);
            reject(timeoutError);
            
            // Record timeout in telemetry
            if (fallbackEnabled) {
              telemetry.recordEvent('db.query.error', {
                queryKey: queryKey.join('/'),
                error: `Timeout after ${timeoutMs}ms`,
                timeout: true
              }, 'warning');
            }
          }, timeoutMs);
        })
      ]);
    }
    
    return fetchPromise;
  }, [queryFn, retry, logErrors, shouldApplyTimeout, timeoutMs, queryKey, fallbackEnabled]);
  
  // Convert our retry options to React Query format
  const reactQueryRetry = retry.enabled 
    ? (failureCount: number, error: TError) => {
        const maxRetries = retry.maxRetries || FEATURES.fallback.retryAttempts;
        return failureCount < maxRetries;
      }
    : false;
  
  // Use React Query with standardized options
  const query = useQuery<TData, TError, TData, readonly string[]>({
    queryKey,
    queryFn: enhancedQueryFn,
    retry: reactQueryRetry,
    ...queryOptions,
  });
  
  // Handle errors with consistent logging
  useEffect(() => {
    if (query.error && logErrors) {
      logger.error(`Data loading error for ${queryKey.join('/')}:`, query.error);
      
      // Record error in telemetry if it's the final error (after retries)
      if (fallbackEnabled) {
        telemetry.recordEvent('db.query.error', {
          queryKey: queryKey.join('/'),
          error: query.error instanceof Error ? query.error.message : String(query.error),
          finalFailure: true
        }, 'error');
      }
    }
  }, [query.error, queryKey, logErrors, fallbackEnabled]);
  
  // Determine if fallback data should be used
  const shouldUseFallback = fallbackEnabled && query.isError && fallbackData !== undefined;
  
  // Use fallback data if provided, enabled, and query failed
  const data = query.isSuccess 
    ? query.data 
    : (shouldUseFallback ? fallbackData : undefined);
  
  // Determine if we should show the loading indicator
  const isLoading = query.isLoading && showLoading;
  
  // Determine if using stale or fallback data
  const isUsingStaleData = query.isSuccess && query.isFetching;
  const isUsingFallbackData = shouldUseFallback;
  
  return {
    ...query,
    data,
    isLoading,
    isUsingStaleData,
    isUsingFallbackData,
  };
}

/**
 * Create a specialized data loader for a specific entity type
 */
export function createEntityLoader<TEntity, TError = Error>(
  baseQueryKey: string,
  fetchFunction: (id: string | number) => Promise<TEntity>
) {
  return (entityId: string | number, options?: DataLoaderOptions<TEntity, TError>) => {
    return useDataLoader<TEntity, TError>(
      [baseQueryKey, entityId.toString()] as const,
      () => fetchFunction(entityId),
      options
    );
  };
}

export default useDataLoader; 