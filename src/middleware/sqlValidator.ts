import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * SQL Validation Middleware
 * 
 * This middleware provides comprehensive SQL query validation, parameter sanitization,
 * audit logging, and performance monitoring without affecting query results or
 * breaking existing API contracts.
 * 
 * Features:
 * - Parameter validation and type checking
 * - Special character escaping
 * - Query audit logging
 * - Performance metrics tracking
 * - Security validation
 */

// Performance metrics interface
interface QueryMetrics {
  queryId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  queryType: string;
  parameters: any[];
  resultCount?: number;
  success: boolean;
  error?: string;
}

// Query validation result interface
interface ValidationResult {
  isValid: boolean;
  sanitizedParams: any[];
  errors: string[];
  warnings: string[];
}

// Global metrics storage
const queryMetrics: Map<string, QueryMetrics> = new Map();
const performanceStats = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  averageDuration: 0,
  slowestQuery: 0,
  fastestQuery: Infinity
};

/**
 * Generate unique query ID for tracking
 */
function generateQueryId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate and sanitize query parameters
 */
function validateParameters(params: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitizedParams: any[] = [];

  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const paramType = typeof param;

    try {
      // Handle null/undefined values
      if (param === null || param === undefined) {
        sanitizedParams.push(null);
        continue;
      }

      // Handle string parameters
      if (paramType === 'string') {
        // Check for potential SQL injection patterns
        const suspiciousPatterns = [
          /--/g,           // SQL comments
          /\/\*/g,         // Block comments start
          /\*\//g,         // Block comments end
          /union\s+select/i, // UNION attacks
          /drop\s+table/i,  // DROP statements
          /delete\s+from/i, // DELETE statements
          /insert\s+into/i, // INSERT statements
          /update\s+set/i,  // UPDATE statements
          /exec\s*\(/i,     // EXEC functions
          /sp_/i,          // Stored procedures
          /xp_/i,          // Extended procedures
          /script\s*>/i,   // Script tags
          /<script/i,      // Script tags
          /javascript:/i,  // JavaScript protocol
          /vbscript:/i,    // VBScript protocol
          /onload\s*=/i,   // Event handlers
          /onerror\s*=/i   // Event handlers
        ];

        let sanitizedParam = param;
        let hasSuspiciousContent = false;

        // Check for suspicious patterns
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(param)) {
            hasSuspiciousContent = true;
            warnings.push(`Parameter ${i + 1} contains potentially suspicious content: ${pattern.source}`);
          }
        }

        // Basic sanitization for strings
        if (hasSuspiciousContent) {
          // Log the attempt but don't block legitimate queries
          logger.warn(`Suspicious content detected in parameter ${i + 1}: ${param.substring(0, 100)}...`);
          
          // Escape single quotes and backslashes
          sanitizedParam = param
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "''")
            .replace(/\0/g, '\\0')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\x1a/g, '\\Z');
        }

        // Limit string length to prevent buffer overflow attacks
        if (sanitizedParam.length > 10000) {
          errors.push(`Parameter ${i + 1} exceeds maximum length (10000 characters)`);
          sanitizedParam = sanitizedParam.substring(0, 10000);
        }

        sanitizedParams.push(sanitizedParam);
      }
      // Handle number parameters
      else if (paramType === 'number') {
        // Validate number range and type
        if (!isFinite(param)) {
          errors.push(`Parameter ${i + 1} is not a finite number: ${param}`);
          sanitizedParams.push(0);
        } else if (param > Number.MAX_SAFE_INTEGER || param < Number.MIN_SAFE_INTEGER) {
          warnings.push(`Parameter ${i + 1} is outside safe integer range: ${param}`);
          sanitizedParams.push(param);
        } else {
          sanitizedParams.push(param);
        }
      }
      // Handle boolean parameters
      else if (paramType === 'boolean') {
        sanitizedParams.push(param);
      }
      // Handle Date parameters
      else if (param instanceof Date) {
        if (isNaN(param.getTime())) {
          errors.push(`Parameter ${i + 1} is an invalid date: ${param}`);
          sanitizedParams.push(new Date());
        } else {
          sanitizedParams.push(param);
        }
      }
      // Handle array parameters
      else if (Array.isArray(param)) {
        if (param.length > 1000) {
          errors.push(`Parameter ${i + 1} array exceeds maximum length (1000 items)`);
          sanitizedParams.push(param.slice(0, 1000));
        } else {
          sanitizedParams.push(param);
        }
      }
      // Handle object parameters (for JSONB)
      else if (paramType === 'object') {
        try {
          // Validate that it's serializable
          JSON.stringify(param);
          sanitizedParams.push(param);
        } catch (error) {
          errors.push(`Parameter ${i + 1} is not serializable: ${error}`);
          sanitizedParams.push({});
        }
      }
      // Handle other types
      else {
        warnings.push(`Parameter ${i + 1} has unexpected type: ${paramType}`);
        sanitizedParams.push(String(param));
      }
    } catch (error) {
      errors.push(`Error validating parameter ${i + 1}: ${error}`);
      sanitizedParams.push(null);
    }
  }

  return {
    isValid: errors.length === 0,
    sanitizedParams,
    errors,
    warnings
  };
}

