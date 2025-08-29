import sql from '../utils/db';
import env from '../utils/env';
import { User, getUserByEmail } from './userService';
import * as cryptoUtils from '../utils/cryptoUtils';

// For rate limiting
interface RateLimitEntry {
  count: number;
  resetAt: number;
  lockedUntil?: number; // Account lockout timestamp
}

// Enhanced in-memory rate limiting store with account lockout
// In a production environment, this should be replaced with Redis or another shared store
const loginAttempts: Record<string, RateLimitEntry> = {};

// Clean up rate limiting entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(loginAttempts).forEach(key => {
    if (loginAttempts[key].resetAt < now) {
      delete loginAttempts[key];
    }
  });
}, 60000); // Clean up every minute

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * SECURITY: Enhanced password policy validation
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }
  
  // SECURITY: Require complexity
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // SECURITY: Prevent common weak passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
    'monkey', 'dragon', 'master', 'football', 'baseball'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }
  
  // SECURITY: Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain more than 2 repeated characters');
  }
  
  // SECURITY: Check for sequential characters
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    errors.push('Password cannot contain sequential characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * SECURITY: Enhanced rate limit login attempts by IP address with account lockout
 */
export function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; resetAt: number; lockedUntil?: number } {
  const now = Date.now();
  const windowMs = env.RATE_LIMIT_WINDOW_MS;
  const maxAttempts = env.RATE_LIMIT_MAX;
  const lockoutDuration = 15 * 60 * 1000; // 15 minutes lockout
  
  // Initialize rate limit entry if it doesn't exist
  if (!loginAttempts[ip]) {
    loginAttempts[ip] = {
      count: 0,
      resetAt: now + windowMs
    };
  }
  
  // Check if account is locked
  if (loginAttempts[ip].lockedUntil && now < loginAttempts[ip].lockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetAt: loginAttempts[ip].lockedUntil,
      lockedUntil: loginAttempts[ip].lockedUntil
    };
  }
  
  // Reset if window has expired
  if (loginAttempts[ip].resetAt < now) {
    loginAttempts[ip] = {
      count: 0,
      resetAt: now + windowMs
    };
  }
  
  // Increment counter
  loginAttempts[ip].count++;
  
  // SECURITY: Implement progressive lockout
  if (loginAttempts[ip].count > maxAttempts) {
    // Lock account for progressively longer periods
    const lockoutMultiplier = Math.min(Math.floor(loginAttempts[ip].count / maxAttempts), 4);
    const lockoutTime = lockoutDuration * lockoutMultiplier;
    
    loginAttempts[ip].lockedUntil = now + lockoutTime;
    
    return {
      allowed: false,
      remainingAttempts: 0,
      resetAt: loginAttempts[ip].lockedUntil,
      lockedUntil: loginAttempts[ip].lockedUntil
    };
  }
  
  // Check if limit exceeded
  const allowed = loginAttempts[ip].count <= maxAttempts;
  const remainingAttempts = Math.max(0, maxAttempts - loginAttempts[ip].count);
  
  return {
    allowed,
    remainingAttempts,
    resetAt: loginAttempts[ip].resetAt
  };
}

/**
 * SECURITY: Reset rate limit for successful login
 */
export function resetRateLimit(ip: string): void {
  if (loginAttempts[ip]) {
    delete loginAttempts[ip];
  }
}

/**
 * Generate JWT tokens for authentication
 */
