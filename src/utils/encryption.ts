// Data encryption utilities for sensitive data protection
// Implements AES-256-CBC encryption with secure key derivation
// Follows reda.md security guidelines for PII protection

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations

// Environment-based encryption key (should be set in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';

/**
 * Derive encryption key from master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Generate a random IV for encryption
 */
export function generateIV(): Buffer {
  return crypto.randomBytes(IV_LENGTH);
}

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param data - Data to encrypt (string or Buffer)
 * @param masterKey - Master encryption key (optional, uses ENCRYPTION_KEY if not provided)
 * @returns Encrypted data as base64 string with salt and IV prepended
 */
export function encryptData(data: string | Buffer, masterKey?: string): string {
  try {
    const key = masterKey || ENCRYPTION_KEY;
    const salt = generateSalt();
    const iv = generateIV();
    const derivedKey = deriveKey(key, salt);
    
    const cipher = crypto.createCipher(ALGORITHM, derivedKey);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Prepend salt and IV to encrypted data
    const saltBase64 = salt.toString('base64');
    const ivBase64 = iv.toString('base64');
    
    return `${saltBase64}:${ivBase64}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt data encrypted with encryptData
 * @param encryptedData - Base64 encrypted data with salt:iv:data format
 * @param masterKey - Master encryption key (optional, uses ENCRYPTION_KEY if not provided)
 * @returns Decrypted data as string
 */
export function decryptData(encryptedData: string, masterKey?: string): string {
  try {
    const key = masterKey || ENCRYPTION_KEY;
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltBase64, ivBase64, encrypted] = parts;
    const salt = Buffer.from(saltBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const derivedKey = deriveKey(key, salt);
    
    const decipher = crypto.createDecipher(ALGORITHM, derivedKey);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt JSON object data
 * @param obj - Object to encrypt
 * @param masterKey - Master encryption key (optional)
 * @returns Encrypted JSON string
 */
export function encryptObject(obj: any, masterKey?: string): string {
  const jsonString = JSON.stringify(obj);
  return encryptData(jsonString, masterKey);
}

/**
 * Decrypt JSON object data
 * @param encryptedJson - Encrypted JSON string
 * @param masterKey - Master encryption key (optional)
 * @returns Decrypted object
 */
export function decryptObject<T = any>(encryptedJson: string, masterKey?: string): T {
  const decryptedString = decryptData(encryptedJson, masterKey);
  return JSON.parse(decryptedString);
}

/**
 * Hash sensitive data for one-way encryption (passwords, etc.)
 * @param data - Data to hash
 * @param salt - Optional salt (generates random if not provided)
 * @returns Hashed data with salt
 */
export function hashData(data: string, salt?: Buffer): { hash: string; salt: string } {
  const saltBuffer = salt || generateSalt();
  const hash = crypto.pbkdf2Sync(data, saltBuffer, ITERATIONS, KEY_LENGTH, 'sha256');
  
  return {
    hash: hash.toString('base64'),
    salt: saltBuffer.toString('base64')
  };
}

/**
 * Verify hashed data
 * @param data - Original data
 * @param hash - Stored hash
 * @param salt - Stored salt
 * @returns True if data matches hash
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  try {
    const saltBuffer = Buffer.from(salt, 'base64');
    const computedHash = crypto.pbkdf2Sync(data, saltBuffer, ITERATIONS, KEY_LENGTH, 'sha256');
    const storedHash = Buffer.from(hash, 'base64');
    
    return crypto.timingSafeEqual(computedHash, storedHash);
  } catch {
    return false;
  }
}

/**
 * Generate a secure random token
 * @param length - Token length in bytes (default: 32)
 * @returns Random token as hex string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt QR code data specifically
 * @param qrData - QR code data object
 * @returns Encrypted QR data string
 */
export function encryptQRData(qrData: any): string {
  try {
    // Ensure QR data is properly structured
    const sanitizedData = {
      type: qrData.type,
      customerId: qrData.customerId,
      name: qrData.name,
      email: qrData.email,
      cardNumber: qrData.cardNumber,
      cardType: qrData.cardType,
      timestamp: qrData.timestamp || Date.now()
    };
    
    return encryptObject(sanitizedData);
  } catch (error) {
    throw new Error(`QR data encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt QR code data
 * @param encryptedQRData - Encrypted QR data string
 * @returns Decrypted QR data object
 */
export function decryptQRData(encryptedQRData: string): any {
  try {
    return decryptObject(encryptedQRData);
  } catch (error) {
    throw new Error(`QR data decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate encryption key strength
 * @param key - Key to validate
 * @returns True if key meets security requirements
 */
export function validateEncryptionKey(key: string): boolean {
  // Minimum 32 characters for basic security
  if (key.length < 32) {
    return false;
  }
  
  // Check for sufficient entropy (basic check)
  const uniqueChars = new Set(key).size;
  return uniqueChars >= 16; // At least 16 unique characters
}

/**
 * Generate a secure encryption key
 * @param length - Key length in bytes (default: 32)
 * @returns Secure encryption key
 */
export function generateEncryptionKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}