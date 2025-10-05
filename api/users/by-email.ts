/**
 * Vercel Serverless API: Get User by Email
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// SERVER-SIDE ONLY: Access database without VITE_ prefix
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get user from database (without password)
    const users = await sql`
      SELECT 
        id, email, name, user_type, role, status,
        created_at, last_login, phone, address,
        business_name, business_address, business_phone,
        tier, loyalty_points, total_spent
      FROM users 
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data (password is not selected)
    return res.status(200).json({ user: users[0] });

  } catch (error) {
    console.error('Get user by email error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
