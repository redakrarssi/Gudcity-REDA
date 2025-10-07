/**
 * Vercel Serverless API: Generate JWT Tokens
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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

// JWT token interfaces
interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Parse JWT expiry string (like "1h", "7d") to seconds
 */
function parseJwtExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhdw])$/);
  if (!match) {
    return 3600; // Default to 1 hour
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    case 'w': return value * 604800;
    default: return 3600;
  }
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
    const { userId, email, role } = req.body;

    if (!userId || !email || !role) {
      return res.status(400).json({ error: 'User ID, email, and role are required' });
    }

    // Generate JTI for token blacklisting
    const jti = crypto.randomBytes(16).toString('hex');
    
    // Token expiry configuration
    const accessTokenExpiry = '24h';
    const refreshTokenExpiry = '7d';
    const accessTokenExpiresIn = parseJwtExpiry(accessTokenExpiry);
    const refreshTokenExpiresIn = parseJwtExpiry(refreshTokenExpiry);

    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: Number(userId),
        email,
        role,
        jti,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: accessTokenExpiry }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        userId: Number(userId),
        email,
        role,
        jti,
        type: 'refresh'
      },
      JWT_SECRET,
      { expiresIn: refreshTokenExpiry }
    );

    // Store tokens in database for blacklist checking
    try {
      await sql`
        INSERT INTO auth_tokens (user_id, token, jti, expires_at, token_type)
        VALUES 
          (${userId}, ${accessToken}, ${jti}, NOW() + INTERVAL '${accessTokenExpiry}', 'access'),
          (${userId}, ${refreshToken}, ${jti}, NOW() + INTERVAL '${refreshTokenExpiry}', 'refresh')
        ON CONFLICT (jti) DO NOTHING
      `;
    } catch (error) {
      console.error('Error storing tokens:', error);
      // Continue anyway - tokens are still valid
    }

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiresIn
    };

    return res.status(200).json({
      success: true,
      data: tokens
    });

  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
