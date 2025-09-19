import sql from '../utils/db';
import env from '../utils/env';
import { User, getUserByEmail } from './userService';
import * as cryptoUtils from '../utils/cryptoUtils';
import bcrypt from 'bcryptjs';

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
    // Import JWT dynamically to avoid SSR issues with proper error handling
    let jwt: any;
    try {
      jwt = await import('jsonwebtoken');
      // Check if the import has a default export or named exports
      if (jwt.default && typeof jwt.default.sign === 'function') {
        jwt = jwt.default;
      }
    } catch (importError) {
      console.error('Failed to import jsonwebtoken:', importError);
      throw new Error('JWT library not available');
    }
    
    // SECURITY: Validate JWT secrets are set with better error messages
    if (!env.JWT_SECRET || env.JWT_SECRET.trim() === '') {
      console.error('JWT_SECRET is not configured. Please set VITE_JWT_SECRET in your environment variables.');
      throw new Error('JWT access token secret is not configured');
    }
    
    if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.trim() === '') {
      console.error('JWT_REFRESH_SECRET is not configured. Please set VITE_JWT_REFRESH_SECRET in your environment variables.');
      throw new Error('JWT refresh token secret is not configured');
    }
    
    // Validate JWT secret lengths for security
    if (env.JWT_SECRET.length < 32) {
      console.warn('JWT_SECRET is shorter than recommended 32 characters');
    }
    
    if (env.JWT_REFRESH_SECRET.length < 32) {
      console.warn('JWT_REFRESH_SECRET is shorter than recommended 32 characters');
    }
    
    // Create token payload with proper validation
    if (!user.id) {
      throw new Error('User ID is required for token generation');
    }
    
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role || 'customer'
    };
    
    // Calculate expiry times in seconds with error handling
    let accessExpiry: number;
    let refreshExpiry: number;
    
    try {
      accessExpiry = parseJwtExpiry(env.JWT_EXPIRY);
      refreshExpiry = parseJwtExpiry(env.JWT_REFRESH_EXPIRY);
    } catch (expiryError) {
      console.error('Error parsing JWT expiry times:', expiryError);
      // Use default values if parsing fails
      accessExpiry = 3600; // 1 hour
      refreshExpiry = 604800; // 7 days
    }
    
    // Generate tokens with proper error handling
    let accessToken: string;
    let refreshToken: string;
    
    try {
      // Ensure we have the correct jwt function reference
      const signFunction = jwt.sign || jwt.default?.sign;
      if (typeof signFunction !== 'function') {
        throw new Error('JWT sign function not available');
      }
      
      accessToken = signFunction.call(jwt, payload, env.JWT_SECRET, { 
        expiresIn: env.JWT_EXPIRY,
        issuer: 'gudcity-loyalty-platform',
        audience: 'gudcity-users'
      });
      
      refreshToken = signFunction.call(jwt, payload, env.JWT_REFRESH_SECRET, { 
        expiresIn: env.JWT_REFRESH_EXPIRY,
        issuer: 'gudcity-loyalty-platform',
        audience: 'gudcity-users'
      });
    } catch (signError) {
      console.error('Error signing JWT tokens:', signError);
      throw new Error('Failed to sign authentication tokens');
    }
    
    // Store refresh token in database for validation later
    try {
      await storeRefreshToken(user.id, refreshToken, refreshExpiry);
    } catch (storeError) {
      console.error('Error storing refresh token:', storeError);
      // Don't fail token generation if storage fails, but log the error
    }
    
    console.log('✅ JWT tokens generated successfully for user:', user.id);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiry
    };
  } catch (error) {
    console.error('Error generating tokens:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('JWT secrets')) {
        throw new Error('Authentication system configuration error. Please contact administrator.');
      } else if (error.message.includes('JWT library')) {
        throw new Error('Authentication system unavailable. Please try again later.');
      } else {
        throw new Error(`Failed to generate authentication tokens: ${error.message}`);
      }
    }
    
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
    const tokenRecord = await sql.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() AND revoked = FALSE',
      [refreshToken]
    );
    
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
    await sql.query(
      'UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE token = $1',
      [refreshToken]
    );
    
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
    
    // Verify the token with issuer/audience enforcement and small clock tolerance
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users',
      clockTolerance: 5
    }) as TokenPayload;
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
 * Hash password with stronger settings and comprehensive error handling
 */
