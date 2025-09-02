import sql from './db';
import { ensureUserTableExists, ensureDemoUsers } from '../services/userService';
import { ensureBusinessTablesExist } from '../services/businessService';
import { ensureApprovalTableExists } from '../services/approvalService';
import { ensureSystemLogsTableExists } from '../services/dashboardService';
import { ensurePagesTableExists } from '../services/pageService';

// Our own implementation of QR code tables initialization
async function initializeDbSchema(): Promise<boolean> {
  try {
    console.log('Initializing QR code tables...');
    
    // CRITICAL FIX: Add timeout to prevent hanging
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn('Database initialization timed out, skipping...');
        resolve(false);
      }, 2000); // 2 second timeout
    });
    
    const initPromise = (async () => {
      try {
        // Check if the qr_codes table exists
        const qrCodesTableExists = await sql.tableExists('qr_codes');
        if (!qrCodesTableExists) {
          console.log('Creating qr_codes table...');
          await sql`
            CREATE TABLE IF NOT EXISTS qr_codes (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL,
              type VARCHAR(50) NOT NULL,
              data JSONB NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `;
          console.log('Created qr_codes table');
        }
        
        // Check if the user_qr_codes table exists
        const userQrCodesTableExists = await sql.tableExists('user_qr_codes');
        if (!userQrCodesTableExists) {
          console.log('Creating user_qr_codes table...');
          await sql`
            CREATE TABLE IF NOT EXISTS user_qr_codes (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL,
              qr_code_id INTEGER NOT NULL,
              is_favorite BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE
            )
          `;
          console.log('Created user_qr_codes table');
        }
        
        return true;
      } catch (error) {
        console.error('Error initializing QR code tables:', error);
        return false;
      }
    })();
    
    // Race between timeout and initialization
    return await Promise.race([initPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error in initializeDbSchema:', error);
    return false;
  }
}

