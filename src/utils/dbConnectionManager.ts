import sql, { verifyConnection } from './db';
import { EventEmitter } from 'events';

/**
 * Database connection states
 */
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting'
}

/**
 * Database connection manager with reconnection strategies
 */
class DbConnectionManager extends EventEmitter {
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectInterval: number = 5000; // Start with 5 seconds
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private healthCheckIntervalId: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;

  constructor() {
    super();
    this.initializeConnection();
  }

  /**
   * Initialize database connection and start health checks
   */
  private async initializeConnection(): Promise<void> {
    this.setConnectionState(ConnectionState.CONNECTING);
    
    try {
      const isConnected = await verifyConnection();
      
      if (isConnected) {
        this.onConnectionEstablished();
      } else {
        this.onConnectionFailed(new Error('Initial connection verification failed'));
      }
    } catch (error) {
      this.onConnectionFailed(error as Error);
    }
    
    // Start periodic health checks
    this.startHealthChecks();
  }

  /**
   * Start periodic database health checks
   */
  private startHealthChecks(interval: number = 30000): void {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
    }
    
    this.healthCheckIntervalId = setInterval(async () => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        try {
          const isConnected = await verifyConnection();
          if (!isConnected) {
            console.warn('Health check failed, connection lost. Initiating reconnection...');
            this.initiateReconnection(new Error('Health check failed'));
          }
        } catch (error) {
          console.error('Error during health check:', error);
          this.initiateReconnection(error as Error);
        }
      }
    }, interval);
  }

  /**
   * Attempt to reconnect to the database with exponential backoff
   */
  private initiateReconnection(error: Error): void {
    if (this.isReconnecting) {
      return;
    }
    
    this.isReconnecting = true;
    this.setConnectionState(ConnectionState.RECONNECTING);
    
    // Calculate exponential backoff time with jitter
    const baseDelay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      60000 // Maximum delay of 60 seconds
    );
    
    // Add some randomness (jitter) to prevent thundering herd
    const delay = baseDelay + (Math.random() * 1000);
    
    console.log(`Database reconnection attempt ${this.reconnectAttempts + 1} scheduled in ${Math.round(delay/1000)}s`);
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }
    
    this.reconnectTimeoutId = setTimeout(async () => {
      this.reconnectAttempts++;
      
      try {
        const isConnected = await verifyConnection();
        
        if (isConnected) {
          this.onConnectionRestored();
        } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
          console.warn(`Reconnection attempt ${this.reconnectAttempts} failed. Scheduling next attempt...`);
          this.isReconnecting = false;
          this.initiateReconnection(new Error('Reconnection verification failed'));
        } else {
          console.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
          this.onReconnectionFailed();
        }
      } catch (error) {
        console.error('Error during reconnection attempt:', error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.isReconnecting = false;
          this.initiateReconnection(error as Error);
        } else {
          console.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
          this.onReconnectionFailed();
        }
      }
    }, delay);
  }

  /**
   * Handles successful initial connection
   */
  private onConnectionEstablished(): void {
    console.log('✅ Database connection established successfully');
    this.setConnectionState(ConnectionState.CONNECTED);
    this.emit('connected');
  }

  /**
   * Handles failed initial connection
   */
  private onConnectionFailed(error: Error): void {
    console.error('❌ Failed to establish database connection:', error);
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.emit('connectionFailed', error);
    
    // Attempt to connect again
    this.initiateReconnection(error);
  }

  /**
   * Handles successful reconnection
   */
  private onConnectionRestored(): void {
    console.log('✅ Database connection restored successfully');
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.setConnectionState(ConnectionState.CONNECTED);
    this.emit('reconnected');
  }

  /**
   * Handles failed reconnection after max attempts
   */
  private onReconnectionFailed(): void {
    this.isReconnecting = false;
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.emit('reconnectionFailed');
  }

  /**
   * Set connection state and emit events
   */
  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = state;
    
    if (previousState !== state) {
      this.emit('stateChange', state, previousState);
      this.emit(state);
    }
  }

  /**
   * Execute a database query with automatic retry on failure
   */
  public async executeWithRetry<T>(
    queryFn: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    let attempts = 0;
    
    while (true) {
      try {
        return await queryFn();
      } catch (error) {
        attempts++;
        
        if (attempts >= maxRetries) {
          console.error(`Query failed after ${attempts} attempts. Giving up.`, error);
          throw error;
        }
        
        const retryDelay = 500 * Math.pow(2, attempts - 1) + (Math.random() * 500);
        console.warn(`Query attempt ${attempts} failed. Retrying in ${Math.round(retryDelay)}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if database is connected
   */
  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Force reconnection attempt
   */
  public forceReconnect(): void {
    if (this.connectionState !== ConnectionState.RECONNECTING) {
      this.reconnectAttempts = 0;
      this.initiateReconnection(new Error('Manual reconnection triggered'));
    }
  }
}

// Create and export singleton instance
const dbConnectionManager = new DbConnectionManager();
export default dbConnectionManager;
