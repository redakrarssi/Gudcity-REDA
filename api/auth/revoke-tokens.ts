/**
 * Vercel Serverless API: Revoke JWT Tokens
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// SERVER-SIDE ONLY: Access database without VITE_ prefix
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not configured on backend');
}

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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Revoke all tokens for the user
    const result = await sql`
      UPDATE auth_tokens 
      SET revoked = true, revoked_at = NOW() 
      WHERE user_id = ${userId} AND revoked = false
    `;

    console.log(`Revoked tokens for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'All tokens revoked successfully'
    });

  } catch (error) {
    console.error('Token revocation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