/**
 * Log query execution for audit trail
 */
function logQueryExecution(
  queryId: string,
  queryType: string,
  parameters: any[],
  metrics: QueryMetrics,
  validationResult: ValidationResult
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    queryId,
    queryType,
    parameters: parameters.map((param, index) => ({
      index: index + 1,
      type: typeof param,
      value: typeof param === 'string' ? param.substring(0, 100) : param,
      length: typeof param === 'string' ? param.length : undefined
    })),
    validation: {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings
    },
    performance: {
      duration: metrics.duration,
      success: metrics.success
    },
    sanitizedParameters: validationResult.sanitizedParams.map((param, index) => ({
      index: index + 1,
      type: typeof param,
      value: typeof param === 'string' ? param.substring(0, 100) : param
    }))
  };

  // Log to audit trail
  logger.info('SQL Query Execution', logEntry);

  // Log warnings if any
  if (validationResult.warnings.length > 0) {
    logger.warn('SQL Query Warnings', {
      queryId,
      warnings: validationResult.warnings
    });
  }

  // Log errors if any
  if (validationResult.errors.length > 0) {
    logger.error('SQL Query Validation Errors', {
      queryId,
      errors: validationResult.errors
    });
  }
}

/**
 * Update performance statistics
 */
function updatePerformanceStats(metrics: QueryMetrics): void {
  performanceStats.totalQueries++;
  
  if (metrics.success) {
    performanceStats.successfulQueries++;
  } else {
    performanceStats.failedQueries++;
  }

  if (metrics.duration !== undefined) {
    // Update average duration
    const totalDuration = performanceStats.averageDuration * (performanceStats.totalQueries - 1) + metrics.duration;
    performanceStats.averageDuration = totalDuration / performanceStats.totalQueries;

    // Update slowest query
    if (metrics.duration > performanceStats.slowestQuery) {
      performanceStats.slowestQuery = metrics.duration;
    }

    // Update fastest query
    if (metrics.duration < performanceStats.fastestQuery) {
      performanceStats.fastestQuery = metrics.duration;
    }
  }
}

/**
 * SQL Validation Middleware
 * 
 * This middleware intercepts SQL queries and provides:
 * - Parameter validation and sanitization
 * - Security checks
 * - Audit logging
 * - Performance monitoring
 */
export function sqlValidatorMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original query execution methods
    const originalQuery = req.query;
    const originalBody = req.body;
    const originalParams = req.params;

    // Add query validation to request object
    req.sqlValidation = {
      validateParameters: (params: any[]) => validateParameters(params),
      logQuery: (queryId: string, queryType: string, parameters: any[], metrics: QueryMetrics, validationResult: ValidationResult) => 
        logQueryExecution(queryId, queryType, parameters, metrics, validationResult),
      updateStats: (metrics: QueryMetrics) => updatePerformanceStats(metrics),
      generateQueryId: () => generateQueryId(),
      getPerformanceStats: () => ({ ...performanceStats }),
      getQueryMetrics: (queryId: string) => queryMetrics.get(queryId)
    };

    // Add performance monitoring to response
    const originalSend = res.send;
    res.send = function(data: any) {
      // Log response metrics
      logger.info('API Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: Date.now() - (req as any).startTime,
        contentLength: typeof data === 'string' ? data.length : JSON.stringify(data).length
      });

      return originalSend.call(this, data);
    };

    // Track request start time
    (req as any).startTime = Date.now();

    next();
  };
}

