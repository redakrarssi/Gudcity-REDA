import { neon } from '@neondatabase/serverless';

// SERVER-SIDE ONLY: Resolve DB URL (support local dev fallbacks too)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  // Local dev fallbacks (not recommended for production)
  process.env.VITE_DATABASE_URL ||
  process.env.VITE_POSTGRES_URL;

export function getSql() {
  if (!DATABASE_URL) return null as any;
  try {
    return neon(DATABASE_URL);
  } catch (e) {
    return null as any;
  }
}

export function requireSql() {
  const sql = getSql();
  if (!sql) {
    throw new Error('Database not configured');
  }
  return sql;
}

