import sql from '../utils/db';
import env from '../utils/env';
import { User } from './userService';
import * as cryptoUtils from '../utils/cryptoUtils';
import bcrypt from 'bcryptjs';
import { apiLogin, apiRegister } from './apiClient';

// MIGRATION: Feature flag to enable API-based auth (Phase 2 of migration)
// Set to true to use secure backend API, false to use direct database access
const USE_API_AUTH = true; // Enable API mode for gradual migration

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
 * REFACTORED: Now calls server-side API endpoint instead of using jsonwebtoken directly
 * This fixes the browser compatibility issue with jsonwebtoken library
 */
export async function generateTokens(user: User): Promise<AuthTokens> {
  try {
    // Validate user data
    if (!user.id) {
      throw new Error('User ID is required for token generation');
    }
    
    if (!user.email) {
      throw new Error('User email is required for token generation');
    }
    
    // Call server-side API endpoint for token generation
    const response = await fetch('/api/auth/generate-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role || 'customer'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to generate tokens');
    }
    
    console.log('✅ JWT tokens generated successfully for user:', user.id);
    
    return {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      expiresIn: data.data.expiresIn
    };
  } catch (error) {
    console.error('Error generating tokens:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      } else if (error.message.includes('configuration')) {
        throw new Error('Authentication system configuration error. Please contact administrator.');
      } else {
        throw new Error(`Failed to generate authentication tokens: ${error.message}`);
      }
    }
    
    throw new Error('Failed to generate authentication tokens');
  }
}

// Note: storeRefreshToken has been moved to server-side (authTokenHandler.ts)
// Token storage is now handled by the /api/auth/generate-tokens endpoint

/**
 * Verify and refresh tokens
 * REFACTORED: Now calls server-side API endpoint instead of using jsonwebtoken directly
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  try {
    if (!refreshToken) {
      console.error('No refresh token provided');
      return null;
    }
    
    // Call server-side API endpoint for token refresh
    const response = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken
      })
    });
    
    if (!response.ok) {
      console.error('Failed to refresh tokens:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      console.error('Token refresh failed:', data.error);
      return null;
    }
    
    console.log('✅ Tokens refreshed successfully');
    
    return {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      expiresIn: data.data.expiresIn
    };
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return null;
  }
}

/**
 * Verify access token
 * REFACTORED: Now calls server-side API endpoint instead of using jsonwebtoken directly
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    if (!token) {
      console.error('No token provided for verification');
      return null;
    }
    
    // Call server-side API endpoint for token verification
    const response = await fetch('/api/auth/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token
      })
    });
    
    if (!response.ok) {
      console.error('Failed to verify token:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.valid) {
      console.error('Token verification failed:', data.error);
      return null;
    }
    
    return data.payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Revoke all refresh tokens for a user
 * REFACTORED: Now calls server-side API endpoint
 */
export async function revokeAllUserTokens(userId: number): Promise<boolean> {
  try {
    if (!userId) {
      console.error('No user ID provided');
      return false;
    }
    
    // Call server-side API endpoint to revoke tokens
    const response = await fetch('/api/auth/revoke-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId
      })
    });
    
    if (!response.ok) {
      console.error('Failed to revoke tokens:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('Token revocation failed:', data.error);
      return false;
    }
    
    console.log('✅ All tokens revoked successfully');
    return true;
  } catch (error) {
    console.error('Error revoking user tokens:', error);
    return false;
  }
}

