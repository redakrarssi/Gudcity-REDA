/**
 * Centralized database connector utility that provides standardized access patterns
 * for all database operations. This helps maintain consistent error handling,
 * logging, and performance optimization throughout the application.
 */

import sql from './db';
import { withRetry } from './withRetry';
import { withCache } from './cache';
import { batchDatabaseQueries } from './batchQueries';
import { SqlRow } from './db';
import { invalidateCache, invalidateCacheByTag } from './cache';
import { telemetry } from './telemetry';
import { log as logger } from './logger';
import env, { FEATURES } from './env';
import { getConnectionState, ConnectionState } from './db';
import mockData from './mockData';

// Standard options for database operations
export interface DatabaseOptions {
  // Cache related options
  cache?: {
    enabled?: boolean;
    ttl?: number; // Time to live in milliseconds
    tags?: string[]; // Tags for cache invalidation
    key?: string; // Custom cache key (generated from query if not provided)
  };
  
  // Retry related options
  retry?: {
    enabled?: boolean;
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
  
  // Logging related options
  logging?: {
    enabled?: boolean;
    logQuery?: boolean;
    logParams?: boolean;
    logResult?: boolean;
    logErrors?: boolean;
  };
  
  // Telemetry options
  telemetry?: {
    enabled?: boolean;
    recordMetrics?: boolean;
    recordEvents?: boolean;
    queryName?: string; // Identifier for the query in telemetry
  };
  
  // Fallback options
  fallback?: {
    enabled?: boolean;
    mockData?: any;
    mockDataKey?: string; // Key to lookup in the mockData store
  };
}

// Default options
const defaultOptions: DatabaseOptions = {
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
  },
  retry: {
    enabled: true,
    maxRetries: 3,
    baseDelay: 300,
    maxDelay: 10000,
  },
  logging: {
    enabled: process.env.NODE_ENV !== 'production',
    logQuery: process.env.NODE_ENV === 'development',
    logParams: process.env.NODE_ENV === 'development',
    logResult: false,
    logErrors: true,
  },
  telemetry: {
    enabled: true,
    recordMetrics: true,
    recordEvents: true,
  },
  fallback: {
    enabled: FEATURES.fallback.enabled,
    mockData: null
  }
};

/**
 * Check if we should use mock data
 */
function shouldUseMockData(): boolean {
  // Always use mock data if explicitly enabled
  if (env.MOCK_DATA) return true;
  
  // Use mock data if fallback is enabled and connection is not available
  if (FEATURES.fallback.enabled && FEATURES.fallback.useMockData) {
    const connectionState = getConnectionState();
    return connectionState !== ConnectionState.CONNECTED;
  }
  
  return false;
}

/**
 * Get mock data for a query if available
 */
function getMockDataForQuery(query: string, params: any[], mockDataKey?: string): any[] | null {
  // If mock data key is provided, try to use it first
  if (mockDataKey && mockData[mockDataKey]) {
    return mockData[mockDataKey];
  }
  
  // Otherwise try to infer from the query
  // Extract table name from the query using simple regex
  const tableMatch = query.match(/FROM\s+([a-zA-Z0-9_]+)/i);
  if (tableMatch && tableMatch[1]) {
    const tableName = tableMatch[1].toLowerCase();
    if (mockData[tableName]) {
      return mockData[tableName];
    }
  }
  
  // If we can't determine the table, return null
  return null;
}

/**
 * Execute a database query with standardized error handling, caching, and retries
 * 
 * @param query SQL query string or template
 * @param params Query parameters
 * @param options Operation options
 * @returns Query result
 */
