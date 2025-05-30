import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

// Define row type for easier use in the application
export interface DatabaseRow {
  [key: string]: any;
}

export interface QueryResult {
  rows: DatabaseRow[];
  rowCount: number;
}

// Direct database URL
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Configure Neon
neonConfig.fetchConnectionCache = true;

// Create a connection pool for raw queries
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;

// Mock DB functions for when no DB URL is provided
const mockSQL = async () => {
  console.log('Using mock database implementation');
  return []; // Return empty array as default
};

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined');
  // Add fallback if DATABASE_URL is missing - useful for development only
  console.warn('Using fallback database URL - for development only');
} else {
  console.log('Database URL is configured');
  // Log only the beginning of the URL for security
  console.log('DB URL starts with:', DATABASE_URL.substring(0, 30) + '...');
}

// Create a SQL tagged template function
const neonSQL = DATABASE_URL ? neon(DATABASE_URL) : mockSQL;

// Wrapper function with retry logic and better error reporting
const sqlTaggedTemplate = async (strings: TemplateStringsArray, ...values: any[]): Promise<DatabaseRow[]> => {
  if (!DATABASE_URL) {
    // Return mock data if no database URL
    return [];
  }
  
  const MAX_RETRIES = 3;
  let lastError: unknown = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await neonSQL(strings, ...values);
      if (!result) {
        console.warn('Database query returned undefined or null');
        return [];
      }
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Database query failed (attempt ${attempt}/${MAX_RETRIES}):`, error);
      
      // Don't retry on certain errors like constraint violations
      if (error && typeof error === 'object' && 'code' in error) {
        // PostgreSQL error codes starting with '23' are integrity constraint violations
        if (typeof error.code === 'string' && error.code.startsWith('23')) {
          console.log('Not retrying due to constraint violation');
          throw error;
        }
      }
      
      // Only wait between retries if we're going to retry
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000); // Exponential backoff with max 1s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we got here, all retries failed
  console.error(`All ${MAX_RETRIES} database query attempts failed`);
  throw lastError;
};

// Add a query method for raw SQL queries with parameters
const query = async (text: string, params: any[] = []): Promise<DatabaseRow[]> => {
  if (!DATABASE_URL || !pool) {
    // Return mock data if no database URL
    return [];
  }
  
  const MAX_RETRIES = 3;
  let lastError: unknown = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Use the pool to execute the query
      const result = await pool.query(text, params);
      return result.rows;
    } catch (error) {
      lastError = error;
      console.error(`Database query failed (attempt ${attempt}/${MAX_RETRIES}):`, error);
      
      // Don't retry on certain errors like constraint violations
      if (error && typeof error === 'object' && 'code' in error) {
        // PostgreSQL error codes starting with '23' are integrity constraint violations
        if (typeof error.code === 'string' && error.code.startsWith('23')) {
          console.log('Not retrying due to constraint violation');
          throw error;
        }
      }
      
      // Only wait between retries if we're going to retry
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000); // Exponential backoff with max 1s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we got here, all retries failed
  console.error(`All ${MAX_RETRIES} database query attempts failed`);
  throw lastError;
};

// Create the sql object with both methods
const sql = Object.assign(sqlTaggedTemplate, { query });

// Test the connection when the module loads
(async function testConnection() {
  if (!DATABASE_URL) {
    console.log('Skipping database connection test - no DATABASE_URL provided');
    return;
  }
  
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('Database connection successful:', result);
  } catch (error) {
    console.error('Database connection failed:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', error);
    }
  }
})();

export default sql; 