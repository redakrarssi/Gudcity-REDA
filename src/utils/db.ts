import { neon } from '@neondatabase/serverless';

// You'll need to load your DATABASE_URL from environment variables
// For Vite, you'd use import.meta.env.VITE_DATABASE_URL
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;

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
const neonSQL = neon(DATABASE_URL || '');

// Wrapper function with retry logic and better error reporting
const sql = async (strings: TemplateStringsArray, ...values: any[]): Promise<any> => {
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

// Test the connection when the module loads
(async function testConnection() {
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