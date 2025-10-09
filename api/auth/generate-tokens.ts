/**
 * Vercel Serverless API: Generate JWT Tokens
 * This endpoint generates access and refresh tokens for authenticated users
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

// SERVER-SIDE ONLY: Access secrets without VITE_ prefix
const JWT_SECRET = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.VITE_JWT_REFRESH_SECRET;
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// JWT expiry times - INCREASED for better user experience
const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h'; // Increased from 1h to 8h
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d'; // Increased from 7d to 30d

/**
 * Parse JWT expiry string to seconds
 */
function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 3600; // Default 1 hour
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 3600;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const origin = req.headers.origin || req.headers.referer || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check configuration
  if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET not configured');
    return res.status(500).json({ 
      success: false,
      error: 'JWT access token secret is not configured' 
    });
  }

  if (!JWT_REFRESH_SECRET) {
    console.error('❌ JWT_REFRESH_SECRET not configured');
    return res.status(500).json({ 
      success: false,
      error: 'JWT refresh token secret is not configured' 
    });
  }

  try {
    const { userId, email, role } = req.body;

    // Validate input
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID is required for token generation' 
      });
    }

    if (!email) {
      return res.status(400).json({ 
        success: false,
        error: 'User email is required for token generation' 
      });
    }

    // Create token payload
    const payload = {
      userId,
      email,
      role: role || 'customer',
      iat: Math.floor(Date.now() / 1000)
    };

    // Generate access token
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users'
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRY,
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users'
    });

    // Store refresh token in database if available
    if (sql) {
      try {
        const refreshExpiry = parseExpiryToSeconds(JWT_REFRESH_EXPIRY);
        const expiresAt = new Date(Date.now() + refreshExpiry * 1000).toISOString();
        
        await sql`
          INSERT INTO refresh_tokens (user_id, token, expires_at)
          VALUES (${userId}, ${refreshToken}, ${expiresAt})
          ON CONFLICT (user_id) DO UPDATE 
          SET token = ${refreshToken}, expires_at = ${expiresAt}, updated_at = NOW()
        `;
      } catch (error) {
        console.error('Warning: Failed to store refresh token:', error);
        // Non-fatal - tokens are still valid
      }
    }

    console.log('✅ JWT tokens generated successfully for user:', userId);

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: parseExpiryToSeconds(JWT_EXPIRY)
      }
    });

  } catch (error) {
    console.error('Error generating tokens:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate authentication tokens',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

