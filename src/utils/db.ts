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
      const startTime = performance.now();
      const result = await this.neonInstance`SELECT 1 as connected`;
      const duration = performance.now() - startTime;
      
      this.connectionMetrics.healthCheckLatency = duration;
      
      return result && result.length > 0 && result[0].connected === 1;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  public async testTable(tableName: string): Promise<boolean> {
    if (!this.neonInstance) return false;
    
    try {
      const result = await this.neonInstance`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        );
      `;
      
      return result && result.length > 0 && result[0].exists === true;
    } catch (error) {
      console.error(`Error checking table ${tableName}:`, error);
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
    this.connectionMetrics.totalQueries++;
    if (!success) this.connectionMetrics.failedQueries++;
    this.connectionMetrics.lastQueryTime = duration;
  }
  
  public getMetrics(): typeof this.connectionMetrics {
    return {...this.connectionMetrics};
  }
  
  // Add transaction support
  public async beginTransaction(): Promise<void> {
    if (!this.neonInstance) throw new Error('Database connection not initialized');
    await this.neonInstance`BEGIN`;
  }
  
  public async commitTransaction(): Promise<void> {
    if (!this.neonInstance) throw new Error('Database connection not initialized');
    await this.neonInstance`COMMIT`;
  }
  
  public async rollbackTransaction(): Promise<void> {
    if (!this.neonInstance) throw new Error('Database connection not initialized');
    await this.neonInstance`ROLLBACK`;
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
  const startTime = performance.now();
  
  try {
    // Normalize the calling method for string-based queries
    let promise;
    if (typeof strings === 'string') {
      promise = connectionManager.getInstance()(strings, ...values);
    } else {
      promise = connectionManager.getInstance()(strings, ...values);
    }
    
    return promise.then((result: T) => {
      const duration = performance.now() - startTime;
      connectionManager.trackQuery(true, duration);
      return result;
    }).catch((error: any) => {
      const duration = performance.now() - startTime;
      connectionManager.trackQuery(false, duration);
      throw error;
    });
  } catch (error) {
    // Handle synchronous errors (shouldn't happen with neon, but just in case)
    connectionManager.trackQuery(false, 0);
    throw error;
  }
}

// Add a query method to the sql object for compatibility
sql.query = async function(queryText: string, values: any[] = []): Promise<any[]> {
  const startTime = performance.now();
  
  try {
    // Handle parameterized queries by directly passing to the neon client
    // This ensures proper handling of $1, $2, etc. placeholders
    const result = await connectionManager.getInstance()(queryText, ...values);
    
    const duration = performance.now() - startTime;
    connectionManager.trackQuery(true, duration);
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    connectionManager.trackQuery(false, duration);
    throw error;
  }
};

// Add transaction methods directly to sql
sql.begin = async function(): Promise<void> {
  await connectionManager.beginTransaction();
};

sql.commit = async function(): Promise<void> {
  await connectionManager.commitTransaction();
};

sql.rollback = async function(): Promise<void> {
  await connectionManager.rollbackTransaction();
};

// Test if a table exists in the database
sql.tableExists = async function(tableName: string): Promise<boolean> {
  return connectionManager.testTable(tableName);
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
export const forceReconnect = async (): Promise<boolean> => {
  return connectionManager.forceReconnect();
};
export const getConnectionMetrics = () => connectionManager.getMetrics();

// Define row type for easier use in the application
export interface SqlRow {
  [key: string]: string | number | boolean | Date | null | undefined | object | any[];
}

// Add database initialization function
export async function initializeDbSchema(): Promise<boolean> {
  if (!connectionManager.isConnected()) {
    console.error('Cannot initialize DB schema: Database not connected');
    return false;
  }

  try {
    // Start a transaction for atomic schema creation
    await sql.begin();

    // Create customer_qrcodes table if it doesn't exist
    await sql.query(`
      CREATE TABLE IF NOT EXISTS customer_qrcodes (
        id SERIAL PRIMARY KEY,
        qr_unique_id UUID NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        business_id INTEGER,
        qr_data JSONB NOT NULL,
        qr_image_url TEXT,
        qr_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        verification_code TEXT NOT NULL,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        uses_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TIMESTAMP,
        expiry_date TIMESTAMP,
        revoked_reason TEXT,
        revoked_at TIMESTAMP,
        replaced_by INTEGER,
        digital_signature TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_customer_id ON customer_qrcodes(customer_id);
      CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_qr_unique_id ON customer_qrcodes(qr_unique_id);
      CREATE INDEX IF NOT EXISTS idx_customer_qrcodes_status ON customer_qrcodes(status);
    `);
    
    // Create customer_program_enrollments table if it doesn't exist
    await sql.query(`
      CREATE TABLE IF NOT EXISTS customer_program_enrollments (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        program_id INTEGER NOT NULL,
        business_id INTEGER NOT NULL,
        join_date TIMESTAMP NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        points INTEGER NOT NULL DEFAULT 0,
        tier_level TEXT NOT NULL DEFAULT 'STANDARD',
        last_activity TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (customer_id, program_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_enrollments_customer_program ON customer_program_enrollments(customer_id, program_id);
    `);
    
    // Create loyalty programs table if it doesn't exist
    await sql.query(`
      CREATE TABLE IF NOT EXISTS loyalty_programs (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        points_per_visit INTEGER NOT NULL DEFAULT 1,
        points_per_dollar INTEGER NOT NULL DEFAULT 0,
        min_points_for_reward INTEGER NOT NULL DEFAULT 10,
        reward_description TEXT,
        program_rules JSONB,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create promo_codes table if it doesn't exist
    await sql.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        business_id INTEGER NOT NULL,
        program_id INTEGER,
        discount_type TEXT NOT NULL,
        discount_value NUMERIC NOT NULL,
        min_purchase_amount NUMERIC,
        max_discount_amount NUMERIC,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        max_uses INTEGER,
        current_uses INTEGER NOT NULL DEFAULT 0,
        is_first_purchase_only BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
      CREATE INDEX IF NOT EXISTS idx_promo_codes_business_id ON promo_codes(business_id);
      CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes(status);
    `);
    
    // Create customer_promo_codes table to track which customers have which codes
    await sql.query(`
      CREATE TABLE IF NOT EXISTS customer_promo_codes (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        promo_code_id INTEGER NOT NULL,
        claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        used_at TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'CLAIMED',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (customer_id, promo_code_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_customer_promo_customer_id ON customer_promo_codes(customer_id);
      CREATE INDEX IF NOT EXISTS idx_customer_promo_promo_id ON customer_promo_codes(promo_code_id);
    `);

    await sql.commit();
    console.log('Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database schema:', error);
    await sql.rollback();
    return false;
  }
} 