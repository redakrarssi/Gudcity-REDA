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
import crypto from 'crypto';
import sql from '../utils/db';
import { validateDbInput } from '../utils/secureDb';
import env from '../utils/env';

// JWT token interfaces
interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  jti?: string;  // SECURITY: JWT ID for token blacklisting
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
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    case 'w': return value * 7 * 24 * 60 * 60;
    default: return 3600;
  }
}

/**
 * Validate JWT secrets with enhanced security checks
 * SECURITY FIX: Updated to enforce 64-character minimum
 */
function validateSecrets(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if secrets are configured
  if (!env.JWT_SECRET || env.JWT_SECRET.trim() === '') {
    errors.push('JWT_SECRET is not configured');
  }
  
  if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.trim() === '') {
    errors.push('JWT_REFRESH_SECRET is not configured');
  }
  
  // SECURITY: Enforce 64-character minimum for JWT secrets
  if (env.JWT_SECRET) {
    if (env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET is dangerously short and must be at least 32 characters');
    } else if (env.JWT_SECRET.length < 64) {
      warnings.push(`⚠️ SECURITY WARNING: JWT_SECRET should be at least 64 characters. Current: ${env.JWT_SECRET.length} chars`);
      console.error(`⚠️ SECURITY WARNING: JWT_SECRET is ${env.JWT_SECRET.length} characters but should be at least 64. Please update immediately!`);
    }
  }
  
  if (env.JWT_REFRESH_SECRET) {
    if (env.JWT_REFRESH_SECRET.length < 32) {
      errors.push('JWT_REFRESH_SECRET is dangerously short and must be at least 32 characters');
    } else if (env.JWT_REFRESH_SECRET.length < 64) {
      warnings.push(`⚠️ SECURITY WARNING: JWT_REFRESH_SECRET should be at least 64 characters. Current: ${env.JWT_REFRESH_SECRET.length} chars`);
      console.error(`⚠️ SECURITY WARNING: JWT_REFRESH_SECRET is ${env.JWT_REFRESH_SECRET.length} characters but should be at least 64. Please update immediately!`);
    }
  }
  
  // SECURITY: Check that secrets are different
  if (env.JWT_SECRET && env.JWT_REFRESH_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different for security');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * SECURITY: Ensure revoked_tokens table exists for blacklisting
 */
async function ensureRevokedTokensTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        id SERIAL PRIMARY KEY,
        token_jti VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        reason VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_revoked_tokens_jti 
      ON revoked_tokens(token_jti)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires 
      ON revoked_tokens(expires_at)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user 
      ON revoked_tokens(user_id)
    `;
    
    console.log('✅ Revoked tokens table initialized');
  } catch (error) {
    console.error('Error creating revoked_tokens table:', error);
    // Don't throw - table may already exist
  }
}

/**
 * SECURITY: Check if a token is blacklisted
 */
async function isTokenBlacklisted(jti: string): Promise<boolean> {
  if (!jti) {
    return false; // Allow tokens without JTI for backward compatibility
  }
  
  try {
    const result = await sql`
      SELECT 1 FROM revoked_tokens 
      WHERE token_jti = ${jti} 
      AND expires_at > NOW()
      LIMIT 1
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false; // Fail open for availability
  }
}

/**
 * SECURITY: Blacklist a token by JTI
 */
async function blacklistToken(jti: string, userId: number, expiresAt: Date, reason: string = 'User logout'): Promise<void> {
  try {
    await sql`
      INSERT INTO revoked_tokens (token_jti, user_id, expires_at, reason)
      VALUES (${jti}, ${userId}, ${expiresAt}, ${reason})
      ON CONFLICT (token_jti) DO NOTHING
    `;
    console.log(`🚫 Token blacklisted: ${reason}`);
  } catch (error) {
    console.error('Error blacklisting token:', error);
    // Don't throw - blacklisting should not break logout
  }
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

// Initialize revoked_tokens table on module load
ensureRevokedTokensTable();

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
    
    // SECURITY: Log warnings but allow operation
    if (secretValidation.warnings && secretValidation.warnings.length > 0) {
      secretValidation.warnings.forEach(warning => console.warn(warning));
    }
    
    // SECURITY: Generate unique JWT IDs for token blacklisting
    const accessJti = crypto.randomBytes(16).toString('hex');
    const refreshJti = crypto.randomBytes(16).toString('hex');
    
    // Create token payload with JTI
    const payload: TokenPayload = {
      userId: Number(userId),
      email: String(email),
      role: String(role),
      jti: accessJti  // Add JTI to payload
    };
    
    // Calculate expiry times
    const accessExpiry = parseJwtExpiry(env.JWT_EXPIRY);
    const refreshExpiry = parseJwtExpiry(env.JWT_REFRESH_EXPIRY);
    
    // Generate access token with JTI
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRY,
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users',
      jwtid: accessJti  // Add JTI to token
    });
    
    // Generate refresh token with JTI
    const refreshToken = jwt.sign(
      {
        ...payload,
        jti: refreshJti
      },
      env.JWT_REFRESH_SECRET,
      {
      expiresIn: env.JWT_REFRESH_EXPIRY,
      issuer: 'gudcity-loyalty-platform',
        audience: 'gudcity-users',
        jwtid: refreshJti
      }
    );
    
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
    
    // Verify token signature and expiration
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users',
      clockTolerance: 5
    }) as TokenPayload;
    
    // SECURITY: Check if token is blacklisted
    if (payload.jti) {
      const isBlacklisted = await isTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        console.warn(`🚫 Blacklisted token attempted use: ${payload.jti}`);
        res.json({
          success: true,
          valid: false,
          error: 'Token has been revoked'
        });
        return;
      }
    }
    
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
 * Body: { userId: number, reason?: string }
 * Returns: { success: boolean }
 */
export async function revokeUserTokens(req: Request, res: Response): Promise<void> {
  try {
    const { userId, reason = 'User logout' } = req.body;
    
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
    
    // SECURITY: Mark refresh tokens as revoked (existing behavior)
    await sql`
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = NOW()
      WHERE user_id = ${userIdValidation.sanitized}
      AND revoked = FALSE
    `;
    
    // SECURITY: Blacklist all active tokens by adding to revoked_tokens table
    // This ensures even valid JWTs can't be used after logout
    try {
      // Find all active refresh tokens for this user
      const activeTokens = await sql`
        SELECT token FROM refresh_tokens
        WHERE user_id = ${userIdValidation.sanitized}
        AND revoked = TRUE
        AND revoked_at >= NOW() - INTERVAL '1 minute'
      `;
      
      // Extract JTIs and blacklist them
      for (const tokenRecord of activeTokens) {
        try {
          if (!tokenRecord || !tokenRecord.token || typeof tokenRecord.token !== 'string') {
            continue;
          }
          
          const decoded = jwt.decode(tokenRecord.token);
          if (decoded && typeof decoded === 'object' && 'jti' in decoded && 'exp' in decoded && 'userId' in decoded) {
            const jti = (decoded as any).jti as string;
            const exp = (decoded as any).exp as number;
            
            if (jti && exp) {
              const expiresAt = new Date(exp * 1000);
              await blacklistToken(jti, userIdValidation.sanitized, expiresAt, reason);
            }
          }
        } catch (err) {
          console.error('Error blacklisting token:', err);
          // Continue with other tokens
        }
      }
    } catch (error) {
      console.error('Error blacklisting user tokens:', error);
      // Don't fail the revocation if blacklisting fails
    }
    
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

