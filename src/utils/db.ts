import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon
neonConfig.fetchConnectionCache = true;

// Database URL from environment variables
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL || '';

// Check if database URL is available
const hasDbUrl = !!DATABASE_URL;

// Connection states
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting'
}

// Simple connection manager
class DbConnectionManager {
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private neonInstance: any = null;

  constructor() {
    if (hasDbUrl) {
      this.initConnection();
    } else {
      console.warn('No DATABASE_URL environment variable found, connection manager disabled');
      this.connectionState = ConnectionState.DISCONNECTED;
    }
  }

  private initConnection(): void {
    try {
      this.connectionState = ConnectionState.CONNECTING;
      console.info('Initializing database connection...');
      this.neonInstance = neon(DATABASE_URL);
      this.connectionState = ConnectionState.CONNECTED;
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      this.connectionState = ConnectionState.DISCONNECTED;
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.neonInstance) return false;
    
    try {
      const result = await this.neonInstance`SELECT 1 as connected`;
      return result && result.length > 0 && result[0].connected === 1;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  public getState(): ConnectionState {
    return this.connectionState;
  }

  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  public getInstance(): any {
    return this.neonInstance;
  }
  
  public trackQuery(success: boolean, duration: number): void {
    // Simplified tracking functionality
  }
}

// Singleton instance
const connectionManager = new DbConnectionManager();

/**
 * SQL tagged template for database queries
 */
function sql<T extends SqlRow[] = SqlRow[]>(
  strings: TemplateStringsArray | string,
  ...values: any[]
): Promise<T> {
  // Normalize the calling method for string-based queries
  if (typeof strings === 'string') {
    return connectionManager.getInstance()(strings, ...values);
  }

  return connectionManager.getInstance()(strings, ...values);
}

// Add a query method to the sql object for compatibility
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

// Create Query helper
sql.createQuery = function<T extends SqlRow[] = SqlRow[]>(
  queryParts: string[],
  values: any[] = []
): Promise<T> {
  if (queryParts.length !== values.length + 1) {
    throw new Error('Number of query parts must be one more than the number of values');
  }
  
  let query;
  if (queryParts.length === 1) {
    query = sql`${queryParts[0]}`;
  } else if (queryParts.length === 2) {
    query = sql`${queryParts[0]}${values[0]}${queryParts[1]}`;
  } else if (queryParts.length === 3) {
    query = sql`${queryParts[0]}${values[0]}${queryParts[1]}${values[1]}${queryParts[2]}`;
  } else {
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
export const verifyConnection = async (): Promise<boolean> => {
  return connectionManager.testConnection();
};

export const getConnectionState = (): ConnectionState => connectionManager.getState();
export const isConnected = (): boolean => connectionManager.isConnected();
export const forceReconnect = (): void => {}; // Empty implementation for compatibility

// Define row type for easier use in the application
export interface SqlRow {
  [key: string]: string | number | boolean | Date | null | undefined | object | any[];
} 