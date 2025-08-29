/**
 * Client-Safe Authentication Service
 * Provides authentication functionality for client-side use without exposing server secrets
 * This file follows reda.md rules by not modifying core authentication logic
 */

import { User } from './userService';

// Client-safe interfaces
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
 * SECURITY: Enhanced password policy validation (client-safe)
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
 * Client-side token validation (without secret verification)
 * Only validates token format and expiration
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic JWT format validation (without secret verification)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // Decode header and payload (without verification)
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract user information from token (without verification)
 * Only for display purposes, not for authentication
 */
export function extractUserFromToken(token: string): TokenPayload | null {
  if (!validateTokenFormat(token)) {
    return null;
  }
  
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired (client-side only)
 */
export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    if (payload.exp) {
      return payload.exp < Date.now() / 1000;
    }
    
    return false;
  } catch (error) {
    return true;
  }
}

/**
 * Client-side rate limiting for login attempts
 */
interface ClientRateLimitEntry {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

const clientLoginAttempts: Record<string, ClientRateLimitEntry> = {};

export function checkClientRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: number;
} {
  const now = Date.now();
  const entry = clientLoginAttempts[identifier];
  
  if (!entry) {
    return { allowed: true, remainingAttempts: 5 };
  }
  
  // Check if account is locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { 
      allowed: false, 
      remainingAttempts: 0, 
      lockedUntil: entry.lockedUntil 
    };
  }
  
  // Reset if window has passed
  if (now > entry.resetAt) {
    delete clientLoginAttempts[identifier];
    return { allowed: true, remainingAttempts: 5 };
  }
  
  const remainingAttempts = Math.max(0, 5 - entry.count);
  
  return {
    allowed: entry.count < 5,
    remainingAttempts
  };
}

export function recordClientLoginAttempt(identifier: string): void {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const lockoutDuration = 30 * 60 * 1000; // 30 minutes
  
  let entry = clientLoginAttempts[identifier];
  
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + windowMs
    };
  }
  
  entry.count++;
  
  // Lock account after 5 failed attempts
  if (entry.count >= 5) {
    entry.lockedUntil = now + lockoutDuration;
  }
  
  clientLoginAttempts[identifier] = entry;
}

/**
 * Clear client rate limiting for successful login
 */
export function clearClientRateLimit(identifier: string): void {
  delete clientLoginAttempts[identifier];
}

/**
 * Get client rate limit status
 */
export function getClientRateLimitStatus(identifier: string): {
  attempts: number;
  remaining: number;
  lockedUntil?: number;
  resetAt: number;
} {
  const entry = clientLoginAttempts[identifier];
  
  if (!entry) {
    return { attempts: 0, remaining: 5, resetAt: Date.now() + (15 * 60 * 1000) };
  }
  
  return {
    attempts: entry.count,
    remaining: Math.max(0, 5 - entry.count),
    lockedUntil: entry.lockedUntil,
    resetAt: entry.resetAt
  };
}

// Clean up client rate limiting entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Object.keys(clientLoginAttempts).forEach(key => {
      const entry = clientLoginAttempts[key];
      if (entry.resetAt < now && (!entry.lockedUntil || entry.lockedUntil < now)) {
        delete clientLoginAttempts[key];
      }
    });
  }, 60000); // Clean up every minute
}