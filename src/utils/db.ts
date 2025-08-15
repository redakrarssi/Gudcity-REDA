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
    // Check if the function exists
    const functionExists = await sql`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'process_enrollment_approval'
      );
    `;
    
    if (functionExists && functionExists[0] && functionExists[0].exists === true) {
      return true;
    }
    
    // Create the function if it doesn't exist
    await sql`
      CREATE OR REPLACE FUNCTION process_enrollment_approval(request_id UUID, is_approved BOOLEAN)
      RETURNS UUID AS $$
      DECLARE
        customer_id_val INTEGER;
        business_id_val INTEGER;
        program_id_val TEXT;
        notification_id_val UUID;
        enrollment_exists BOOLEAN;
        card_id_val UUID;
        card_exists BOOLEAN;
        card_number_val TEXT;
        program_name_val TEXT;
        business_name_val TEXT;
        customer_name_val TEXT;
        enrollment_id_val INTEGER;
        existing_notification UUID;
      BEGIN
        -- Start an explicit transaction
        BEGIN
          -- Update the approval request status
          UPDATE customer_approval_requests
          SET status = CASE WHEN is_approved THEN 'APPROVED' ELSE 'REJECTED' END,
              responded_at = NOW(),
              updated_at = NOW()
          WHERE id = request_id
          RETURNING customer_id, business_id, entity_id, notification_id INTO customer_id_val, business_id_val, program_id_val, notification_id_val;
          
          -- If customer_id is null, the request wasn't found
          IF customer_id_val IS NULL THEN
            RAISE EXCEPTION 'Approval request not found: %', request_id;
          END IF;
          
          -- Get program and business names for better notifications
          SELECT name INTO program_name_val FROM loyalty_programs WHERE id = program_id_val::uuid;
          IF program_name_val IS NULL THEN
            program_name_val := 'Unknown program';
            RAISE NOTICE 'Program name not found for %', program_id_val;
          END IF;
          
          SELECT name INTO business_name_val FROM users WHERE id = business_id_val;
          IF business_name_val IS NULL THEN
            business_name_val := 'Unknown business';
            RAISE NOTICE 'Business name not found for %', business_id_val;
          END IF;
          
          SELECT name INTO customer_name_val FROM users WHERE id = customer_id_val;
          IF customer_name_val IS NULL THEN
            customer_name_val := 'Unknown customer';
            RAISE NOTICE 'Customer name not found for %', customer_id_val;
          END IF;
          
          -- Mark notification as actioned
          UPDATE customer_notifications
          SET action_taken = TRUE,
              is_read = TRUE,
              read_at = NOW()
          WHERE id = notification_id_val;
          
          -- Create a notification for the business about the customer's decision
          INSERT INTO customer_notifications (
            id,
            customer_id,
            business_id,
            type,
            title,
            message,
            data,
            requires_action,
            action_taken,
            is_read,
            created_at
          ) VALUES (
            gen_random_uuid(),
            business_id_val,
            business_id_val,
            CASE WHEN is_approved THEN 'ENROLLMENT_ACCEPTED' ELSE 'ENROLLMENT_REJECTED' END,
            CASE WHEN is_approved THEN 'Customer Joined Program' ELSE 'Enrollment Declined' END,
            CASE WHEN is_approved 
                THEN COALESCE(customer_name_val, 'A customer') || ' has joined your ' || COALESCE(program_name_val, 'loyalty program')
                ELSE COALESCE(customer_name_val, 'A customer') || ' has declined to join your ' || COALESCE(program_name_val, 'loyalty program')
            END,
            jsonb_build_object(
              'programId', program_id_val,
              'programName', program_name_val,
              'customerId', customer_id_val,
              'approved', is_approved
            ),
            FALSE,
            FALSE,
            FALSE,
            NOW()
          );
          
          -- Create or update customer-business relationship regardless of approval decision
          -- For both approved and declined enrollments, we want to track the relationship
          INSERT INTO customer_business_relationships (
            customer_id,
            business_id,
            status,
            created_at,
            updated_at
          ) VALUES (
            customer_id_val::text,
            business_id_val::text,
            CASE WHEN is_approved THEN 'ACTIVE' ELSE 'DECLINED' END,
            NOW(),
            NOW()
          )
          ON CONFLICT (customer_id, business_id) 
          DO UPDATE SET 
            status = CASE WHEN is_approved THEN 'ACTIVE' ELSE 'DECLINED' END,
            updated_at = NOW();
          
          -- Create a notification for the customer about their decision
          INSERT INTO customer_notifications (
            id,
            customer_id,
            business_id,
            type,
            title,
            message,
            data,
            requires_action,
            action_taken,
            is_read,
            created_at
          ) VALUES (
            gen_random_uuid(),
            customer_id_val,
            business_id_val,
            CASE WHEN is_approved THEN 'ENROLLMENT_SUCCESS' ELSE 'ENROLLMENT_DECLINED' END,
            CASE WHEN is_approved THEN 'Enrollment Success' ELSE 'Enrollment Declined' END,
            CASE WHEN is_approved 
                THEN 'You have been enrolled in ' || COALESCE(program_name_val, 'the loyalty program')
                ELSE 'You declined to join ' || COALESCE(program_name_val, 'the loyalty program')
            END,
            jsonb_build_object(
              'programId', program_id_val,
              'programName', program_name_val,
              'businessName', business_name_val
            ),
            FALSE,
            TRUE,
            FALSE,
            NOW()
          );
          
          -- If not approved, just return null (no card created)
          IF NOT is_approved THEN
            -- Commit transaction
            COMMIT;
            RETURN NULL;
          END IF;
          
          -- Check if already enrolled
          SELECT EXISTS (
            SELECT 1 FROM program_enrollments 
            WHERE customer_id = customer_id_val 
            AND program_id = program_id_val
          ) INTO enrollment_exists;
          
          IF enrollment_exists THEN
            -- Already enrolled, just update status if needed
            UPDATE program_enrollments
            SET status = 'ACTIVE', 
                updated_at = NOW()
            WHERE customer_id = customer_id_val 
            AND program_id = program_id_val 
            AND status != 'ACTIVE'
            RETURNING id INTO enrollment_id_val;
          ELSE
            -- Create enrollment record
            INSERT INTO program_enrollments (
              customer_id,
              program_id,
              business_id,
              status,
              current_points,
              total_points_earned,
              enrolled_at
            ) VALUES (
              customer_id_val,
              program_id_val,
              business_id_val,
              'ACTIVE',
              0,
              0,
              NOW()
            ) RETURNING id INTO enrollment_id_val;
          END IF;
          
          -- Check if card exists
          SELECT EXISTS (
            SELECT 1 FROM loyalty_cards
            WHERE customer_id = customer_id_val
            AND program_id = program_id_val
          ) INTO card_exists;
          
          -- Create card if it doesn't exist
          IF NOT card_exists THEN
            -- Generate a unique card number with timestamp and random component
            card_number_val := 'GC-' || to_char(NOW(), 'YYMMDD-HH24MISS') || '-' || floor(random() * 10000)::TEXT;
            
            -- Generate a new UUID for the card
            card_id_val := gen_random_uuid();
            
            -- Create the card
            INSERT INTO loyalty_cards (
              id,
              customer_id,
              program_id,
              business_id,
              card_number,
              status,
              points,
              card_type,
              tier,
              points_multiplier,
              is_active,
              created_at,
              updated_at
            ) VALUES (
              card_id_val,
              customer_id_val,
              program_id_val,
              business_id_val,
              card_number_val,
              'ACTIVE',
              0,
              'STANDARD',
              'STANDARD',
              1.0,
              true,
              NOW(),
              NOW()
            );
          ELSE
            -- Get the existing card ID
            SELECT id INTO card_id_val
            FROM loyalty_cards
            WHERE customer_id = customer_id_val
            AND program_id = program_id_val
            LIMIT 1;
          END IF;
          
          -- Check if we already sent a card notification for this program
          SELECT id INTO existing_notification 
          FROM customer_notifications 
          WHERE customer_id = customer_id_val 
          AND type = 'CARD_CREATED'
          AND data->>'programId' = program_id_val
          LIMIT 1;
          
          -- Only create card notification if we haven't already
          IF existing_notification IS NULL THEN
            -- Create notification for customer about their new card
            INSERT INTO customer_notifications (
              id,
              customer_id,
              business_id,
              type,
              title,
              message,
              data,
              requires_action,
              action_taken,
              is_read,
              created_at
            ) VALUES (
              gen_random_uuid(),
              customer_id_val,
              business_id_val,
              'CARD_CREATED',
              'Loyalty Card Created',
              'Your loyalty card for ' || COALESCE(program_name_val, 'the loyalty program') || 
              ' at ' || COALESCE(business_name_val, 'the business') || ' is ready',
              jsonb_build_object(
                'programId', program_id_val,
                'programName', program_name_val,
                'businessName', business_name_val,
                'cardId', card_id_val
              ),
              FALSE,
              FALSE,
              FALSE,
              NOW()
            );
          END IF;
          
          -- Double-check we have enrollments and cards
          IF enrollment_id_val IS NULL THEN
            RAISE EXCEPTION 'Failed to create or find enrollment record for customer % and program %', customer_id_val, program_id_val;
          END IF;
          
          IF card_id_val IS NULL THEN
            RAISE EXCEPTION 'Failed to create or find card record for customer % and program %', customer_id_val, program_id_val;
          END IF;
          
          -- Ensure we have a valid card ID before returning
          IF card_id_val IS NULL OR card_id_val = '' THEN
            RAISE EXCEPTION 'Card ID is null or empty after creation for customer % and program %', customer_id_val, program_id_val;
          END IF;
          
          -- Commit transaction
          COMMIT;
          
          -- Return the card ID as a string for better compatibility
          RETURN card_id_val::text;
        EXCEPTION WHEN OTHERS THEN
          -- Rollback transaction on error
          ROLLBACK;
          RAISE;
        END;
      EXCEPTION WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE NOTICE 'Error in process_enrollment_approval: %', SQLERRM;
        RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    return true;
  } catch (error) {
    console.error('Failed to create enrollment procedure:', error);
    throw error;
  }
} 

/**
 * Ensures the loyalty_cards table has the correct schema for new enrollments
 */
export async function ensureLoyaltyCardsSchema(): Promise<boolean> {
  try {
    console.log('Ensuring loyalty_cards table has correct schema...');
    
    // Add missing columns if they don't exist
    await sql`
      ALTER TABLE loyalty_cards 
      ADD COLUMN IF NOT EXISTS card_number VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'STANDARD',
      ADD COLUMN IF NOT EXISTS points_multiplier NUMERIC(10,2) DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS card_type VARCHAR(50) DEFAULT 'STANDARD',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `;
    
    console.log('Loyalty_cards table schema updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating loyalty_cards table schema:', error);
    return false;
  }
} 