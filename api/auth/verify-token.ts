/**
 * Vercel Serverless API: Verify JWT Token
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

// SERVER-SIDE ONLY: Access database without VITE_ prefix
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const JWT_SECRET = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not configured on backend');
}

if (!JWT_SECRET) {
  console.error('JWT_SECRET not configured on backend');
}

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

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

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT secret not configured' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false,
        valid: false,
        error: 'Token is required' 
      });
    }

    // Verify the token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(200).json({ 
        success: true,
        valid: false,
        error: 'Invalid token' 
      });
    }

    // Check if token is blacklisted
    if (decoded.jti) {
      const blacklistedToken = await sql`
        SELECT id FROM auth_tokens 
        WHERE jti = ${decoded.jti} AND revoked = true
      `;

      if (blacklistedToken.length > 0) {
        return res.status(200).json({ 
          success: true,
          valid: false,
          error: 'Token has been revoked' 
        });
      }
    }

    // Check if token exists and is not expired
    if (decoded.jti) {
      const tokenRecord = await sql`
        SELECT user_id, token_type, expires_at 
        FROM auth_tokens 
        WHERE jti = ${decoded.jti} AND token_type = 'access' AND expires_at > NOW()
      `;

      if (tokenRecord.length === 0) {
        return res.status(200).json({ 
          success: true,
          valid: false,
          error: 'Token expired or invalid' 
        });
      }
    }

    // Get user information to ensure user still exists and is active
    const users = await sql`
      SELECT id, email, name, user_type, role, status
      FROM users 
      WHERE id = ${decoded.userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(200).json({ 
        success: true,
        valid: false,
        error: 'User not found' 
      });
    }

    const user = users[0];

    // Check if user is banned or suspended
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(200).json({ 
        success: true,
        valid: false,
        error: 'Account is banned or suspended' 
      });
    }

    const payload: TokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      jti: decoded.jti,
      iat: decoded.iat,
      exp: decoded.exp
    };

    return res.status(200).json({
      success: true,
      valid: true,
      payload
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ 
      success: false,
      valid: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