export async function executeQuery<T extends SqlRow[] = SqlRow[]>(
  query: string | TemplateStringsArray,
  params: any[] = [],
  options: DatabaseOptions = {}
): Promise<T> {
  // Merge with default options
  const mergedOptions = mergeWithDefaults(options);
  
  // Generate cache key if needed
  const cacheKey = mergedOptions.cache?.key || 
    (typeof query === 'string' 
      ? `query:${query}:${JSON.stringify(params)}`
      : `query:${query.join('?')}:${JSON.stringify(params)}`);
  
  // Extract query name for telemetry
  const queryName = mergedOptions.telemetry?.queryName || 
    (typeof query === 'string' 
      ? query.split(' ')[0] // Use first word of query (e.g., SELECT, INSERT)
      : 'query');
  
  // Record query count metric
  if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordMetrics) {
    telemetry.recordMetric('db.query.count', 1, { query: queryName });
  }
  
  // Check if we should use mock data
  const useMockData = mergedOptions.fallback?.enabled && shouldUseMockData();
  
  // If using mock data, return mock data immediately
  if (useMockData) {
    const queryStr = typeof query === 'string' ? query : query.join('?');
    const mockResult = getMockDataForQuery(
      queryStr, 
      params, 
      mergedOptions.fallback?.mockDataKey
    );
    
    if (mockResult) {
      logger.info(`Using mock data for query: ${queryStr.substring(0, 100)}...`);
      
      // Record telemetry for mock data usage
      if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordMetrics) {
        telemetry.recordMetric('db.query.duration', 0, {
          query: queryName,
          mock: 'true'
        });
      }
      
      return mockResult as T;
    }
    
    // If mock data not found, log and continue to real query
    logger.warn(`No mock data found for query: ${queryStr.substring(0, 100)}...`);
  }
  
  // Function to execute the actual query
  const executeDbQuery = async (): Promise<T> => {
    const startTime = performance.now();
    try {
      let result: T;
      
      if (typeof query === 'string') {
        // SECURITY: Avoid dynamic code generation; use parameterized query API
        result = await (sql as any).query(query, params) as T;
      } else {
        // For template literals, use tagged template syntax as is
        result = await sql(query, ...params) as T;
      }
      
      // Record successful query duration
      const duration = performance.now() - startTime;
      if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordMetrics) {
        telemetry.recordMetric('db.query.duration', duration, {
          query: queryName,
          success: 'true',
          paramCount: params.length.toString()
        });
      }
      
      return result;
    } catch (error) {
      // Record failed query and its duration
      const duration = performance.now() - startTime;
      
      if (mergedOptions.telemetry?.enabled) {
        if (mergedOptions.telemetry?.recordMetrics) {
          telemetry.recordMetric('db.query.failed', 1, {
            query: queryName,
            error: error instanceof Error ? error.name : 'Unknown'
          });
          
          telemetry.recordMetric('db.query.duration', duration, {
            query: queryName,
            success: 'false',
            paramCount: params.length.toString()
          });
        }
        
        if (mergedOptions.telemetry?.recordEvents) {
          // Determine error severity
          const severity = isConnectionError(error) ? 'critical' : 'error';
          
          telemetry.recordEvent('db.query.error', {
            query: queryName,
            params: mergedOptions.logging?.logParams ? params : undefined,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration
          }, severity);
        }
      }
      
      // Log error if enabled
      if (mergedOptions.logging?.enabled && mergedOptions.logging?.logErrors) {
        logger.error('Database query error:', error);
        
        if (mergedOptions.logging?.logQuery) {
          logger.error('Query:', query);
        }
        
        if (mergedOptions.logging?.logParams) {
          logger.error('Params:', params);
        }
      }
      
      throw error;
    }
  };
  
  // Apply caching if enabled
  if (mergedOptions.cache?.enabled) {
    return withCache(
      // Apply retry if enabled
      mergedOptions.retry?.enabled
        ? () => withRetry(executeDbQuery, {
            maxRetries: mergedOptions.retry?.maxRetries,
            baseDelay: mergedOptions.retry?.baseDelay,
            maxDelay: mergedOptions.retry?.maxDelay,
            onRetry: (error, attempt) => {
              // Record retry event
              if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordEvents) {
                telemetry.recordEvent('db.query.error', {
                  query: queryName,
                  attempt,
                  error: error instanceof Error ? error.message : String(error),
                  retrying: true
                }, 'warning');
              }
            }
          })
        : executeDbQuery,
      cacheKey,
      {
        ttl: mergedOptions.cache.ttl,
        tags: mergedOptions.cache.tags,
      }
    );
  }
  
  // Apply retry without caching if enabled
  if (mergedOptions.retry?.enabled) {
    return withRetry(executeDbQuery, {
      maxRetries: mergedOptions.retry.maxRetries,
      baseDelay: mergedOptions.retry.baseDelay,
      maxDelay: mergedOptions.retry.maxDelay,
      onRetry: (error, attempt) => {
        // Record retry event
        if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordEvents) {
          telemetry.recordEvent('db.query.error', {
            query: queryName,
            attempt,
            error: error instanceof Error ? error.message : String(error),
            retrying: true
          }, 'warning');
        }
      }
    });
  }
  
  // Execute directly if neither caching nor retry is enabled
  return executeDbQuery();
}

