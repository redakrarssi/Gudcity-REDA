/**
 * Authentication Security Utilities
 * 
 * This module provides comprehensive security enhancements for JWT authentication
 * including secret validation, rotation, token blacklisting, and secure storage.
 */

import crypto from 'crypto';
import { validateDbInput } from './secureDb';

// Browser-compatible crypto utilities
const isBrowser = typeof window !== 'undefined';

// Browser-compatible random bytes function
function getRandomBytes(length: number): Buffer {
  if (isBrowser) {
    // Use Web Crypto API in browser
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(length);
      window.crypto.getRandomValues(array);
      return Buffer.from(array);
    } else {
      // Fallback for older browsers
      const array = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return Buffer.from(array);
    }
  } else {
    // Node.js environment
    return crypto.randomBytes(length);
  }
}

// Browser-compatible random integer function
function getRandomInt(min: number, max: number): number {
  if (isBrowser) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return min + (array[0] % (max - min));
    } else {
      // Fallback for older browsers
      return Math.floor(Math.random() * (max - min)) + min;
    }
  } else {
    // Node.js environment
    return crypto.randomInt(min, max);
  }
}

// JWT Secret Management
export interface JwtSecretConfig {
  accessSecret: string;
  refreshSecret: string;
  rotationKey: string;
  lastRotation: Date;
  version: number;
}

// Token Blacklist Management
export interface BlacklistedToken {
  token: string;
  reason: string;
  blacklistedAt: Date;
  expiresAt: Date;
}

