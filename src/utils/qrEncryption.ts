/**
 * QR Code Data Encryption Service
 * 
 * Encrypts sensitive customer data in QR codes while maintaining 
 * business dashboard compatibility and following reda.md guidelines.
 * 
 * Features:
 * - Selective field encryption (name, email)
 * - AES-256-GCM encryption with Web Crypto API
 * - Backward compatibility with unencrypted QR codes
 * - Business dashboard decryption support
 */

interface EncryptedQrData {
  // Readable fields for routing and structure
  type: string;
  customerId: string;
  cardNumber: string;
  cardType: string;
  timestamp: number;
  
  // Encrypted sensitive data
  encrypted_data: string;
  _encrypted: true;
  _version: string;
}

interface SensitiveData {
  name: string;
  email: string;
  [key: string]: any; // Allow additional sensitive fields
}

export class QrEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly VERSION = '1.0';
  
  // Use environment variable for encryption key
  private static readonly ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || process.env.QR_SECRET_KEY;
  
  /**
   * Derive a cryptographic key from the secret key string
   */
  private static async deriveKey(): Promise<CryptoKey> {
    if (!this.ENCRYPTION_KEY) {
      throw new Error('QR encryption key not found in environment variables');
    }
    
    // Use PBKDF2 to derive a strong key from the secret
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.ENCRYPTION_KEY),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Use a fixed salt for consistency (in production, this could be configurable)
    const salt = encoder.encode('gudcity-qr-salt-2024');
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Encrypt sensitive data from QR code
   */
  private static async encryptSensitiveData(sensitiveData: SensitiveData): Promise<string> {
    try {
      const key = await this.deriveKey();
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(sensitiveData));
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      );
      
      // Combine IV + encrypted data and encode as base64
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      // Convert to base64 for JSON storage
      return btoa(String.fromCharCode(...combined));
      
    } catch (error) {
      console.error('Error encrypting sensitive QR data:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }
  
  /**
   * Decrypt sensitive data from QR code
   */
  private static async decryptSensitiveData(encryptedData: string): Promise<SensitiveData> {
    try {
      const key = await this.deriveKey();
      
      // Decode base64 and extract IV + encrypted data
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, this.IV_LENGTH);
      const encrypted = combined.slice(this.IV_LENGTH);
      
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      const decryptedJson = decoder.decode(decryptedData);
      
      return JSON.parse(decryptedJson);
      
    } catch (error) {
      console.error('Error decrypting sensitive QR data:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }
  
  /**
   * Encrypt a QR code data object by selectively encrypting sensitive fields
   */
  static async encryptQrData(originalData: any): Promise<EncryptedQrData> {
    try {
      // Extract sensitive fields
      const sensitiveData: SensitiveData = {
        name: originalData.name || '',
        email: originalData.email || ''
      };
      
      // Add any other fields that might be sensitive
      if (originalData.phone) sensitiveData.phone = originalData.phone;
      if (originalData.address) sensitiveData.address = originalData.address;
      
      // Encrypt the sensitive data
      const encryptedSensitiveData = await this.encryptSensitiveData(sensitiveData);
      
      // Create encrypted QR data with readable structure
      const encryptedQrData: EncryptedQrData = {
        type: originalData.type,
        customerId: originalData.customerId,
        cardNumber: originalData.cardNumber,
        cardType: originalData.cardType,
        timestamp: originalData.timestamp,
        encrypted_data: encryptedSensitiveData,
        _encrypted: true,
        _version: this.VERSION
      };
      
      return encryptedQrData;
      
    } catch (error) {
      console.error('Error encrypting QR data:', error);
      throw new Error('Failed to encrypt QR data');
    }
  }
  
  /**
   * Decrypt a QR code data object and restore sensitive fields
   */
  static async decryptQrData(encryptedData: any): Promise<any> {
    try {
      // Check if data is encrypted
      if (!this.isEncrypted(encryptedData)) {
        // Return unencrypted data as-is for backward compatibility
        return encryptedData;
      }
      
      // Decrypt sensitive data
      const sensitiveData = await this.decryptSensitiveData(encryptedData.encrypted_data);
      
      // Reconstruct original QR data
      const decryptedQrData = {
        type: encryptedData.type,
        customerId: encryptedData.customerId,
        cardNumber: encryptedData.cardNumber,
        cardType: encryptedData.cardType,
        timestamp: encryptedData.timestamp,
        ...sensitiveData // Restore name, email, etc.
      };
      
      return decryptedQrData;
      
    } catch (error) {
      console.error('Error decrypting QR data:', error);
      
      // For safety, return the original data without sensitive fields
      // This prevents breaking existing functionality
      if (encryptedData._encrypted) {
        return {
          type: encryptedData.type,
          customerId: encryptedData.customerId,
          cardNumber: encryptedData.cardNumber,
          cardType: encryptedData.cardType,
          timestamp: encryptedData.timestamp,
          name: '[Encrypted]',
          email: '[Encrypted]'
        };
      }
      
      return encryptedData;
    }
  }
  
  /**
   * Check if QR data is encrypted
   */
  static isEncrypted(data: any): boolean {
    return !!(data && data._encrypted === true && data.encrypted_data);
  }
  
  /**
   * Get a preview of encrypted QR data (what third-party scanners will see)
   */
  static getPublicPreview(encryptedData: EncryptedQrData): object {
    return {
      type: encryptedData.type,
      customerId: encryptedData.customerId,
      cardNumber: encryptedData.cardNumber,
      cardType: encryptedData.cardType,
      timestamp: encryptedData.timestamp,
      encrypted_data: '[ENCRYPTED DATA]',
      _encrypted: true,
      _version: encryptedData._version
    };
  }
  
  /**
   * Validate encryption environment setup
   */
  static validateSetup(): boolean {
    try {
      if (!this.ENCRYPTION_KEY) {
        console.warn('QR encryption key not configured. Set QR_ENCRYPTION_KEY or QR_SECRET_KEY environment variable.');
        return false;
      }
      
      if (!crypto || !crypto.subtle) {
        console.warn('Web Crypto API not available. QR encryption requires HTTPS or localhost.');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('QR encryption setup validation failed:', error);
      return false;
    }
  }
}

export default QrEncryption;