// Helper function to ensure customer settings columns exist
async function ensureCustomerSettingsColumns(): Promise<void> {
  try {
    console.log('Ensuring customer settings columns exist...');
    
    // First check if the customers table exists
    const tableExists = await sql.tableExists('customers');
    if (!tableExists) {
      console.log('Customers table does not exist yet, will be created during initialization');
      return;
    }
    
    // Check if the necessary columns exist in the customers table
    const columnsResult = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers' AND (
        column_name = 'notification_preferences' OR
        column_name = 'regional_settings'
      )
    `;
    
    if (columnsResult.length < 2) {
      console.log('Adding missing customer settings columns...');
      
      // Add notification_preferences column if it doesn't exist
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'notification_preferences'
          ) THEN
            ALTER TABLE customers ADD COLUMN notification_preferences JSONB DEFAULT '{
              "email": true,
              "push": true,
              "sms": false,
              "promotions": true,
              "rewards": true,
              "system": true
            }';
          END IF;
        END
        $$;
      `;
      
      // Add regional_settings column if it doesn't exist
      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customers' AND column_name = 'regional_settings'
          ) THEN
            ALTER TABLE customers ADD COLUMN regional_settings JSONB DEFAULT '{
              "language": "en",
              "country": "United States",
              "currency": "USD",
              "timezone": "UTC"
            }';
          END IF;
        END
        $$;
      `;
      
      console.log('✅ Customer settings columns added');
    } else {
      console.log('✅ Customer settings columns already exist');
    }
  } catch (error) {
    console.error('❌ Error ensuring customer settings columns:', error);
    throw error;
  }
}

// Helper function to ensure a customer record exists for a user
export async function ensureCustomerExists(userId: number, userData: any = null): Promise<number | null> {
  try {
    console.log(`Ensuring customer exists for user ID: ${userId}`);
    
    // Check if customer already exists for this user
    const existingCustomer = await sql`
      SELECT id FROM customers 
      WHERE user_id = ${userId}
    `;
    
    if (existingCustomer.length > 0) {
      console.log(`Customer already exists for user ID ${userId} with customer ID: ${existingCustomer[0].id}`);
      return Number(existingCustomer[0].id);
    }
    
    // If no customer exists, create one
    console.log(`No customer found for user ID ${userId}, creating new customer record`);
    
    // Get user data if not provided
    let user = userData;
    if (!user) {
      const userResult = await sql`
        SELECT name, email FROM users 
        WHERE id = ${userId}
      `;
      
      if (userResult.length === 0) {
        console.error(`User with ID ${userId} not found`);
        return null;
      }
      
      user = userResult[0];
    }

    // Derive a non-generic fallback name when missing
    const deriveFallbackName = (u: any, idNum: number): string => {
      const rawName = (u && typeof u.name === 'string') ? u.name.trim() : '';
      if (rawName && !/^loyalty\s*customer$/i.test(rawName) && !/^customer$/i.test(rawName)) return rawName;
      const email: string = (u && typeof u.email === 'string') ? u.email : '';
      if (email && email.includes('@')) {
        const local = email.split('@')[0];
        if (local) {
          const pretty = local
            .replace(/[._-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (m) => m.toUpperCase());
          if (pretty.length > 0) return pretty;
        }
      }
      return `Customer ${idNum}`;
    };

    const resolvedName = deriveFallbackName(user, userId);
    
    // Create customer record
    const result = await sql`
      INSERT INTO customers (
        user_id, 
        name, 
        email,
        notification_preferences,
        regional_settings,
        joined_at,
        created_at,
        updated_at
      ) VALUES (
        ${userId},
        ${resolvedName},
        ${user.email},
        ${{
          email: true,
          push: true,
          sms: false,
          promotions: true,
          rewards: true,
          system: true
        }}::jsonb,
        ${{
          language: 'en',
          country: 'United States',
          currency: 'USD',
          timezone: 'UTC'
        }}::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) RETURNING id
    `;
    
    if (result.length > 0) {
      console.log(`Created new customer with ID ${result[0].id} for user ID ${userId}`);
      return Number(result[0].id);
    }
    
    return null;
  } catch (error) {
    console.error(`Error ensuring customer exists for user ID ${userId}:`, error);
    return null;
  }
}

// Initialize the database and ensure all tables and seed data exist
export async function initializeDatabase(): Promise<void> {
  console.log('🔧 Initializing database...');
  
  try {
    // Test database connection
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ Database connection successful:', result[0].time);
    
    try {
      // Ensure users table exists
      console.log('Creating users table...');
      await ensureUserTableExists();
      console.log('✅ Users table initialized');
    } catch (err) {
      console.error('❌ Error creating users table:', err);
    }
    
    try {
      // Ensure business tables exist
      console.log('Creating business tables...');
      await ensureBusinessTablesExist();
      console.log('✅ Business tables initialized');
    } catch (err) {
      console.error('❌ Error creating business tables:', err);
    }
    
    try {
      // Ensure QR code tables exist
      console.log('Creating QR code tables...');
      await initializeDbSchema();
      console.log('✅ QR code tables initialized');
    } catch (err) {
      console.error('❌ Error creating QR code tables:', err);
    }
    
    try {
      // Ensure customer settings columns exist
      console.log('Ensuring customer settings columns...');
      await ensureCustomerSettingsColumns();
      console.log('✅ Customer settings columns initialized');
    } catch (err) {
      console.error('❌ Error ensuring customer settings columns:', err);
    }
    
    try {
      // Ensure demo users exist
      console.log('Creating demo users...');
      await ensureDemoUsers();
      console.log('✅ Demo users initialized');
    } catch (err) {
      console.error('❌ Error creating demo users:', err);
    }
    
    try {
      // Ensure approval table exists
      console.log('Creating approval tables...');
      await ensureApprovalTableExists();
      console.log('✅ Approval tables initialized');
    } catch (err) {
      console.error('❌ Error creating approval tables:', err);
    }
    
    try {
      // Ensure system logs table exists
      console.log('Creating system logs table...');
      await ensureSystemLogsTableExists();
      console.log('✅ System logs table initialized');
    } catch (err) {
      console.error('❌ Error creating system logs table:', err);
    }
    
    try {
      // Ensure pages table exists
      console.log('Creating pages table...');
      await ensurePagesTableExists();
      console.log('✅ Pages table initialized');
    } catch (err) {
      console.error('❌ Error creating pages table:', err);
    }
    
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', error);
    }
  }
}

// Export a function to call on app startup
export default function initDb(): void {
  // Call the async function without waiting for it
  initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
  });
} 