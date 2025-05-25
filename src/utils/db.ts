import { neon } from '@neondatabase/serverless';

// You'll need to load your DATABASE_URL from environment variables
// For Vite, you'd use import.meta.env.VITE_DATABASE_URL
const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined');
} else {
  console.log('Database URL is configured');
  // Log only the beginning of the URL for security
  console.log('DB URL starts with:', DATABASE_URL.substring(0, 30) + '...');
}

// Create a SQL tagged template function
const sql = neon(DATABASE_URL || '');

// Test the connection when the module loads
(async function testConnection() {
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('Database connection successful:', result);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
})();

export default sql; 