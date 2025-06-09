import { neon, neonConfig } from '@neondatabase/serverless';
import env, { validateEnv } from './env';
import { queryCache } from './queryCache';
import { EventEmitter } from 'events';
import telemetry from './telemetry';
import logger from './logger';

// Define row type for easier use in the application
export interface SqlRow {
  [key: string]: string | number | boolean | Date | null | undefined | object | any[];
}

// Connection states
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting'
}

// Configure Neon
neonConfig.fetchConnectionCache = true;

// Check if database URL is available
const hasDbUrl = !!env.DATABASE_URL;

// Connection manager to handle reconnection logic
class DbConnectionManager extends EventEmitter {
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectInterval: number = 5000; // Start with 5 seconds
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private healthCheckIntervalId: NodeJS.Timeout | null = null;
  private lastError: Error | null = null;
  private neonInstance: any = null;
  private connectionMetrics = {
    totalQueries: 0,
    failedQueries: 0,
    lastQueryTime: 0,
    connectedSince: 0,
    healthCheckLatency: 0
  };

  constructor() {
    super();
    if (hasDbUrl) {
      this.initConnection();
    } else {
      logger.warn('No DATABASE_URL environment variable found, connection manager disabled');
      telemetry.recordEvent('db.connection.lost', {
        reason: 'No DATABASE_URL environment variable found'
      }, 'warning');
      this.connectionState = ConnectionState.DISCONNECTED;
    }
  }

  private initConnection(): void {
    try {
      this.connectionState = ConnectionState.CONNECTING;
      logger.info('Initializing database connection...');
      this.neonInstance = neon(env.DATABASE_URL);
      
      // Record connection attempt
      telemetry.recordMetric('db.connection.attempt', 1);
      
      // Verify the connection works
      this.verifyAndUpdateState();
      
      // Start health checks
      this.startHealthChecks();
    } catch (error) {
      this.lastError = error as Error;
      logger.error('Failed to initialize database connection:', error);
      
      // Record connection failure
      telemetry.recordMetric('db.connection.failed', 1, {
        error: error instanceof Error ? error.name : 'Unknown'
      });
      telemetry.recordEvent('db.connection.lost', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 'critical');
      
      this.connectionState = ConnectionState.DISCONNECTED;
      this.scheduleReconnect();
    }
  }

  private async verifyAndUpdateState(): Promise<void> {
    try {
      // Test the connection
      const startTime = performance.now();
      const connected = await this.testConnection();
      const duration = performance.now() - startTime;
      
      // Record health check latency
      this.connectionMetrics.healthCheckLatency = duration;
      telemetry.recordMetric('db.connection.latency', duration);
      
      if (connected) {
        if (this.connectionState !== ConnectionState.CONNECTED) {
          logger.info('Database connection established successfully');
          this.connectionState = ConnectionState.CONNECTED;
          this.connectionMetrics.connectedSince = Date.now();
          this.reconnectAttempts = 0;
          
          // Record connection success
          telemetry.recordMetric('db.connection.success', 1);
          telemetry.recordEvent('db.connection.reconnected', {
            attempts: this.reconnectAttempts,
            latency: duration
          }, 'info');
          
          this.emit('connected');
        }
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      this.lastError = error as Error;
      logger.error('Database connection verification failed:', error);
      
      // Record connection failure
      telemetry.recordMetric('db.connection.failed', 1, {
        error: error instanceof Error ? error.name : 'Unknown',
        state: 'verification'
      });
      telemetry.recordEvent('db.connection.lost', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        phase: 'verification'
      }, 'error');
      
      this.connectionState = ConnectionState.DISCONNECTED;
      this.emit('disconnected', error);
      this.scheduleReconnect();
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.neonInstance) return false;
    
    try {
      const startTime = performance.now();
      const result = await this.neonInstance`SELECT 1 as connected`;
      const duration = performance.now() - startTime;
      
      // Record successful ping time
      telemetry.recordMetric('db.query.duration', duration, {
        query: 'ping',
        type: 'health_check'
      });
      
      return result && result.length > 0 && result[0].connected === 1;
    } catch (error) {
      logger.error('Connection test failed:', error);
      
      // Record health check failure
      telemetry.recordMetric('db.query.failed', 1, {
        query: 'ping',
        type: 'health_check',
        error: error instanceof Error ? error.name : 'Unknown'
      });
      
      return false;
    }
  }

  private startHealthChecks(interval: number = 30000): void {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
    }

