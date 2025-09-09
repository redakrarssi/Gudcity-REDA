/**
 * Secure QR Code Generator
 * 
 * Provides secure QR code generation with integrity checks, nonces,
 * and cryptographic signatures to prevent tampering and replay attacks.
 */

import { createHmac, timingSafeEqual, hexToUint8Array, generateRandomBytes } from './cryptoUtils';
import { QrCodeData } from '../types/qrCode';
import env from './env';

export interface SecureQrCodeData extends QrCodeData {
  nonce: string;
  timestamp: number;
  version: string;
  integrity: string;
  signature?: string;
}

export interface QrCodeGenerationOptions {
  includeIntegrityCheck?: boolean;
  includeTamperProtection?: boolean;
  expiryMinutes?: number;
  version?: string;
}

export class SecureQrGenerator {
  private static readonly DEFAULT_VERSION = '2.0';
  private static readonly MAX_EXPIRY_HOURS = 24;
  private static readonly NONCE_LENGTH = 16; // 16 bytes = 128 bits
  
  /**
   * Generate a secure QR code with integrity checks and anti-tampering
   * @param data - Original QR code data
   * @param options - Generation options
   * @returns JSON string for QR code with security features
   */
  static async generateSecureQrCode(
    data: QrCodeData, 
    options: QrCodeGenerationOptions = {}
  ): Promise<string> {
    try {
      // SECURITY: Input validation
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid QR code data');
      }
      
      if (!data.type || typeof data.type !== 'string') {
        throw new Error('QR code must have a valid type');
      }
      
      // SECURITY: Generate cryptographically secure nonce
      const nonce = generateRandomBytes(this.NONCE_LENGTH);
      const timestamp = Date.now();
      const version = options.version || this.DEFAULT_VERSION;
      
      // Create secure data object
      const secureData: Partial<SecureQrCodeData> = {
        ...data,
        nonce,
        timestamp,
        version
      };
      
      // SECURITY: Add expiry if specified
      if (options.expiryMinutes) {
        const maxExpiry = this.MAX_EXPIRY_HOURS * 60;
        const expiryMinutes = Math.min(options.expiryMinutes, maxExpiry);
        (secureData as any).expiresAt = timestamp + (expiryMinutes * 60 * 1000);
      }
      
      // SECURITY: Calculate integrity check
      if (options.includeIntegrityCheck !== false) {
        const integrity = await this.calculateIntegrity(secureData);
        secureData.integrity = integrity;
      }
      
      // SECURITY: Add tamper protection signature
      if (options.includeTamperProtection !== false) {
        const signature = await this.createTamperProtectionSignature(secureData);
        secureData.signature = signature;
      }
      
      return JSON.stringify(secureData);
    } catch (error) {
      throw new Error(`Failed to generate secure QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Verify the integrity and authenticity of a QR code
   * @param qrData - QR code data to verify
   * @returns Verification result
   */
  static verifyQrCodeSecurity(qrData: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    data?: any;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Basic structure validation
      if (!qrData || typeof qrData !== 'object') {
        errors.push('Invalid QR code data structure');
        return { isValid: false, errors, warnings };
      }
      
      // Check required security fields
      if (!qrData.nonce || typeof qrData.nonce !== 'string') {
        errors.push('Missing or invalid nonce');
      }
      
      if (!qrData.timestamp || typeof qrData.timestamp !== 'number') {
        errors.push('Missing or invalid timestamp');
      } else {
        // Check timestamp validity
        const now = Date.now();
        const age = now - qrData.timestamp;
        const maxAge = this.MAX_EXPIRY_HOURS * 60 * 60 * 1000;
        
        if (age > maxAge) {
          errors.push('QR code has expired (too old)');
        } else if (age < -300000) { // 5 minutes in the future
          errors.push('QR code timestamp is in the future');
        }
        
        // Check explicit expiry
        if (qrData.expiresAt && now > qrData.expiresAt) {
          errors.push('QR code has expired');
        }
      }
      
      if (!qrData.version || typeof qrData.version !== 'string') {
        warnings.push('Missing version information');
      }
      
      // Verify integrity check if present
      if (qrData.integrity) {
        const isIntegrityValid = await this.verifyIntegrity(qrData);
        if (!isIntegrityValid) {
          errors.push('Integrity check failed - data may have been modified');
        }
      } else {
        warnings.push('No integrity check present');
      }
      
      // Verify tamper protection signature if present
      if (qrData.signature) {
        const isSignatureValid = await this.verifyTamperProtectionSignature(qrData);
        if (!isSignatureValid) {
          errors.push('Tamper protection signature invalid');
        }
      } else {
        warnings.push('No tamper protection signature present');
      }
      
      // Additional security checks
      this.performAdditionalSecurityChecks(qrData, warnings, errors);
      
      const isValid = errors.length === 0;
      const cleanData = isValid ? this.sanitizeVerifiedData(qrData) : undefined;
      
      return {
        isValid,
        errors,
        warnings,
        data: cleanData
      };
    } catch (error) {
      errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }
  }
  
  /**
   * Calculate integrity hash for QR code data
   * @param data - Data to calculate integrity for
   * @returns Integrity hash
   */
  private static async calculateIntegrity(data: any): Promise<string> {
    try {
      // Create data without integrity field for calculation
      const { integrity, signature, ...dataForIntegrity } = data;
      
      const hmac = await createHmac('sha256', env.QR_SECRET_KEY);
      const hash = await hmac.update(JSON.stringify(dataForIntegrity)).digest('hex');
      
      return hash as string;
    } catch (error) {
      throw new Error('Failed to calculate integrity check');
    }
  }
  
  /**
   * Verify integrity check
   * @param qrData - QR code data with integrity field
   * @returns True if integrity is valid
   */
  static async verifyIntegrity(qrData: any): Promise<boolean> {
    try {
      if (!qrData.integrity) {
        return false;
      }
      
      const expectedIntegrity = await this.calculateIntegrity(qrData);
      
      // SECURITY: Use timing-safe comparison to prevent timing attacks
      return timingSafeEqual(
        hexToUint8Array(qrData.integrity),
        hexToUint8Array(expectedIntegrity)
      );
    } catch (error) {
      console.error('Integrity verification failed:', error);
      return false;
    }
  }
  
  /**
   * Create tamper protection signature
   * @param data - Data to sign
   * @returns Signature
   */
  private static async createTamperProtectionSignature(data: any): Promise<string> {
    try {
      // Create data without signature field for signing
      const { signature, ...dataForSigning } = data;
      
      // Create a deterministic string representation
      const dataString = this.createCanonicalString(dataForSigning);
      
      // Create HMAC signature
      const hmac = await createHmac('sha256', env.QR_SECRET_KEY);
      const sig = await hmac.update(dataString).digest('hex');
      
      return sig as string;
    } catch (error) {
      throw new Error('Failed to create tamper protection signature');
    }
  }
  
  /**
   * Verify tamper protection signature
   * @param qrData - QR code data with signature
   * @returns True if signature is valid
   */
  private static async verifyTamperProtectionSignature(qrData: any): Promise<boolean> {
    try {
      if (!qrData.signature) {
        return false;
      }
      
      const expectedSignature = await this.createTamperProtectionSignature(qrData);
      
      // SECURITY: Use timing-safe comparison
      return timingSafeEqual(
        hexToUint8Array(qrData.signature),
        hexToUint8Array(expectedSignature)
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }
  
  /**
   * Create canonical string representation for signing
   * @param data - Data to canonicalize
   * @returns Canonical string
   */
  private static createCanonicalString(data: any): string {
    // Sort keys and create deterministic string
    if (data === null || data === undefined) {
      return 'null';
    }
    
    if (typeof data !== 'object') {
      return String(data);
    }
    
    if (Array.isArray(data)) {
      return '[' + data.map(item => this.createCanonicalString(item)).join(',') + ']';
    }
    
    // Sort object keys for deterministic ordering
    const sortedKeys = Object.keys(data).sort();
    const pairs = sortedKeys.map(key => `"${key}":${this.createCanonicalString(data[key])}`);
    return '{' + pairs.join(',') + '}';
  }
  
  /**
   * Perform additional security checks
   * @param qrData - QR code data to check
   * @param warnings - Array to add warnings to
   * @param errors - Array to add errors to
   */
  private static performAdditionalSecurityChecks(
    qrData: any, 
    warnings: string[], 
    errors: string[]
  ): void {
    // Check for suspicious patterns
    const dataString = JSON.stringify(qrData);
    
    // Check for script injection patterns
    const scriptPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i
    ];
    
    for (const pattern of scriptPatterns) {
      if (pattern.test(dataString)) {
        errors.push('Potentially malicious script content detected');
        break;
      }
    }
    
    // Check data size
    if (dataString.length > 10000) { // 10KB limit
      errors.push('QR code data too large');
    }
    
    // Check for prototype pollution
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    const hasPrototypePollution = this.checkForPrototypePollution(qrData, dangerousKeys);
    if (hasPrototypePollution) {
      errors.push('Potential prototype pollution detected');
    }
    
    // Check nonce uniqueness (basic check)
    if (qrData.nonce && qrData.nonce.length < 16) {
      warnings.push('Nonce appears too short for security');
    }
  }
  
  /**
   * Check for prototype pollution attempts
   * @param obj - Object to check
   * @param dangerousKeys - Keys to check for
   * @returns True if dangerous keys found
   */
  private static checkForPrototypePollution(obj: any, dangerousKeys: string[]): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    
    for (const key of dangerousKeys) {
      if (key in obj) {
        return true;
      }
    }
    
    // Recursively check nested objects
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        if (this.checkForPrototypePollution(value, dangerousKeys)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Sanitize verified QR code data
   * @param qrData - Verified QR code data
   * @returns Sanitized data
   */
  private static sanitizeVerifiedData(qrData: any): any {
    // Remove security-specific fields for application use
    const { integrity, signature, nonce, ...appData } = qrData;
    
    // Keep timestamp and version for application logic
    return appData;
  }
  
  /**
   * Generate a secure random nonce
   * @param length - Length of nonce in bytes
   * @returns Hex-encoded nonce
   */
  static generateNonce(length: number = this.NONCE_LENGTH): string {
    return generateRandomBytes(length);
  }
  
  /**
   * Check if a QR code is expired
   * @param qrData - QR code data to check
   * @returns True if expired
   */
  static isExpired(qrData: any): boolean {
    const now = Date.now();
    
    // Check explicit expiry
    if (qrData.expiresAt && now > qrData.expiresAt) {
      return true;
    }
    
    // Check timestamp age
    if (qrData.timestamp) {
      const age = now - qrData.timestamp;
      const maxAge = this.MAX_EXPIRY_HOURS * 60 * 60 * 1000;
      return age > maxAge;
    }
    
    return false;
  }
  
  /**
   * Create a backwards-compatible QR code
   * @param data - Original QR code data
   * @returns QR code that works with older scanners
   */
  static generateCompatibleQrCode(data: QrCodeData): string {
    // For backwards compatibility, include minimal security features
    const compatibleData = {
      ...data,
      timestamp: Date.now(),
      version: '1.5', // Intermediate version
    };
    
    return JSON.stringify(compatibleData);
  }
  
  /**
   * Upgrade legacy QR code to secure format
   * @param legacyData - Legacy QR code data
   * @returns Upgraded secure QR code
   */
  static async upgradeLegacyQrCode(legacyData: any): Promise<string> {
    if (!legacyData || typeof legacyData !== 'object') {
      throw new Error('Invalid legacy QR code data');
    }
    
    // Add security features to legacy data
    return this.generateSecureQrCode(legacyData, {
      includeIntegrityCheck: true,
      includeTamperProtection: true,
      version: this.DEFAULT_VERSION
    });
  }
}

export default SecureQrGenerator;