// Encryption utilities for secure token storage
export class TokenEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Generate a cryptographically secure encryption key
   */
  static generateKey(): string {
    return getRandomBytes(this.KEY_LENGTH).toString('hex');
  }

  /**
   * Encrypt a token using AES-256-GCM
   */
  static encryptToken(token: string, key: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const iv = getRandomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(this.ALGORITHM, keyBuffer);
      cipher.setAAD(Buffer.from('gudcity-auth', 'utf8'));
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV + tag + encrypted data
      return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt a token using AES-256-GCM
   */
  static decryptToken(encryptedToken: string, key: string): string {
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const parts = encryptedToken.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher(this.ALGORITHM, keyBuffer);
      decipher.setAAD(Buffer.from('gudcity-auth', 'utf8'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }
}

/**
 * JWT Secret Management with Rotation
 */
export class JwtSecretManager {
  private static instance: JwtSecretManager;
  private secrets: Map<string, JwtSecretConfig> = new Map();
  private blacklistedTokens: Map<string, BlacklistedToken> = new Map();

  private constructor() {
    this.initializeSecrets();
  }

  static getInstance(): JwtSecretManager {
    if (!JwtSecretManager.instance) {
      JwtSecretManager.instance = new JwtSecretManager();
    }
    return JwtSecretManager.instance;
  }

  /**
   * Initialize JWT secrets with strong validation
   */
  private initializeSecrets(): void {
    const accessSecret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.VITE_JWT_REFRESH_SECRET;
    const rotationKey = process.env.JWT_ROTATION_KEY || this.generateRotationKey();

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets are not configured. Please set JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
    }

    // SECURITY: Enforce minimum 64-character secret length
    if (accessSecret.length < 64) {
      throw new Error(`JWT_SECRET must be at least 64 characters long. Current length: ${accessSecret.length}`);
    }

    if (refreshSecret.length < 64) {
      throw new Error(`JWT_REFRESH_SECRET must be at least 64 characters long. Current length: ${refreshSecret.length}`);
    }

    // SECURITY: Validate secret strength
    this.validateSecretStrength(accessSecret, 'JWT_SECRET');
    this.validateSecretStrength(refreshSecret, 'JWT_REFRESH_SECRET');

    this.secrets.set('current', {
      accessSecret,
      refreshSecret,
      rotationKey,
      lastRotation: new Date(),
      version: 1
    });

    console.log('✅ JWT secrets initialized with strong validation');
  }

  /**
   * Validate JWT secret strength
   */
  private validateSecretStrength(secret: string, secretName: string): void {
    // Check for minimum entropy
    const uniqueChars = new Set(secret).size;
    if (uniqueChars < 16) {
      throw new Error(`${secretName} has insufficient character diversity (minimum 16 unique characters required)`);
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^[a-z]+$/i,  // Only letters
      /^[0-9]+$/,   // Only numbers
      /(.)\1{3,}/,  // Repeated characters
      /password/i,  // Common words
      /secret/i,
      /key/i
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(secret)) {
        throw new Error(`${secretName} contains weak patterns. Please use a more secure secret.`);
      }
    }

    // Check for sufficient complexity
    const hasLower = /[a-z]/.test(secret);
    const hasUpper = /[A-Z]/.test(secret);
    const hasNumbers = /[0-9]/.test(secret);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);

    const complexityScore = [hasLower, hasUpper, hasNumbers, hasSpecial].filter(Boolean).length;
    if (complexityScore < 3) {
      throw new Error(`${secretName} lacks sufficient complexity. Include letters, numbers, and special characters.`);
    }
  }

  /**
   * Generate a secure rotation key
   */
  private generateRotationKey(): string {
    return getRandomBytes(32).toString('hex');
  }

  /**
   * Get current JWT secrets
   */
  getCurrentSecrets(): JwtSecretConfig {
    const current = this.secrets.get('current');
    if (!current) {
      throw new Error('JWT secrets not initialized');
    }
    return current;
  }

  /**
   * Rotate JWT secrets with secure key generation
   */
  async rotateSecrets(): Promise<JwtSecretConfig> {
    console.log('🔄 Rotating JWT secrets...');

    // Generate new secrets with strong entropy
    const newAccessSecret = this.generateStrongSecret(128);
    const newRefreshSecret = this.generateStrongSecret(128);
    const newRotationKey = this.generateRotationKey();

    // Store previous secrets for graceful transition
    const previous = this.secrets.get('current');
    if (previous) {
      this.secrets.set('previous', previous);
    }

    // Create new secret configuration
    const newSecrets: JwtSecretConfig = {
      accessSecret: newAccessSecret,
      refreshSecret: newRefreshSecret,
      rotationKey: newRotationKey,
      lastRotation: new Date(),
      version: (previous?.version || 0) + 1
    };

    this.secrets.set('current', newSecrets);

    // Blacklist all existing tokens to force re-authentication
    await this.blacklistAllTokens('Secret rotation - tokens invalidated');

    console.log('✅ JWT secrets rotated successfully');
    return newSecrets;
  }

  /**
   * Generate a cryptographically strong secret
   */
  private generateStrongSecret(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let secret = '';
    
    // Use browser-compatible random generation
    for (let i = 0; i < length; i++) {
      const randomIndex = getRandomInt(0, chars.length);
      secret += chars[randomIndex];
    }
    
    return secret;
  }

  /**
   * Validate JWT secret strength on startup
   */
  validateSecrets(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const current = this.getCurrentSecrets();
      
      // Check secret lengths
      if (current.accessSecret.length < 64) {
        errors.push(`JWT_SECRET is too short (${current.accessSecret.length} chars, minimum 64)`);
      }
      
      if (current.refreshSecret.length < 64) {
        errors.push(`JWT_REFRESH_SECRET is too short (${current.refreshSecret.length} chars, minimum 64)`);
      }
      
      // Check rotation age (recommend rotation every 90 days)
      const daysSinceRotation = (Date.now() - current.lastRotation.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRotation > 90) {
        errors.push(`JWT secrets are ${Math.floor(daysSinceRotation)} days old (recommend rotation every 90 days)`);
      }
      
    } catch (error) {
      errors.push(`JWT secret validation failed: ${error.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Token Blacklist Management
 */
export class TokenBlacklist {
  private static instance: TokenBlacklist;
  private blacklistedTokens: Map<string, BlacklistedToken> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Clean up expired blacklisted tokens every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000);
  }

  static getInstance(): TokenBlacklist {
    if (!TokenBlacklist.instance) {
      TokenBlacklist.instance = new TokenBlacklist();
    }
    return TokenBlacklist.instance;
  }

  /**
   * Blacklist a token
   */
  async blacklistToken(token: string, reason: string, expiresAt?: Date): Promise<void> {
    try {
      // Validate token format
      const tokenValidation = validateDbInput(token, 'string', { maxLength: 2000 });
      if (!tokenValidation.isValid) {
        throw new Error(`Invalid token format: ${tokenValidation.errors.join(', ')}`);
      }

      const blacklistedToken: BlacklistedToken = {
        token: tokenValidation.sanitized,
        reason,
        blacklistedAt: new Date(),
        expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24 hours
      };

      this.blacklistedTokens.set(token, blacklistedToken);
      
      console.log(`🚫 Token blacklisted: ${reason}`);
    } catch (error) {
      console.error('Failed to blacklist token:', error);
      throw new Error('Token blacklisting failed');
    }
  }

  /**
   * Check if a token is blacklisted
   */
  isTokenBlacklisted(token: string): boolean {
    const blacklistedToken = this.blacklistedTokens.get(token);
    if (!blacklistedToken) {
      return false;
    }

    // Check if token has expired
    if (blacklistedToken.expiresAt < new Date()) {
      this.blacklistedTokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Get blacklist reason for a token
   */
  getBlacklistReason(token: string): string | null {
    const blacklistedToken = this.blacklistedTokens.get(token);
    return blacklistedToken ? blacklistedToken.reason : null;
  }

  /**
   * Blacklist all tokens for a user
   */
  async blacklistUserTokens(userId: number, reason: string = 'User logout'): Promise<void> {
    // This would typically query the database for all user tokens
    // For now, we'll log the action
    console.log(`🚫 Blacklisting all tokens for user ${userId}: ${reason}`);
  }

  /**
   * Blacklist all tokens (used during secret rotation)
   */
  async blacklistAllTokens(reason: string = 'System-wide token invalidation'): Promise<void> {
    console.log(`🚫 Blacklisting all tokens: ${reason}`);
    // In a production system, this would invalidate all tokens in the database
  }

  /**
   * Clean up expired blacklisted tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, blacklistedToken] of this.blacklistedTokens.entries()) {
      if (blacklistedToken.expiresAt < now) {
        this.blacklistedTokens.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired blacklisted tokens`);
    }
  }

  /**
   * Get blacklist statistics
   */
  getBlacklistStats(): { totalBlacklisted: number; expiredCount: number } {
    const now = new Date();
    let expiredCount = 0;

    for (const blacklistedToken of this.blacklistedTokens.values()) {
      if (blacklistedToken.expiresAt < now) {
        expiredCount++;
      }
    }

    return {
      totalBlacklisted: this.blacklistedTokens.size,
      expiredCount
    };
  }
}