    this.healthCheckIntervalId = setInterval(async () => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        try {
          const startTime = performance.now();
          const connected = await this.testConnection();
          const duration = performance.now() - startTime;
          
          // Update health check latency metric
          this.connectionMetrics.healthCheckLatency = duration;
          telemetry.recordMetric('db.connection.latency', duration);
          
          if (!connected) {
            logger.warn('Health check failed, connection lost');
            
            // Record health check failure
            telemetry.recordEvent('db.connection.lost', {
              reason: 'Health check failed',
              latency: duration
            }, 'warning');
            
            this.connectionState = ConnectionState.DISCONNECTED;
            this.emit('disconnected', new Error('Health check failed'));
            this.scheduleReconnect();
          }
        } catch (error) {
          logger.error('Error during health check:', error);
          
          // Record health check error
          telemetry.recordEvent('db.connection.lost', {
            reason: 'Health check error',
            error: error instanceof Error ? error.message : String(error)
          }, 'error');
          
          this.connectionState = ConnectionState.DISCONNECTED;
          this.emit('disconnected', error);
          this.scheduleReconnect();
        }
      }
    }, interval);
  }

  private scheduleReconnect(): void {
    if (this.connectionState === ConnectionState.RECONNECTING) {
      return;
    }

    this.connectionState = ConnectionState.RECONNECTING;
    
    // Calculate exponential backoff with jitter
    const baseDelay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      60000 // Maximum delay of 60 seconds
    );
    const delay = baseDelay + (Math.random() * 1000);
    
    logger.info(`Database reconnection attempt ${this.reconnectAttempts + 1} scheduled in ${Math.round(delay/1000)}s`);
    
    // Record reconnection scheduling
    telemetry.recordEvent('db.connection.reconnecting', {
      attempt: this.reconnectAttempts + 1,
      delay: Math.round(delay),
      maxAttempts: this.maxReconnectAttempts
    }, 'warning');
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      
      // If we've exceeded max attempts, give up
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        logger.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached`);
        
        // Record circuit breaker open
        telemetry.recordEvent('db.connection.degraded', {
          reason: 'Maximum reconnection attempts reached',
          attempts: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts
        }, 'critical');
        
        this.connectionState = ConnectionState.DISCONNECTED;
        this.emit('reconnectionFailed');
        return;
      }
      
      // Try reconnecting
      try {
        logger.info(`Attempting reconnection #${this.reconnectAttempts}`);
        
        // Record reconnection attempt
        telemetry.recordMetric('db.connection.attempt', 1, {
          attempt: String(this.reconnectAttempts),
          state: 'reconnecting'
        });
        
        this.initConnection();
      } catch (error) {
        logger.error('Reconnection attempt failed:', error);
        
        // Record reconnection failure
        telemetry.recordMetric('db.connection.failed', 1, {
          attempt: String(this.reconnectAttempts),
          error: error instanceof Error ? error.name : 'Unknown'
        });
        
        this.scheduleReconnect();
      }
    }, delay);
  }

  public getState(): ConnectionState {
    return this.connectionState;
  }

  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  public getLastError(): Error | null {
    return this.lastError;
  }
  
  public getInstance(): any {
    return this.neonInstance;
  }
  
  public forceReconnect(): void {
    logger.info('Forcing database reconnection');
    
    // Record forced reconnection
    telemetry.recordEvent('db.connection.reconnecting', {
      reason: 'Manual reconnection requested',
      forced: true
    }, 'info');
    
    this.reconnectAttempts = 0;
    this.scheduleReconnect();
  }
  
  public getMetrics(): typeof this.connectionMetrics {
    return { ...this.connectionMetrics };
  }
  
  public trackQuery(success: boolean, duration: number): void {
    this.connectionMetrics.totalQueries++;
    if (!success) this.connectionMetrics.failedQueries++;
    this.connectionMetrics.lastQueryTime = duration;
  }
}

// Singleton instance
const connectionManager = new DbConnectionManager();

