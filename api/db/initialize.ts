/**
 * Vercel Serverless API: Database Initialization
 * This runs on the backend to initialize database tables
 * Call this once during deployment or manually when needed
 */
import type { VercelRequest, VercelResponse} from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// SERVER-SIDE ONLY: Access database without VITE_ prefix
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Require admin authentication in production
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_INIT_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const results = [];

    // Create users table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          user_type VARCHAR(50) DEFAULT 'customer',
          role VARCHAR(50) DEFAULT 'customer',
          status VARCHAR(50) DEFAULT 'active',
          phone VARCHAR(50),
          address TEXT,
          business_name VARCHAR(255),
          business_address TEXT,
          business_phone VARCHAR(50),
          tier VARCHAR(50) DEFAULT 'bronze',
          loyalty_points INTEGER DEFAULT 0,
          total_spent DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP
        )
      `;
      results.push('users table created/verified');
    } catch (error) {
      results.push(`users table error: ${(error as Error).message}`);
    }

    // Create auth_tokens table for token blacklisting
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS auth_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          jti VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          token_type VARCHAR(50) DEFAULT 'access',
          revoked BOOLEAN DEFAULT FALSE,
          revoked_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.push('auth_tokens table created/verified');
    } catch (error) {
      results.push(`auth_tokens table error: ${(error as Error).message}`);
    }

    // Create revoked_tokens table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS revoked_tokens (
          id SERIAL PRIMARY KEY,
          jti VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reason VARCHAR(255)
        )
      `;
      results.push('revoked_tokens table created/verified');
    } catch (error) {
      results.push(`revoked_tokens table error: ${(error as Error).message}`);
    }

    // Create failed_logins table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS failed_logins (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45),
          attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.push('failed_logins table created/verified');
    } catch (error) {
      results.push(`failed_logins table error: ${(error as Error).message}`);
    }

    // Create customer_interactions table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS customer_interactions (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          business_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          interaction_type VARCHAR(100),
          interaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
        )
      `;
      results.push('customer_interactions table created/verified');
    } catch (error) {
      results.push(`customer_interactions table error: ${(error as Error).message}`);
    }

    return res.status(200).json({
      message: 'Database initialization completed',
      results
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({ 
      error: 'Database initialization failed',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