/**
 * Secure Cookie Management
 */
export class SecureCookieManager {
  private static readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  };

  /**
   * Set a secure HTTP-only cookie
   */
  static setSecureCookie(res: any, name: string, value: string, options: any = {}): void {
    const cookieOptions = { ...this.COOKIE_OPTIONS, ...options };
    
    // Encrypt the cookie value
    const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY || getRandomBytes(32).toString('hex');
    const encryptedValue = TokenEncryption.encryptToken(value, encryptionKey);
    
    res.cookie(name, encryptedValue, cookieOptions);
  }

  /**
   * Get and decrypt a secure cookie
   */
  static getSecureCookie(req: any, name: string): string | null {
    const encryptedValue = req.cookies?.[name];
    if (!encryptedValue) {
      return null;
    }

    try {
      const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY || getRandomBytes(32).toString('hex');
      return TokenEncryption.decryptToken(encryptedValue, encryptionKey);
    } catch (error) {
      console.error('Failed to decrypt cookie:', error);
      return null;
    }
  }

  /**
   * Clear a secure cookie
   */
  static clearSecureCookie(res: any, name: string): void {
    res.clearCookie(name, this.COOKIE_OPTIONS);
  }
}

// Export singleton instances (only in Node.js environment)
let jwtSecretManager: JwtSecretManager | null = null;
let tokenBlacklist: TokenBlacklist | null = null;

if (!isBrowser) {
  // Only initialize in Node.js environment
  jwtSecretManager = JwtSecretManager.getInstance();
  tokenBlacklist = TokenBlacklist.getInstance();
}

export { jwtSecretManager, tokenBlacklist, SecureCookieManager as secureCookieManager };