// Enhance SQL query execution with retries
const enhanceWithRetries = (sqlFn: any): any => {
  return async function executeSqlWithRetry(strings: any, ...values: any[]): Promise<any[]> {
    const maxRetries = 3;
    let attempts = 0;
    let lastError: Error | null = null;
    
    while (attempts < maxRetries) {
      try {
        const startTime = performance.now();
        const result = await sqlFn(strings, ...values);
        const duration = performance.now() - startTime;
        
        // Track successful query
        connectionManager.trackQuery(true, duration);
        
        return result;
      } catch (error) {
        attempts++;
        lastError = error as Error;
        
        // Track failed query
        connectionManager.trackQuery(false, 0);
        
        // Extract the query for telemetry, safely
        let queryString = '';
        try {
          queryString = typeof strings === 'string' 
            ? strings 
            : Array.isArray(strings) 
              ? strings.join('?') 
              : 'unknown';
        } catch {
          queryString = 'unparseable-query';
        }
        
        // Truncate for telemetry to avoid massive payloads
        if (queryString.length > 100) {
          queryString = queryString.substring(0, 97) + '...';
        }
        
        // Record retry attempt
        telemetry.recordEvent('db.query.error', {
          query: queryString.split(' ')[0], // Use first word of query (SELECT, INSERT, etc.)
          attempt: attempts,
          maxRetries,
          error: error instanceof Error ? error.message : String(error)
        }, 'warning');
        
        // If we have more attempts, wait before retrying
        if (attempts < maxRetries) {
          const retryDelay = Math.pow(2, attempts) * 100 + Math.random() * 100;
          logger.warn(`SQL query attempt ${attempts} failed. Retrying in ${Math.round(retryDelay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // Record final failure
    telemetry.recordEvent('db.query.error', {
      maxRetries,
      attemptsExhausted: true,
      error: lastError instanceof Error ? lastError.message : String(lastError)
    }, 'error');
    
    throw lastError;
  };
};

/**
 * SQL tagged template for database queries
 */
function sql<T extends SqlRow[] = SqlRow[]>(
  strings: TemplateStringsArray | string,
  ...values: any[]
): Promise<T> {
  // Use the cache if available
  if (env.NODE_ENV !== 'production') {
    console.log('SQL query:', typeof strings === 'string' ? strings : strings.join('?'), values);
  }

  // Normalize the calling method for string-based queries
  if (typeof strings === 'string') {
    return enhanceWithRetries(connectionManager.getInstance())(strings, ...values);
  }

  return enhanceWithRetries(connectionManager.getInstance())(strings, ...values);
}

/**
 * A helper function to create SQL queries with parameters.
 * This is a more explicit way to handle parameters and avoids issues with $1, $2 placeholders.
 * 
 * @param queryParts Query string split into parts
 * @param values Values to inject between query parts
 * @returns SQL query result
 */
sql.createQuery = function<T extends SqlRow[] = SqlRow[]>(
  queryParts: string[],
  values: any[] = []
): Promise<T> {
  if (env.NODE_ENV !== 'production') {
    console.log('SQL query (via createQuery):', queryParts.join('?'), values);
  }
  
  if (queryParts.length !== values.length + 1) {
    throw new Error('Number of query parts must be one more than the number of values');
  }
  
  // Build the tagged template query
  let query;
  if (queryParts.length === 1) {
    query = sql`${queryParts[0]}`;
  } else if (queryParts.length === 2) {
    query = sql`${queryParts[0]}${values[0]}${queryParts[1]}`;
  } else if (queryParts.length === 3) {
    query = sql`${queryParts[0]}${values[0]}${queryParts[1]}${values[1]}${queryParts[2]}`;
  } else if (queryParts.length === 4) {
    query = sql`${queryParts[0]}${values[0]}${queryParts[1]}${values[1]}${queryParts[2]}${values[2]}${queryParts[3]}`;
  } else {
    // For more parts, build dynamically
    let finalQuery = sql`${queryParts[0]}`;
    for (let i = 1; i < queryParts.length; i++) {
      finalQuery = sql`${finalQuery}${values[i-1]}${queryParts[i]}`;
    }
    query = finalQuery;
  }
  
  return query as Promise<T>;
};

// Add a query method to the sql object for compatibility
sql.query = async function(queryText: string, values: any[] = []): Promise<any[]> {
  if (env.NODE_ENV !== 'production') {
    console.log('SQL query (via .query):', queryText, values);
  }
  
  try {
    // Track query in connection manager
    const startTime = performance.now();
    
    // Handle parameterized queries by directly passing to the neon client
    // This ensures proper handling of $1, $2, etc. placeholders
    const result = await enhanceWithRetries(connectionManager.getInstance())(queryText, ...values);
    
    const duration = performance.now() - startTime;
    
    connectionManager.trackQuery(true, duration);
    return result;
  } catch (error) {
    connectionManager.trackQuery(false, 0);
    throw error;
  }
};

// Export the enhanced SQL function
export default sql;

// Also export utility functions
export const verifyConnection = async (): Promise<boolean> => {
  return connectionManager.testConnection();
};

export const getConnectionState = (): ConnectionState => connectionManager.getState();
export const isConnected = (): boolean => connectionManager.isConnected();
export const forceReconnect = (): void => connectionManager.forceReconnect();
export const getConnectionMetrics = () => connectionManager.getMetrics(); 