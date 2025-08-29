import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon
neonConfig.fetchConnectionCache = true;

// Database URL from environment variables (Node.js compatible)
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';

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
  private connectionMetrics = {
    totalQueries: 0,
    failedQueries: 0,
    lastQueryTime: 0,
    connectedSince: 0,
    healthCheckLatency: 0
  };

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
      this.connectionMetrics.connectedSince = Date.now();
      console.info('Database connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      this.connectionState = ConnectionState.DISCONNECTED;
    }
  }

  public async forceReconnect(): Promise<boolean> {
    console.info('Forcing database reconnection...');
    
    try {
      // Set state to reconnecting
      this.connectionState = ConnectionState.RECONNECTING;
      
      // Close existing connection if possible (for Neon, we just dereference)
      this.neonInstance = null;
      
      // Reinitialize connection
      this.initConnection();
      
      // Test the new connection
      const isConnected = await this.testConnection();
      
      if (isConnected) {
        console.info('Database reconnection successful');
        return true;
      } else {
        console.error('Database reconnection failed: Connection test failed');
        this.connectionState = ConnectionState.DISCONNECTED;
        return false;
      }
    } catch (error) {
      console.error('Database reconnection failed:', error);
      this.connectionState = ConnectionState.DISCONNECTED;
      return false;
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.neonInstance) return false;
    
    try {
      const startTime = Date.now();
      const result = await this.neonInstance`SELECT 1 as connected`;
      const duration = Date.now() - startTime;
      
      this.connectionMetrics.healthCheckLatency = duration;
      
      return result && result.length > 0 && result[0].connected === 1;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getConnectionMetrics() {
    return { ...this.connectionMetrics };
  }

  public async executeQuery<T = any>(query: any, ...params: any[]): Promise<T[]> {
    if (!this.neonInstance) {
      throw new Error('Database connection not available');
    }

    try {
      this.connectionMetrics.totalQueries++;
      this.connectionMetrics.lastQueryTime = Date.now();
      
      const result = await this.neonInstance(query, ...params);
      return result;
    } catch (error) {
      this.connectionMetrics.failedQueries++;
      console.error('Database query failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const dbManager = new DbConnectionManager();

// Export the main SQL function for compatibility
const sql = async (query: any, ...params: any[]) => {
  return dbManager.executeQuery(query, ...params);
};

// Add additional methods to the sql function for compatibility
(sql as any).begin = async () => {
  // Simple transaction simulation for now
  return {
    commit: async () => console.log('Transaction committed'),
    rollback: async () => console.log('Transaction rolled back')
  };
};

export default sql;
export { dbManager };