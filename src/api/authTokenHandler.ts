/**
 * Server-side Authentication Token Handler
 * 
 * This API endpoint handles JWT token generation on the server side.
 * JWT operations should NEVER run in the browser due to:
 * 1. Security concerns (secret exposure)
 * 2. Library compatibility (jsonwebtoken is Node.js only)
 * 3. Performance (cryptographic operations)
 * 
 * Following reda.md security guidelines for server-side authentication
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import sql from '../utils/db';
import { validateDbInput } from '../utils/secureDb';
import env from '../utils/env';

// JWT token interfaces
interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface AuthTokens {
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
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    case 'w': return value * 7 * 24 * 60 * 60;
    default: return 3600;
  }
}

/**
 * Validate JWT secrets
 */
function validateSecrets(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!env.JWT_SECRET || env.JWT_SECRET.trim() === '') {
    errors.push('JWT_SECRET is not configured');
  }
  
  if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.trim() === '') {
    errors.push('JWT_REFRESH_SECRET is not configured');
  }
  
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long');
  }
  
  if (env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET should be at least 32 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId: number, token: string, expiresIn: number): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  
  // Validate inputs
  const userIdValidation = validateDbInput(userId, 'number');
  const tokenValidation = validateDbInput(token, 'string', { maxLength: 1000 });
  
  if (!userIdValidation.isValid || !tokenValidation.isValid) {
    throw new Error('Invalid token storage parameters');
  }
  
  await sql`
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES (${userIdValidation.sanitized}, ${tokenValidation.sanitized}, ${expiresAt})
  `;
}

/**
 * Generate JWT tokens for a user
 * POST /api/auth/generate-tokens
 * 
 * Body: { userId: number, email: string, role: string }
 * Returns: { accessToken, refreshToken, expiresIn }
 */
export async function generateTokens(req: Request, res: Response): Promise<void> {
  try {
    const { userId, email, role } = req.body;
    
    // Validate input
    if (!userId || !email || !role) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, email, role'
      });
      return;
    }
    
    // Validate secrets
    const secretValidation = validateSecrets();
    if (!secretValidation.isValid) {
      console.error('JWT secret validation failed:', secretValidation.errors);
      res.status(500).json({
        success: false,
        error: 'Authentication system configuration error'
      });
      return;
    }
    
    // Create token payload
    const payload: TokenPayload = {
      userId: Number(userId),
      email: String(email),
      role: String(role)
    };
    
    // Calculate expiry times
    const accessExpiry = parseJwtExpiry(env.JWT_EXPIRY);
    const refreshExpiry = parseJwtExpiry(env.JWT_REFRESH_EXPIRY);
    
    // Generate tokens
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRY,
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users'
    });
    
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users'
    });
    
    // Store refresh token
    await storeRefreshToken(Number(userId), refreshToken, refreshExpiry);
    
    console.log(`✅ JWT tokens generated for user ${userId} (${email})`);
    
    // Return tokens
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: accessExpiry
      }
    });
    
  } catch (error) {
    console.error('Error generating tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication tokens'
    });
  }
}

/**
 * Verify access token
 * POST /api/auth/verify-token
 * 
 * Body: { token: string }
 * Returns: { valid: boolean, payload?: TokenPayload }
 */
export async function verifyToken(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token is required'
      });
      return;
    }
    
    // Verify token
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users',
      clockTolerance: 5
    }) as TokenPayload;
    
    res.json({
      success: true,
      valid: true,
      payload
    });
    
  } catch (error) {
    console.error('Token verification failed:', error);
    res.json({
      success: true,
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token'
    });
  }
}

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh-token
 * 
 * Body: { refreshToken: string }
 * Returns: { accessToken, refreshToken, expiresIn }
 */
export async function refreshTokens(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
      return;
    }
    
    // Verify refresh token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
      return;
    }
    
    // Check if token exists in database and is not revoked
    const tokenValidation = validateDbInput(refreshToken, 'string', { maxLength: 1000 });
    if (!tokenValidation.isValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token format'
      });
      return;
    }
    
    const tokenRecord = await sql`
      SELECT * FROM refresh_tokens
      WHERE token = ${tokenValidation.sanitized}
      AND expires_at > NOW()
      AND revoked = FALSE
      LIMIT 1
    `;
    
    if (tokenRecord.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Refresh token not found or expired'
      });
      return;
    }
    
    // Revoke old refresh token
    await sql`
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = NOW()
      WHERE token = ${tokenValidation.sanitized}
    `;
    
    // Generate new tokens
    const accessExpiry = parseJwtExpiry(env.JWT_EXPIRY);
    const refreshExpiry = parseJwtExpiry(env.JWT_REFRESH_EXPIRY);
    
    const newAccessToken = jwt.sign(
      { userId: payload.userId, email: payload.email, role: payload.role },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRY,
        issuer: 'gudcity-loyalty-platform',
        audience: 'gudcity-users'
      }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: payload.userId, email: payload.email, role: payload.role },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: env.JWT_REFRESH_EXPIRY,
        issuer: 'gudcity-loyalty-platform',
        audience: 'gudcity-users'
      }
    );
    
    // Store new refresh token
    await storeRefreshToken(payload.userId, newRefreshToken, refreshExpiry);
    
    console.log(`✅ Tokens refreshed for user ${payload.userId}`);
    
    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: accessExpiry
      }
    });
    
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh tokens'
    });
  }
}

/**
 * Revoke all refresh tokens for a user (logout)
 * POST /api/auth/revoke-tokens
 * 
 * Body: { userId: number }
 * Returns: { success: boolean }
 */
export async function revokeUserTokens(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }
    
    const userIdValidation = validateDbInput(userId, 'number');
    if (!userIdValidation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
      return;
    }
    
    await sql`
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = NOW()
      WHERE user_id = ${userIdValidation.sanitized}
      AND revoked = FALSE
    `;
    
    console.log(`✅ All tokens revoked for user ${userId}`);
    
    res.json({
      success: true,
      message: 'All tokens revoked successfully'
    });
    
  } catch (error) {
    console.error('Error revoking tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke tokens'
    });
  }
}

export default {
  generateTokens,
  verifyToken,
  refreshTokens,
  revokeUserTokens
};

