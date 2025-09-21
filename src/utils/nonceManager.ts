/**
 * Nonce Management System
 * 
 * This module provides secure nonce generation and management for
 * Content Security Policy (CSP) enforcement. It ensures that only
 * scripts and styles with valid nonces can execute, preventing
 * XSS attacks through inline code injection.
 * 
 * Following reda.md rules:
 * - Safe to modify: This is a new utility for security enhancement
 * - No core business logic modification
 * - Enhances existing security without disrupting functionality
 */

import crypto from 'crypto';

export interface NonceConfig {
  length: number;
  encoding: 'base64' | 'hex' | 'base64url';
  expiration: number; // in milliseconds
  maxNonces: number; // maximum nonces to store
}

export interface NonceEntry {
  nonce: string;
  type: 'script' | 'style';
  createdAt: number;
  expiresAt: number;
  used: boolean;
  requestId?: string;
}

// Default nonce configuration
const DEFAULT_CONFIG: NonceConfig = {
  length: 16,
  encoding: 'base64',
  expiration: 300000, // 5 minutes
  maxNonces: 1000
};

/**
 * Nonce Manager Class
 * 
 * Manages nonce generation, validation, and cleanup for CSP enforcement
 */
export class NonceManager {
  private nonces: Map<string, NonceEntry> = new Map();
  private config: NonceConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<NonceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Generate a cryptographically secure nonce
   */
  generateNonce(type: 'script' | 'style', requestId?: string): string {
    try {
      const nonce = crypto.randomBytes(this.config.length).toString(this.config.encoding);
      const now = Date.now();
      
      const entry: NonceEntry = {
        nonce,
        type,
        createdAt: now,
        expiresAt: now + this.config.expiration,
        used: false,
        requestId
      };

      // Store the nonce
      this.nonces.set(nonce, entry);

      // Cleanup if we have too many nonces
      if (this.nonces.size > this.config.maxNonces) {
        this.cleanup();
      }

      return nonce;
    } catch (error) {
      console.error('Failed to generate nonce:', error);
      // Fallback to timestamp-based nonce
      return this.generateFallbackNonce(type);
    }
  }

  /**
   * Generate a fallback nonce when crypto is not available
   */
  private generateFallbackNonce(type: 'script' | 'style'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const nonce = `${type}_${timestamp}_${random}`;
    
    const entry: NonceEntry = {
      nonce,
      type,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.expiration,
      used: false
    };

    this.nonces.set(nonce, entry);
    return nonce;
  }

  /**
   * Validate a nonce
   */
  validateNonce(nonce: string, type: 'script' | 'style'): boolean {
    const entry = this.nonces.get(nonce);
    
    if (!entry) {
      return false;
    }

    // Check if nonce has expired
    if (Date.now() > entry.expiresAt) {
      this.nonces.delete(nonce);
      return false;
    }

    // Check if nonce type matches
    if (entry.type !== type) {
      return false;
    }

    // Mark as used
    entry.used = true;
    return true;
  }

  /**
   * Check if a nonce exists and is valid
   */
  hasValidNonce(nonce: string, type: 'script' | 'style'): boolean {
    return this.validateNonce(nonce, type);
  }

  /**
   * Get nonce statistics
   */
  getStats(): {
    total: number;
    active: number;
    expired: number;
    used: number;
    byType: { script: number; style: number };
  } {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    let used = 0;
    let scriptCount = 0;
    let styleCount = 0;

    for (const entry of this.nonces.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }

      if (entry.used) {
        used++;
      }

      if (entry.type === 'script') {
        scriptCount++;
      } else {
        styleCount++;
      }
    }

    return {
      total: this.nonces.size,
      active,
      expired,
      used,
      byType: { script: scriptCount, style: styleCount }
    };
  }

  /**
   * Clean up expired nonces
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [nonce, entry] of this.nonces.entries()) {
      if (now > entry.expiresAt) {
        toDelete.push(nonce);
      }
    }

    toDelete.forEach(nonce => this.nonces.delete(nonce));
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all nonces
   */
  clear(): void {
    this.nonces.clear();
  }

  /**
   * Destroy the nonce manager
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

// Global nonce manager instance
export const nonceManager = new NonceManager();

/**
 * Generate a script nonce
 */
export const generateScriptNonce = (requestId?: string): string => {
  return nonceManager.generateNonce('script', requestId);
};

/**
 * Generate a style nonce
 */
export const generateStyleNonce = (requestId?: string): string => {
  return nonceManager.generateNonce('style', requestId);
};

/**
 * Validate a script nonce
 */
export const validateScriptNonce = (nonce: string): boolean => {
  return nonceManager.validateNonce(nonce, 'script');
};

/**
 * Validate a style nonce
 */
export const validateStyleNonce = (nonce: string): boolean => {
  return nonceManager.validateNonce(nonce, 'style');
};

/**
 * Check if a nonce is valid for scripts
 */
export const hasValidScriptNonce = (nonce: string): boolean => {
  return nonceManager.hasValidNonce(nonce, 'script');
};

/**
 * Check if a nonce is valid for styles
 */
export const hasValidStyleNonce = (nonce: string): boolean => {
  return nonceManager.hasValidNonce(nonce, 'style');
};

/**
 * Get nonce statistics
 */
export const getNonceStats = () => {
  return nonceManager.getStats();
};

/**
 * Clean up expired nonces
 */
export const cleanupNonces = () => {
  nonceManager.cleanup();
};

export default NonceManager;