/**
 * Execute multiple database queries in a batch to reduce connection overhead
 * 
 * @param queries Array of queries with IDs
 * @param options Operation options
 * @returns Query results mapped by ID
 */
export async function executeBatch<T = any>(
  queries: Array<{
    id: string;
    query: string;
    params?: any[];
    transform?: (result: any) => T;
  }>,
  options: DatabaseOptions = {}
): Promise<Record<string, { id: string; data: T; error?: Error }>> {
  // Merge with default options
  const mergedOptions = mergeWithDefaults(options);
  
  // Generate cache key
  const cacheKey = mergedOptions.cache?.key || 
    `batch:${queries.map(q => q.id).join(',')}`;
  
  // Record batch query metric
  if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordMetrics) {
    telemetry.recordMetric('db.query.count', queries.length, { 
      type: 'batch',
      batchSize: String(queries.length)
    });
  }
  
  // Function to execute the batch query
  const executeBatchQuery = async () => {
    const startTime = performance.now();
    try {
      const result = await batchDatabaseQueries<T>(queries);
      
      // Record successful batch duration
      const duration = performance.now() - startTime;
      if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordMetrics) {
        telemetry.recordMetric('db.query.duration', duration, {
          query: 'batch',
          success: 'true',
          batchSize: String(queries.length)
        });
      }
      
      return result;
    } catch (error) {
      // Record failed batch and its duration
      const duration = performance.now() - startTime;
      
      if (mergedOptions.telemetry?.enabled) {
        if (mergedOptions.telemetry?.recordMetrics) {
          telemetry.recordMetric('db.query.failed', 1, {
            query: 'batch',
            batchSize: String(queries.length),
            error: error instanceof Error ? error.name : 'Unknown'
          });
          
          telemetry.recordMetric('db.query.duration', duration, {
            query: 'batch',
            success: 'false',
            batchSize: String(queries.length)
          });
        }
        
        if (mergedOptions.telemetry?.recordEvents) {
          // Determine error severity
          const severity = isConnectionError(error) ? 'critical' : 'error';
          
          telemetry.recordEvent('db.query.error', {
            query: 'batch',
            batchSize: String(queries.length),
            queryIds: queries.map(q => q.id),
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            duration
          }, severity);
        }
      }
      
      throw error;
    }
  };
  
  // Apply caching if enabled
  if (mergedOptions.cache?.enabled) {
    return withCache(
      // Apply retry if enabled
      mergedOptions.retry?.enabled
        ? () => withRetry(executeBatchQuery, {
            maxRetries: mergedOptions.retry?.maxRetries,
            baseDelay: mergedOptions.retry?.baseDelay,
            maxDelay: mergedOptions.retry?.maxDelay,
            onRetry: (error, attempt) => {
              // Record retry event
              if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordEvents) {
                telemetry.recordEvent('db.query.error', {
                  query: 'batch',
                  batchSize: String(queries.length),
                  attempt,
                  error: error instanceof Error ? error.message : String(error),
                  retrying: true
                }, 'warning');
              }
            }
          })
        : executeBatchQuery,
      cacheKey,
      {
        ttl: mergedOptions.cache.ttl,
        tags: mergedOptions.cache.tags,
      }
    );
  }
  
  // Apply retry without caching if enabled
  if (mergedOptions.retry?.enabled) {
    return withRetry(executeBatchQuery, {
      maxRetries: mergedOptions.retry.maxRetries,
      baseDelay: mergedOptions.retry.baseDelay,
      maxDelay: mergedOptions.retry.maxDelay,
      onRetry: (error, attempt) => {
        // Record retry event
        if (mergedOptions.telemetry?.enabled && mergedOptions.telemetry?.recordEvents) {
          telemetry.recordEvent('db.query.error', {
            query: 'batch',
            batchSize: String(queries.length),
            attempt,
            error: error instanceof Error ? error.message : String(error),
            retrying: true
          }, 'warning');
        }
      }
    });
  }
  
  // Execute directly if neither caching nor retry is enabled
  return executeBatchQuery();
}

