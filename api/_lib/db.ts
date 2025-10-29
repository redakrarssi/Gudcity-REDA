import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon for serverless functions
neonConfig.fetchConnectionCache = true;

// Server-only database URL (no VITE_ prefix)
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for serverless functions');
}

// Create database connection
const sql = neon(DATABASE_URL);

// Connection health check
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as connected`;
    return result && result.length > 0 && result[0].connected === 1;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Transaction support for serverless functions
export async function withTransaction<T>(
  callback: (sqlClient: any) => Promise<T>
): Promise<T> {
  await sql`BEGIN`;
  try {
    const result = await callback(sql);
    await sql`COMMIT`;
    return result;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}

// Export the sql client
export default sql;

// Row type for type safety
export interface SqlRow {
  [key: string]: string | number | boolean | Date | null | undefined | object | any[];
}