export async function hashPassword(password: string): Promise<string> {
  // Input validation
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required and must be a string');
  }

  if (password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  try {
    // SECURITY: Validate password before hashing
    const validation = validatePassword(password);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Primary method: Use bcrypt with static import
    try {
      if (!bcrypt || typeof bcrypt.genSalt !== 'function' || typeof bcrypt.hash !== 'function') {
        throw new Error('bcrypt functions not available');
      }

    // Use a higher cost factor (12-14 is recommended for security vs. performance)
      const saltRounds = 14;
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Verify the hash was created successfully
      if (!hashedPassword || typeof hashedPassword !== 'string' || hashedPassword.length === 0) {
        throw new Error('bcrypt failed to generate hash');
      }

      // Additional validation: bcrypt hashes should start with $2
      if (!hashedPassword.startsWith('$2')) {
        throw new Error('bcrypt generated invalid hash format');
      }

      console.log('✅ Password hashed successfully with bcrypt');
      return hashedPassword;

    } catch (bcryptError) {
      console.warn('bcrypt hashing failed, attempting fallback:', bcryptError);
      
      // Fallback method: Use crypto-based hashing
      try {
        if (!cryptoUtils || typeof cryptoUtils.createSha256Hash !== 'function') {
          throw new Error('Crypto utilities not available');
        }

        // Generate a cryptographically secure salt for SHA-256 fallback
        const timestamp = Date.now().toString();
        let randomValue: string;
        
        // Use crypto.randomBytes if available for secure random generation
        try {
          const crypto = await import('crypto');
          randomValue = crypto.randomBytes(16).toString('hex');
        } catch {
          // Final fallback: use performance timing (avoid Math.random)
          const performanceNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
          randomValue = (timestamp + performanceNow.toString()).slice(-16);
        }
        
        const salt = `${timestamp}_${randomValue}`;
        const saltedPassword = `${salt}:${password}`;
        
        const sha256Hash = await cryptoUtils.createSha256Hash(saltedPassword);
        const fallbackHash = `sha256:${salt}:${sha256Hash}`;

        console.warn('⚠️ Using SHA-256 fallback for password hashing');
        return fallbackHash;

      } catch (cryptoError) {
        console.error('Crypto fallback also failed:', cryptoError);
        throw new Error('All password hashing methods failed - system configuration error');
      }
    }

  } catch (error) {
    console.error('Password hashing error:', error);
    
    // Provide specific error messages for different failure modes
    if (error instanceof Error) {
      if (error.message.includes('Password validation failed')) {
        throw error; // Re-throw validation errors as-is
      } else if (error.message.includes('system configuration')) {
        throw new Error('Password hashing system is not properly configured. Please contact support.');
      } else if (error.message.includes('bcrypt')) {
        throw new Error('Password encryption service temporarily unavailable. Please try again.');
      } else {
        throw new Error(`Password hashing failed: ${error.message}`);
      }
    }
    
    throw new Error('Password hashing failed due to unknown error');
  }
}

/**
 * Verify password using bcrypt or fallback to SHA-256 with comprehensive error handling
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // Input validation
  if (!plainPassword || typeof plainPassword !== 'string') {
    console.error('Invalid plainPassword provided for verification');
    return false;
  }

  if (!hashedPassword || typeof hashedPassword !== 'string') {
    console.error('Invalid hashedPassword provided for verification');
    return false;
  }

  if (plainPassword.length === 0) {
    console.error('Empty password provided for verification');
    return false;
  }

  if (hashedPassword.length === 0) {
    console.error('Empty hash provided for verification');
    return false;
  }

  try {
    // Method 1: bcrypt verification (starts with $2a$, $2b$, etc.)
    if (hashedPassword.startsWith('$2')) {
      try {
        if (!bcrypt || typeof bcrypt.compare !== 'function') {
          console.error('bcrypt compare function not available');
      return false;
    }

        const isValid = await bcrypt.compare(plainPassword, hashedPassword);
        console.log('✅ Password verified with bcrypt:', isValid ? 'valid' : 'invalid');
        return isValid;

      } catch (bcryptError) {
        console.error('bcrypt password verification failed:', bcryptError);
        return false;
      }
    }

    // Method 2: SHA-256 with salt verification (our fallback format: sha256:salt:hash)
    if (hashedPassword.startsWith('sha256:')) {
      try {
        const parts = hashedPassword.split(':');
        if (parts.length !== 3) {
          console.error('Invalid SHA-256 hash format');
          return false;
        }

        const [, salt, hash] = parts;
        if (!salt || !hash) {
          console.error('Missing salt or hash in SHA-256 format');
          return false;
        }

        const saltedPassword = `${salt}:${plainPassword}`;
        const computedHash = await cryptoUtils.createSha256Hash(saltedPassword);
        const isValid = computedHash === hash;
        
        console.log('✅ Password verified with SHA-256 fallback:', isValid ? 'valid' : 'invalid');
        return isValid;

      } catch (sha256Error) {
        console.error('SHA-256 fallback verification failed:', sha256Error);
        return false;
      }
    }

    // Method 3: Legacy SHA-256 hash (plain hash without salt)
    try {
      if (!cryptoUtils || typeof cryptoUtils.createSha256Hash !== 'function') {
        console.error('Crypto utilities not available for legacy hash verification');
        return false;
      }

      const sha256Hash = await cryptoUtils.createSha256Hash(plainPassword);
      const isValid = sha256Hash === hashedPassword;
      
      if (isValid) {
        console.warn('⚠️ Password verified with legacy SHA-256 (consider upgrading to bcrypt)');
      }
      
      return isValid;

    } catch (legacyError) {
      console.error('Legacy SHA-256 verification failed:', legacyError);
      return false;
    }

  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// Ensure the refresh_tokens table exists when module loads
(async function ensureRefreshTokensTable() {
  try {
    await sql.query(
      'CREATE TABLE IF NOT EXISTS refresh_tokens (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, token TEXT NOT NULL, expires_at TIMESTAMP NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, revoked BOOLEAN DEFAULT FALSE, revoked_at TIMESTAMP)'
    );
    console.log('Refresh tokens table initialized');
  } catch (error) {
    console.error('Error creating refresh tokens table:', error);
  }
})();

export default {
  generateTokens,
  refreshTokens,
  verifyToken,
  revokeAllUserTokens,
  hashPassword,
  verifyPassword,
  checkRateLimit,
  resetRateLimit,
  validatePassword
}; 