/**
 * Check if an error is likely a connection error
 */
function isConnectionError(error: any): boolean {
  if (!error) return false;
  
  const errorString = error.toString().toLowerCase();
  const connectionErrorKeywords = [
    'connection',
    'network',
    'timeout',
    'socket',
    'closed',
    'econnrefused',
    'econnreset',
    'unable to connect',
    'connection refused'
  ];
  
  return connectionErrorKeywords.some(keyword => errorString.includes(keyword));
}

/**
 * Merge provided options with defaults, ensuring required properties exist
 */
function mergeWithDefaults(options: DatabaseOptions): Required<DatabaseOptions> {
  return {
    cache: {
      enabled: options.cache?.enabled ?? defaultOptions.cache?.enabled ?? true,
      ttl: options.cache?.ttl ?? defaultOptions.cache?.ttl,
      tags: options.cache?.tags ?? defaultOptions.cache?.tags,
      key: options.cache?.key ?? defaultOptions.cache?.key,
    },
    retry: {
      enabled: options.retry?.enabled ?? defaultOptions.retry?.enabled ?? true,
      maxRetries: options.retry?.maxRetries ?? defaultOptions.retry?.maxRetries,
      baseDelay: options.retry?.baseDelay ?? defaultOptions.retry?.baseDelay,
      maxDelay: options.retry?.maxDelay ?? defaultOptions.retry?.maxDelay,
    },
    logging: {
      enabled: options.logging?.enabled ?? defaultOptions.logging?.enabled ?? false,
      logQuery: options.logging?.logQuery ?? defaultOptions.logging?.logQuery,
      logParams: options.logging?.logParams ?? defaultOptions.logging?.logParams,
      logResult: options.logging?.logResult ?? defaultOptions.logging?.logResult,
      logErrors: options.logging?.logErrors ?? defaultOptions.logging?.logErrors,
    },
    telemetry: {
      enabled: options.telemetry?.enabled ?? defaultOptions.telemetry?.enabled ?? true,
      recordMetrics: options.telemetry?.recordMetrics ?? defaultOptions.telemetry?.recordMetrics ?? true,
      recordEvents: options.telemetry?.recordEvents ?? defaultOptions.telemetry?.recordEvents ?? true,
      queryName: options.telemetry?.queryName,
    }
  } as Required<DatabaseOptions>;
}

/**
 * Invalidate cache for a specific query
 * 
 * @param key Cache key to invalidate
 */
export function invalidateQueryCache(key: string): void {
  invalidateCache(key);
}

/**
 * Invalidate cache for queries with a specific tag
 * 
 * @param tag Cache tag to invalidate
 */
export function invalidateQueryCacheByTag(tag: string): void {
  invalidateCacheByTag(tag);
}

/**
 * Get current database connection status
 */
export function getDatabaseStatus(): {
  status: string;
  lastStatusChange: number;
  metrics: {
    queryCount: number;
    avgQueryTime: number;
    errorRate: number;
    slowQueryCount: number;
  }
} {
  const { status, timestamp } = telemetry.getConnectionStatus();
  
  // Calculate key metrics for the last minute
  const lastMinute = 60 * 1000;
  const queryMetrics = telemetry.getAggregatedMetrics('db.query.duration', lastMinute);
  const failedMetrics = telemetry.getAggregatedMetrics('db.query.failed', lastMinute);
  const slowQueryMetrics = telemetry.getAggregatedMetrics('db.slow_query', lastMinute);
  
  // Calculate error rate
  const errorRate = queryMetrics.count > 0 
    ? failedMetrics.count / queryMetrics.count 
    : 0;
  
  return {
    status,
    lastStatusChange: timestamp,
    metrics: {
      queryCount: queryMetrics.count,
      avgQueryTime: queryMetrics.avg,
      errorRate,
      slowQueryCount: slowQueryMetrics.count
    }
  };
}

// Export a default object for easy imports
export default {
  executeQuery,
  executeBatch,
  invalidateQueryCache,
  invalidateQueryCacheByTag,
  getDatabaseStatus
}; 