// Note: parseJwtExpiry has been moved to server-side (authTokenHandler.ts)
// JWT expiry parsing is now handled server-side

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
      console.error('❌ CRITICAL: bcrypt hashing failed:', bcryptError);
      
      // SECURITY FIX: DO NOT fallback to weak hashing methods like SHA-256
      // SHA-256 is NOT suitable for password hashing because:
      // 1. It's too fast - vulnerable to brute force attacks
      // 2. It doesn't have built-in salting in the standard implementation
      // 3. It's not designed for password hashing (unlike bcrypt/scrypt/argon2)
      
      // Instead of falling back, fail fast with a clear error
      console.error('❌ Password hashing system is not properly configured');
      console.error('❌ Ensure bcryptjs is properly installed: npm install bcryptjs');
      console.error('❌ This is a critical security requirement - cannot proceed with insecure fallback');
      
      throw new Error(
        'Password hashing failed: bcrypt unavailable. ' +
        'Cannot proceed with insecure fallback. ' +
        'Please ensure bcryptjs is properly installed and configured.'
      );
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

    // SECURITY FIX: Removed SHA-256 fallback methods
    // SHA-256 is NOT suitable for password hashing because:
    // 1. It's too fast - vulnerable to brute force attacks
    // 2. It doesn't have built-in salting in the standard implementation
    // 3. It's not designed for password hashing (unlike bcrypt/scrypt/argon2)
    
    // If we reach here, the password hash is not in a supported format
    console.error('❌ SECURITY: Unsupported password hash format detected');
    console.error('❌ Only bcrypt hashes are supported for security reasons');
    console.error('❌ Please reset your password to use the secure bcrypt format');
    
    return false;

  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// SECURITY FIX: Database initialization removed from client-side
// This table is created via backend API: POST /api/db/initialize
// (async function ensureRefreshTokensTable() {
//   try {
//     await sql`
//       CREATE TABLE IF NOT EXISTS refresh_tokens (
//         id SERIAL PRIMARY KEY,
//         user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         token TEXT NOT NULL,
//         expires_at TIMESTAMP NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         revoked BOOLEAN DEFAULT FALSE,
//         revoked_at TIMESTAMP
//       )
//     `;
//     console.log('Refresh tokens table initialized');
//   } catch (error) {
//     console.error('Error creating refresh tokens table:', error);
//   }
// })();

// Note: Token blacklisting, JWT secret rotation, and related security features
// have been moved to server-side only. These operations are now handled by:
// - authTokenHandler.ts (server-side token management)
// - authSecurity.ts (server-side security utilities)
// Browser-side code should use the /api/auth/* endpoints instead

/**
 * MIGRATION: API-based authentication functions with fallback
 * These functions try API first, then fall back to direct DB if API fails
 */

/**
 * Login user via API or fallback to direct DB
 */
export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  if (USE_API_AUTH) {
    try {
      console.log('[AuthService] Attempting API login for:', email);
      const response = await apiLogin({ email, password });
      console.log('[AuthService] API login successful');
      
      // Store token in localStorage
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      return {
        user: response.user as User,
        token: response.token,
      };
    } catch (error) {
      console.warn('[AuthService] API login failed, falling back to direct DB:', error);
      // Fall back to direct DB (if implemented elsewhere)
      throw error; // For now, just throw the error
    }
  } else {
    throw new Error('Direct DB login not implemented in this service. Use AuthContext.');
  }
}

/**
 * Register user via API or fallback to direct DB
 */
export async function register(userData: {
  email: string;
  password: string;
  name: string;
  user_type?: string;
  role?: string;
}): Promise<{ user: User; token: string }> {
  if (USE_API_AUTH) {
    try {
      console.log('[AuthService] Attempting API registration for:', userData.email);
      const response = await apiRegister(userData);
      console.log('[AuthService] API registration successful');
      
      // Store token in localStorage
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      return {
        user: response.user as User,
        token: response.token,
      };
    } catch (error) {
      console.warn('[AuthService] API registration failed:', error);
      throw error;
    }
  } else {
    throw new Error('Direct DB registration not implemented in this service. Use AuthContext.');
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  // Clear token from localStorage
  localStorage.removeItem('token');
  
  if (USE_API_AUTH) {
    try {
      // Call logout API to revoke token on server
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.warn('[AuthService] Logout API call failed:', error);
      // Continue anyway - token is already removed from localStorage
    }
  }
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
  // New API-based methods
  login,
  register,
  logout,
}; 