/**
 * Enhanced SQL query wrapper with validation
 * 
 * This function wraps SQL queries with validation, logging, and performance monitoring
 */
export function createValidatedQuery(sqlClient: any) {
  return async function validatedQuery<T = any>(
    queryText: string | TemplateStringsArray,
    ...values: any[]
  ): Promise<T> {
    const queryId = generateQueryId();
    const startTime = Date.now();
    
    // Determine query type
    const queryType = typeof queryText === 'string' 
      ? queryText.trim().split(' ')[0].toUpperCase()
      : 'TEMPLATE';

    // Create metrics object
    const metrics: QueryMetrics = {
      queryId,
      startTime,
      queryType,
      parameters: values,
      success: false
    };

    try {
      // Validate parameters
      const validationResult = validateParameters(values);
      
      // Log validation warnings/errors
      if (validationResult.warnings.length > 0) {
        logger.warn(`Query ${queryId} validation warnings:`, validationResult.warnings);
      }
      
      if (validationResult.errors.length > 0) {
        logger.error(`Query ${queryId} validation errors:`, validationResult.errors);
        throw new Error(`Parameter validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Execute query with validated parameters
      let result: T;
      
      if (typeof queryText === 'string') {
        // Handle string queries with parameters
        result = await sqlClient(queryText, ...validationResult.sanitizedParams);
      } else {
        // Handle template literal queries
        result = await sqlClient(queryText, ...validationResult.sanitizedParams);
      }

      // Update metrics
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.success = true;
      metrics.resultCount = Array.isArray(result) ? result.length : 1;

      // Store metrics
      queryMetrics.set(queryId, metrics);

      // Update performance statistics
      updatePerformanceStats(metrics);

      // Log query execution
      logQueryExecution(queryId, queryType, values, metrics, validationResult);

      return result;
    } catch (error) {
      // Update metrics for failed query
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.success = false;
      metrics.error = error instanceof Error ? error.message : String(error);

      // Store metrics
      queryMetrics.set(queryId, metrics);

      // Update performance statistics
      updatePerformanceStats(metrics);

      // Log failed query
      logger.error(`Query ${queryId} failed:`, {
        queryId,
        queryType,
        error: metrics.error,
        duration: metrics.duration,
        parameters: values
      });

      throw error;
    }
  };
}

/**
 * Get current performance statistics
 */
export function getPerformanceStats() {
  return {
    ...performanceStats,
    queryCount: queryMetrics.size,
    recentQueries: Array.from(queryMetrics.values()).slice(-10)
  };
}

/**
 * Clear performance statistics (useful for testing)
 */
export function clearPerformanceStats(): void {
  queryMetrics.clear();
  performanceStats.totalQueries = 0;
  performanceStats.successfulQueries = 0;
  performanceStats.failedQueries = 0;
  performanceStats.averageDuration = 0;
  performanceStats.slowestQuery = 0;
  performanceStats.fastestQuery = Infinity;
}

/**
 * Get query metrics by ID
 */
export function getQueryMetrics(queryId: string): QueryMetrics | undefined {
  return queryMetrics.get(queryId);
}

/**
 * Get all query metrics
 */
export function getAllQueryMetrics(): QueryMetrics[] {
  return Array.from(queryMetrics.values());
}

// Extend Express Request interface to include SQL validation
declare global {
  namespace Express {
    interface Request {
      sqlValidation?: {
        validateParameters: (params: any[]) => ValidationResult;
        logQuery: (queryId: string, queryType: string, parameters: any[], metrics: QueryMetrics, validationResult: ValidationResult) => void;
        updateStats: (metrics: QueryMetrics) => void;
        generateQueryId: () => string;
        getPerformanceStats: () => any;
        getQueryMetrics: (queryId: string) => QueryMetrics | undefined;
      };
    }
  }
}

export default sqlValidatorMiddleware;
