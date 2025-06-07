import { neon, neonConfig } from '@neondatabase/serverless';
import env, { validateEnv } from './env';
import { queryCache } from './queryCache';

// Define row type for easier use in the application
export type SqlRow = Record<string, any>;

// Configure Neon
neonConfig.fetchConnectionCache = true;

// Check if database URL is available
const hasDbUrl = !!env.DATABASE_URL;

// Create SQL instance with error handling and fallback
const sql = (() => {
  // If no database URL, create a mock implementation
  if (!hasDbUrl) {
    console.warn('⚠️ No DATABASE_URL environment variable found, using mock database');
    console.warn('⚠️ Application will run with mock data. Add VITE_DATABASE_URL to your .env file for real database connections.');
    
    // Return a mock implementation that returns empty arrays or predefined data
    return async (strings: any, ...values: any[]): Promise<any[]> => {
      const query = typeof strings === 'string' ? strings : strings.join('?');
      console.log('🔶 Mock DB Query:', query, values);
      
      // For specific queries, return mock data
      if (query.includes('SELECT 1')) {
        return [{ connected: 1 }];
      }
      
      if (query.includes('users WHERE LOWER(email)')) {
        // Mock user lookup
        const email = values[0]?.toLowerCase();
        if (email === 'admin@gudcity.com') {
          return [{
            id: 1,
            name: 'Admin User',
            email: 'admin@gudcity.com',
            password: 'a4def47bd16d0a847e2cdf3d2e828bc9594c3e12e57398e45c59fa943dfa61a0', // SHA-256 hash of 'password'
            role: 'admin',
            user_type: 'customer',
            created_at: new Date()
          }];
        }
      }
      
      // Default mock response
      return [];
    };
  }
  
  // If we have a database URL, use real implementation
  try {
    console.log('✅ Database URL configured from environment variables');
    const instance = neon(env.DATABASE_URL);
    
    try {
      validateEnv();
      console.log('✅ Database configuration validated');
      return instance;
    } catch (error) {
      console.error('⚠️ Error validating environment variables:', error);
      return instance;
    }
  } catch (error) {
    console.error('❌ Critical error initializing database connection:', error);
    
    // Return a function that logs errors and returns empty arrays
    return async () => {
      console.error('❌ Attempted to execute SQL query but database connection failed');
      return [];
    };
  }
})();

// Export a verification function to check database connectivity
export const verifyConnection = async (): Promise<boolean> => {
  try {
    const result = await sql`SELECT 1 as connected`;
    return result && result.length > 0 && result[0].connected === 1;
  } catch (error) {
    console.error('❌ Database connection verification failed:', error);
    return false;
  }
};

export default sql; 