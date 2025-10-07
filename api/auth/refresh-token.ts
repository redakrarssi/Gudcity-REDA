/**
 * Vercel Serverless API: Refresh JWT Token
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify the refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if token is blacklisted
    const blacklistedToken = await sql`
      SELECT id FROM auth_tokens 
      WHERE jti = ${decoded.jti} AND revoked = true
    `;

    if (blacklistedToken.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Check if token exists and is not expired
    const tokenRecord = await sql`
      SELECT user_id, token_type, expires_at 
      FROM auth_tokens 
      WHERE jti = ${decoded.jti} AND token_type = 'refresh' AND expires_at > NOW()
    `;

    if (tokenRecord.length === 0) {
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    // Get user information
    const users = await sql`
      SELECT id, email, name, user_type, role, status
      FROM users 
      WHERE id = ${decoded.userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0];

    // Check if user is banned or suspended
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is banned or suspended' });
    }

    // Generate new JTI for new tokens
    const newJti = crypto.randomBytes(16).toString('hex');
    
    // Token expiry configuration
    const accessTokenExpiry = '24h';
    const refreshTokenExpiry = '7d';
    const accessTokenExpiresIn = parseJwtExpiry(accessTokenExpiry);

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || user.user_type,
        jti: newJti,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: accessTokenExpiry }
    );

    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || user.user_type,
        jti: newJti,
        type: 'refresh'
      },
      JWT_SECRET,
      { expiresIn: refreshTokenExpiry }
    );

    // Revoke old tokens and store new ones
    try {
      await sql`
        UPDATE auth_tokens 
        SET revoked = true, revoked_at = NOW() 
        WHERE jti = ${decoded.jti}
      `;

      await sql`
        INSERT INTO auth_tokens (user_id, token, jti, expires_at, token_type)
        VALUES 
          (${user.id}, ${newAccessToken}, ${newJti}, NOW() + INTERVAL '${accessTokenExpiry}', 'access'),
          (${user.id}, ${newRefreshToken}, ${newJti}, NOW() + INTERVAL '${refreshTokenExpiry}', 'refresh')
        ON CONFLICT (jti) DO NOTHING
      `;
    } catch (error) {
      console.error('Error updating tokens:', error);
      // Continue anyway - tokens are still valid
    }

    const tokens: AuthTokens = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: accessTokenExpiresIn
    };

    return res.status(200).json({
      success: true,
      data: tokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
