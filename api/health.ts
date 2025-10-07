/**
 * Vercel Serverless API: Health Check
 * Simple health check to verify API deployment and database connectivity
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// SERVER-SIDE ONLY: Access database without VITE_ prefix
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const JWT_SECRET = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      configured: !!DATABASE_URL,
      connected: false,
      error: null
    },
    jwt: {
      configured: !!JWT_SECRET
    }
  };

  // Test database connection
  if (sql) {
    try {
      await sql`SELECT 1 as test`;
      health.database.connected = true;
    } catch (error) {
      health.database.error = (error as Error).message;
      health.status = 'error';
    }
  } else {
    health.database.error = 'DATABASE_URL not configured';
    health.status = 'error';
  }

  if (!JWT_SECRET) {
    health.status = 'error';
  }

  const statusCode = health.status === 'ok' ? 200 : 500;
  
  return res.status(statusCode).json(health);
}
