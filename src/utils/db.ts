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
      console.warn('No DATABASE_URL environment variable found, connection manager disabled - using mock mode');
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
    await sql`
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
    `;
    
    // Create customer_program_enrollments table if it doesn't exist
    await sql`
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
    `;
    
    // Create loyalty programs table if it doesn't exist
    await sql`
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
    `;
    
    // Create promo_codes table if it doesn't exist
    await sql`
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
    `;
    
    // Create customer_promo_codes table to track which customers have which codes
    await sql`
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
    `;

    await sql.commit();
    console.log('Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database schema:', error);
    await sql.rollback();
    return false;
  }
}

/**
 * Checks if the process_enrollment_approval stored procedure exists and creates it if not
 */
export async function ensureEnrollmentProcedureExists(): Promise<boolean> {
  try {
    // Check for specific 3-arg signature, not just the function name
    const sigRows = await sql`
      SELECT pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_catalog.pg_proc p
      WHERE p.proname = 'process_enrollment_approval'
    `;

    const hasThreeArg = Array.isArray(sigRows)
      && sigRows.some((r: any) => String(r.args).trim().toLowerCase() === 'integer, integer, uuid');

    if (!hasThreeArg) {
      console.log('Creating or replacing process_enrollment_approval(integer, integer, uuid)');
    await sql`
        CREATE OR REPLACE FUNCTION process_enrollment_approval(
          p_customer_id INTEGER,
          p_program_id INTEGER,
          p_request_id UUID
        )
        RETURNS INTEGER AS $$
      DECLARE
          customer_id_val INTEGER := p_customer_id;
          program_id_int INTEGER := p_program_id;
        business_id_val INTEGER;
        program_name_val TEXT;
        business_name_val TEXT;
          notification_id_val UUID;
        enrollment_id_val INTEGER;
          card_id_val INTEGER;
          enrollment_exists BOOLEAN;
          card_exists BOOLEAN;
          notif_exists BOOLEAN;
          customer_exists BOOLEAN;
          user_id_val INTEGER;
          user_name_val TEXT;
          user_email_val TEXT;
          gen_uuid UUID;
      BEGIN
          -- Update approval request (use response_at, avoid relying on updated_at)
          UPDATE customer_approval_requests
          SET status = 'APPROVED',
              response_at = NOW()
          WHERE id = p_request_id
          RETURNING notification_id INTO notification_id_val;

          -- Resolve business/program info
          SELECT lp.business_id, lp.name
          INTO business_id_val, program_name_val
          FROM loyalty_programs lp
          WHERE lp.id = program_id_int;
          IF business_id_val IS NULL THEN
            RAISE EXCEPTION 'Program not found: %', program_id_int;
          END IF;
          
          SELECT name INTO business_name_val FROM users WHERE id = business_id_val;

          -- CRITICAL FIX: Ensure customer record exists before creating loyalty card
          SELECT EXISTS (
            SELECT 1 FROM customers WHERE id = customer_id_val
          ) INTO customer_exists;
          
          IF NOT customer_exists THEN
            -- Customer doesn't exist, we need to create it
            -- First, find the user record that corresponds to this customer_id
            -- Assumption: customer_id matches user_id in this case
            SELECT id, name, email
            INTO user_id_val, user_name_val, user_email_val
            FROM users 
            WHERE id = customer_id_val;
            
            IF user_id_val IS NULL THEN
              RAISE EXCEPTION 'User not found for customer_id: %. Cannot create customer record.', customer_id_val;
            END IF;
            
            -- Create the customer record
            INSERT INTO customers (
              id,
              user_id, 
              name, 
              email,
              notification_preferences,
              regional_settings,
              joined_at,
              created_at,
              updated_at
            ) VALUES (
              customer_id_val,
              user_id_val,
              COALESCE(
                NULLIF(user_name_val, ''),
                CASE 
                  WHEN user_email_val LIKE '%@%' THEN 
                    INITCAP(REPLACE(SPLIT_PART(user_email_val, '@', 1), '.', ' '))
                  ELSE 
                    'Customer ' || customer_id_val::TEXT
                END
              ),
              user_email_val,
              '{"email": true, "push": true, "sms": false, "promotions": true, "rewards": true, "system": true}'::jsonb,
              '{"language": "en", "country": "United States", "currency": "USD", "timezone": "UTC"}'::jsonb,
              NOW(),
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO NOTHING; -- Handle race conditions gracefully
            
            RAISE NOTICE 'Created customer record for customer_id: %', customer_id_val;
          END IF;

          -- Mark the original notification as actioned if present
          IF notification_id_val IS NOT NULL THEN
          UPDATE customer_notifications
          SET action_taken = TRUE,
              is_read = TRUE,
              read_at = NOW()
          WHERE id = notification_id_val;
          END IF;
          
          -- Ensure enrollment exists and is ACTIVE (program_enrollments has no business_id or total_points_earned in this DB)
          SELECT EXISTS (
            SELECT 1 FROM program_enrollments 
            WHERE customer_id = customer_id_val AND program_id = program_id_int
          ) INTO enrollment_exists;
          
          IF enrollment_exists THEN
            UPDATE program_enrollments
            SET status = 'ACTIVE', 
                last_activity = NOW()
            WHERE customer_id = customer_id_val AND program_id = program_id_int;
          ELSE
            INSERT INTO program_enrollments (
              customer_id, program_id, status, current_points, enrolled_at
            ) VALUES (
              customer_id_val, program_id_int, 'ACTIVE', 0, NOW()
            ) RETURNING id INTO enrollment_id_val;
          END IF;
          
          -- Ensure loyalty card exists
          SELECT EXISTS (
            SELECT 1 FROM loyalty_cards
            WHERE customer_id = customer_id_val AND program_id = program_id_int
          ) INTO card_exists;
          
          IF NOT card_exists THEN
            INSERT INTO loyalty_cards (
              customer_id, business_id, program_id, card_number,
              status, card_type, points, tier, points_multiplier, is_active, created_at, updated_at
            ) VALUES (
              customer_id_val, business_id_val, program_id_int,
              'GC-' || to_char(NOW(), 'YYMMDD-HH24MISS') || '-' || floor(random() * 10000)::TEXT,
              'ACTIVE', 'STANDARD', 0, 'STANDARD', 1.0, TRUE, NOW(), NOW()
            ) RETURNING id INTO card_id_val;
          ELSE
            SELECT id INTO card_id_val FROM loyalty_cards
            WHERE customer_id = customer_id_val AND program_id = program_id_int
            ORDER BY created_at DESC LIMIT 1;
          END IF;

          -- Ensure customer-business relationship is ACTIVE (best-effort)
          BEGIN
            INSERT INTO customer_business_relationships (
              customer_id, business_id, status, created_at, updated_at
            ) VALUES (
              customer_id_val, business_id_val, 'ACTIVE', NOW(), NOW()
            )
            ON CONFLICT (customer_id, business_id)
            DO UPDATE SET status = 'ACTIVE', updated_at = NOW();
          EXCEPTION WHEN OTHERS THEN
            -- Table might not exist or other non-critical issues
            RAISE NOTICE 'Relationship activation skipped: %', SQLERRM;
          END;

          -- Create CARD_CREATED notification if none exists for this (customer, program)
          BEGIN
            PERFORM 1 FROM customer_notifications
            WHERE customer_id = customer_id_val
              AND business_id = business_id_val
              AND (type = 'ENROLLMENT' OR type = 'CARD_CREATED')
              AND COALESCE((data->>'programId')::int, program_id_int) = program_id_int
            LIMIT 1;
            IF NOT FOUND THEN
              -- generate a UUID without requiring extensions
              SELECT (
                substr(md5(random()::text),1,8)||'-'||
                substr(md5(random()::text),1,4)||'-'||
                substr(md5(random()::text),1,4)||'-'||
                substr(md5(random()::text),1,4)||'-'||
                substr(md5(random()::text),1,12)
              )::uuid INTO gen_uuid;

              INSERT INTO customer_notifications (
                id, customer_id, business_id, type, title, message, data,
                requires_action, action_taken, is_read, created_at
              ) VALUES (
                gen_uuid,
                customer_id_val,
                business_id_val,
                'CARD_CREATED',
                'Loyalty Card Created',
                'Your loyalty card was created successfully',
                jsonb_build_object(
                  'programId', program_id_int,
                  'programName', COALESCE(program_name_val, 'Loyalty Program'),
                  'businessName', COALESCE(business_name_val, 'Business'),
                  'cardId', card_id_val,
                  'timestamp', NOW()
                ),
                FALSE, FALSE, FALSE, NOW()
              );
            END IF;
          EXCEPTION WHEN OTHERS THEN
            -- Non-critical; do not fail the procedure if notification insert fails
            RAISE NOTICE 'Notification creation skipped: %', SQLERRM;
          END;
          
          RETURN card_id_val;
        EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error in process_enrollment_approval: %', SQLERRM;
        RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `;
    }

    // Create a text overload that normalizes inputs inside SQL, to support legacy callers
    // process_enrollment_approval(text, text, uuid) -> calls the integer version
    const hasTextOverloadRows = await sql`
      SELECT pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_catalog.pg_proc p
      WHERE p.proname = 'process_enrollment_approval'
    `;
    const hasTextOverload = Array.isArray(hasTextOverloadRows)
      && hasTextOverloadRows.some((r: any) => String(r.args).trim().toLowerCase() === 'text, text, uuid');
    if (!hasTextOverload) {
      await sql`
        CREATE OR REPLACE FUNCTION process_enrollment_approval(
          p_customer_id TEXT,
          p_program_id TEXT,
          p_request_id UUID
        ) RETURNS INTEGER AS $$
        DECLARE
          customer_id_int INTEGER;
          program_id_int INTEGER;
          card_id_out INTEGER;
        BEGIN
          BEGIN
            customer_id_int := COALESCE(NULLIF(regexp_replace(p_customer_id, '\\D', '', 'g'), '')::INT, -1);
            program_id_int := COALESCE(NULLIF(regexp_replace(p_program_id, '\\D', '', 'g'), '')::INT, -1);
          EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Failed to normalize IDs: % / %', p_customer_id, p_program_id;
          END;

          RETURN process_enrollment_approval(customer_id_int, program_id_int, p_request_id);
        END;
        $$ LANGUAGE plpgsql;
      `;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to ensure enrollment procedure:', error);
    throw error;
  }
} 