export async function generateTokens(user: User): Promise<AuthTokens> {
  try {
    // Import JWT dynamically to avoid SSR issues
    const jwt = await import('jsonwebtoken');
    
    // SECURITY: Validate JWT secrets are set
    if (!env.JWT_SECRET || !env.JWT_REFRESH_SECRET) {
      throw new Error('JWT secrets are not configured');
    }
    
    // Create token payload
    const payload: TokenPayload = {
      userId: user.id!,
      email: user.email,
      role: user.role || 'customer'
    };
    
    // Calculate expiry times in seconds
    const accessExpiry = parseJwtExpiry(env.JWT_EXPIRY);
    const refreshExpiry = parseJwtExpiry(env.JWT_REFRESH_EXPIRY);
    
    // Generate tokens
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });
    
    // Store refresh token in database for validation later
    await storeRefreshToken(user.id!, refreshToken, refreshExpiry);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiry
    };
  } catch (error) {
    console.error('Error generating tokens:', error);
    throw new Error('Failed to generate authentication tokens');
  }
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId: number, token: string, expiresIn: number): Promise<void> {
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
export async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  try {
    // Import JWT dynamically
    const jwt = await import('jsonwebtoken');
    
    // SECURITY: Validate JWT refresh secret is set
    if (!env.JWT_REFRESH_SECRET) {
      throw new Error('JWT refresh secret is not configured');
    }
    
    // Verify the refresh token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
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
    const user = await getUserByEmail(payload.email);
    if (!user) {
      console.error('User not found for refresh token');
      return null;
    }
    
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
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    // Import JWT dynamically
    const jwt = await import('jsonwebtoken');
    
    // SECURITY: Validate JWT secret is set
    if (!env.JWT_SECRET) {
      throw new Error('JWT secret is not configured');
    }
    
    // Verify the token
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    return payload;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: number): Promise<boolean> {
  try {
    await sql`
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = NOW()
      WHERE user_id = ${userId}
      AND revoked = FALSE
    `;
    return true;
  } catch (error) {
    console.error('Error revoking user tokens:', error);
    return false;
  }
}

/**
 * Parse JWT expiry string (like "1h", "7d") to seconds
 */
function parseJwtExpiry(expiry: string): number {
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

/**
 * Hash password with stronger settings
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // SECURITY: Validate password before hashing
    const validation = validatePassword(password);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Import bcrypt dynamically
    const bcrypt = await import('bcryptjs');
    // Use a higher cost factor (12-14 is recommended for security vs. performance)
    const salt = await bcrypt.genSalt(14);
    return bcrypt.hash(password, salt);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify password using bcrypt or fallback to SHA-256
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    // If password or hash is missing, fail the validation
    if (!plainPassword || !hashedPassword) {
      console.error('Missing password or hash during verification');
      return false;
    }

    // First try bcrypt (secure)
    try {
      // Import bcrypt dynamically to avoid SSR issues
      const bcrypt = await import('bcryptjs');
      
      // Check if it's a bcrypt hash (starts with $2a$, $2b$, etc.)
      if (hashedPassword.startsWith('$2')) {
        return await bcrypt.compare(plainPassword, hashedPassword);
      }
    } catch (bcryptError) {
      console.log('bcryptjs not available, falling back to SHA-256');
    }
    
    // Fallback to SHA-256 hash for legacy passwords
    const sha256Hash = await cryptoUtils.createSha256Hash(plainPassword);
    return sha256Hash === hashedPassword;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

// Ensure the refresh_tokens table exists when module loads
(async function ensureRefreshTokensTable() {
  try {
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
    console.log('Refresh tokens table initialized');
  } catch (error) {
    console.error('Error creating refresh tokens table:', error);
  }
})();

// Simple token generation functions for basic auth
export function generateToken(payload: { id: string | number; email: string; role: string }): string {
  // Simple token generation - in production, use proper JWT
  const tokenData = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

export function generateRefreshToken(payload: { id: string | number; email: string; role: string }): string {
  // Simple refresh token generation - in production, use proper JWT
  const tokenData = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    type: 'refresh',
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

export default {
  generateTokens,
  refreshTokens,
  verifyToken,
  revokeAllUserTokens,
  hashPassword,
  verifyPassword,
  checkRateLimit,
  resetRateLimit,
  validatePassword,
  generateToken,
  generateRefreshToken
}; 