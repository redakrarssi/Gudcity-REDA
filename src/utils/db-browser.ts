import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon
neonConfig.fetchConnectionCache = true;

// Simple logger
const logger = {
  info: (...args: any[]) => console.info('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

// Database URL from environment variables
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || '';

// Check if database URL is available
const hasDbUrl = !!DATABASE_URL;

// Connection states
const ConnectionState = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  RECONNECTING: 'reconnecting',
};

// Simple connection manager
class DbConnectionManager {
  private connectionState = ConnectionState.DISCONNECTED;
  private neonInstance: any = null;

  constructor() {
    if (hasDbUrl) {
      this.initConnection();
    } else {
      logger.warn('No DATABASE_URL environment variable found, connection manager disabled');
      this.connectionState = ConnectionState.DISCONNECTED;
    }
  }

  private initConnection(): void {
    try {
      this.connectionState = ConnectionState.CONNECTING;
      logger.info('Initializing database connection...');
      this.neonInstance = neon(DATABASE_URL);
      this.connectionState = ConnectionState.CONNECTED;
    } catch (error) {
      logger.error('Failed to initialize database connection:', error);
      this.connectionState = ConnectionState.DISCONNECTED;
    }
  }

  public getState(): string {
    return this.connectionState;
  }

  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  public getInstance(): any {
    return this.neonInstance;
  }
}

// Singleton instance
const connectionManager = new DbConnectionManager();

/**
 * SQL tagged template for database queries
 */
function sql<T = any[]>(
  strings: TemplateStringsArray | string,
  ...values: any[]
): Promise<T> {
  // Normalize the calling method for string-based queries
  if (typeof strings === 'string') {
    return connectionManager.getInstance()(strings, ...values);
  }

  return connectionManager.getInstance()(strings, ...values);
}

/**
 * Add a query method to the sql object for compatibility
 */
sql.query = async function(queryText: string, values: any[] = []): Promise<any[]> {
  try {
    // Handle parameterized queries by directly passing to the neon client
    // This ensures proper handling of $1, $2, etc. placeholders
    const result = await connectionManager.getInstance()(queryText, ...values);
    return result;
  } catch (error) {
    throw error;
  }
};

// Create Query helpers
sql.createQuery = function<T = any[]>(
  queryParts: string[],
  values: any[] = []
): Promise<T> {
  if (queryParts.length !== values.length + 1) {
    throw new Error('Number of query parts must be one more than the number of values');
  }
  
  let query;
  if (queryParts.length === 1) {
    query = sql`${queryParts[0]}`;
  } else {
    // Build the query dynamically
    query = sql`${queryParts[0]}`;
    for (let i = 1; i < queryParts.length; i++) {
      query = sql`${query}${values[i-1]}${queryParts[i]}`;
    }
  }
  
  return query as Promise<T>;
};

// Export the enhanced SQL function
export default sql;

// Also export utility functions
export const getConnectionState = (): string => connectionManager.getState();
export const isConnected = (): boolean => connectionManager.isConnected();

// Define row type for easier use in the application
export interface SqlRow {
  [key: string]: string | number | boolean | Date | null | undefined | object | any[];
} 