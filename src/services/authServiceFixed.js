// Fixed implementation of authService to resolve JWT import issues

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sql from '../utils/dbFix.js';
import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRY, JWT_REFRESH_EXPIRY } from '../utils/env.js';

// In-memory rate limiting store
const loginAttempts = {};

// Clean up rate limiting entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(loginAttempts).forEach(key => {
    if (loginAttempts[key].resetAt < now) {
      delete loginAttempts[key];
    }
  });
}, 60000); // Clean up every minute

/**
 * Generate JWT tokens for authentication
 */
async function generateTokens(user) {
  try {
    // SECURITY: Validate JWT secrets are set with better error messages
    if (!JWT_SECRET || JWT_SECRET.trim() === '') {
      console.error('JWT_SECRET is not configured. Please set VITE_JWT_SECRET in your environment variables.');
      throw new Error('JWT access token secret is not configured');
    }
    
    if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.trim() === '') {
      console.error('JWT_REFRESH_SECRET is not configured. Please set VITE_JWT_REFRESH_SECRET in your environment variables.');
      throw new Error('JWT refresh token secret is not configured');
    }
    
    // Create token payload with proper validation
    if (!user.id) {
      throw new Error('User ID is required for token generation');
    }
    
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role || 'customer'
    };
    
    // Generate tokens with proper error handling
    const accessToken = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRY || '1h',
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users'
    });
    
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { 
      expiresIn: JWT_REFRESH_EXPIRY || '7d',
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users'
    });
    
    // Store refresh token in database for validation later
    try {
      // Parse the refresh token expiry
      const refreshExpiry = parseJwtExpiry(JWT_REFRESH_EXPIRY || '7d');
      await storeRefreshToken(user.id, refreshToken, refreshExpiry);
    } catch (storeError) {
      console.error('Error storing refresh token:', storeError);
      // Don't fail token generation if storage fails, but log the error
    }
    
    console.log('✅ JWT tokens generated successfully for user:', user.id);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: parseJwtExpiry(JWT_EXPIRY || '1h')
    };
  } catch (error) {
    console.error('Error generating tokens:', error);
    throw new Error(`Failed to generate authentication tokens: ${error.message}`);
  }
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId, token, expiresIn) {
  try {
    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    // Create refresh_tokens table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP
      )
    `;
    
    // Store token
    await sql`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt})
    `;
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
}

/**
 * Verify and refresh tokens
 */
async function refreshTokens(refreshToken) {
  try {
    // SECURITY: Validate JWT refresh secret is set
    if (!JWT_REFRESH_SECRET) {
      throw new Error('JWT refresh secret is not configured');
    }
    
    // Verify the refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      console.error('Invalid refresh token:', error);
      return null;
    }
    
    // Check if token is in database and not revoked
    const tokenRecord = await sql`
      SELECT * FROM refresh_tokens
      WHERE token = ${refreshToken}
      AND expires_at > NOW()
      AND revoked = FALSE
    `;
    
    if (!tokenRecord || tokenRecord.length === 0) {
      console.error('Refresh token not found or expired');
      return null;
    }
    
    // Get user
    const userResult = await sql`
      SELECT * FROM users WHERE id = ${payload.userId}
    `;
    
    if (!userResult || userResult.length === 0) {
      console.error('User not found for refresh token');
      return null;
    }
    
    const user = userResult[0];
    
    // Revoke current refresh token
    await sql`
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = NOW()
      WHERE token = ${refreshToken}
    `;
    
    // Generate new tokens
    return generateTokens(user);
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return null;
  }
}

/**
 * Verify access token
 */
function verifyToken(token) {
  try {
    // SECURITY: Validate JWT secret is set
    if (!JWT_SECRET) {
      throw new Error('JWT secret is not configured');
    }
    
    // Verify the token
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

/**
 * Parse JWT expiry string (like "1h", "7d") to seconds
 */
function parseJwtExpiry(expiry) {
  const match = expiry.match(/^(\d+)([smhdw])$/);
  if (!match) {
    return 3600; // Default to 1 hour if format is invalid
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value; // seconds
    case 'm': return value * 60; // minutes
    case 'h': return value * 60 * 60; // hours
    case 'd': return value * 24 * 60 * 60; // days
    case 'w': return value * 7 * 24 * 60 * 60; // weeks
    default: return 3600; // default to 1 hour
  }
}

export {
  generateTokens,
  refreshTokens,
  verifyToken,
  parseJwtExpiry
};
