/**
 * QR Data Manager
 * 
 * Manages QR code data encryption/decryption with seamless integration
 * into existing QR code generation and parsing workflows.
 * 
 * Features:
 * - Automatic encryption for new QR codes
 * - Transparent decryption for business dashboard
 * - Backward compatibility with existing unencrypted QR codes
 * - Environment-based encryption control
 */

import { QrEncryption } from './qrEncryption';

export interface QrDataOptions {
  enableEncryption?: boolean;
  forceEncryption?: boolean;
  businessId?: string;
}

export class QrDataManager {
  // Environment control for encryption (can be disabled in development)
  private static readonly ENCRYPTION_ENABLED = process.env.QR_ENCRYPTION_ENABLED !== 'false';
  
  /**
   * Prepare QR data for generation (encrypt if needed)
   * This is called when creating new QR codes
   */
  static async prepareForGeneration(
    originalData: any, 
    options: QrDataOptions = {}
  ): Promise<string> {
    try {
      // Check if encryption should be applied
      const shouldEncrypt = this.shouldEncryptQrData(originalData, options);
      
      if (shouldEncrypt && QrEncryption.validateSetup()) {
        console.log('🔒 Encrypting QR data for privacy protection');
        
        // Encrypt sensitive fields
        const encryptedData = await QrEncryption.encryptQrData(originalData);
        
        // Log what third-party scanners will see
        const publicPreview = QrEncryption.getPublicPreview(encryptedData);
        console.log('📱 Third-party scanner preview:', publicPreview);
        
        return JSON.stringify(encryptedData);
      } else {
        // Use original data (unencrypted)
        if (!QrEncryption.validateSetup()) {
          console.warn('⚠️  QR encryption not available - using unencrypted QR codes');
        }
        
        return JSON.stringify(originalData);
      }
      
    } catch (error) {
      console.error('Error preparing QR data for generation:', error);
      
      // Fallback to unencrypted on error
      console.log('📄 Falling back to unencrypted QR code due to encryption error');
      return JSON.stringify(originalData);
    }
  }
  
  /**
   * Prepare QR data for business consumption (decrypt if needed)
   * This is called when business dashboard scans QR codes
   */
  static async prepareForBusiness(qrText: string): Promise<any> {
    try {
      // Parse the QR code data
      const parsedData = JSON.parse(qrText);
      
      // Check if data is encrypted
      if (QrEncryption.isEncrypted(parsedData)) {
        console.log('🔓 Decrypting QR data for business dashboard');
        
        // Decrypt sensitive fields for business use
        const decryptedData = await QrEncryption.decryptQrData(parsedData);
        
        console.log('✅ QR data decrypted successfully for business use');
        return decryptedData;
      } else {
        // Unencrypted data - return as-is for backward compatibility
        console.log('📄 Processing unencrypted QR code (legacy format)');
        return parsedData;
      }
      
    } catch (parseError) {
      // If JSON parsing fails, return the original text
      console.log('❌ Failed to parse QR code as JSON, returning raw text');
      return qrText;
    }
  }
  
  /**
   * Get a safe preview of QR data (for logging/debugging)
   * Never shows sensitive information in logs
   */
  static getSafePreview(qrData: any): object {
    if (typeof qrData === 'string') {
      try {
        qrData = JSON.parse(qrData);
      } catch {
        return { rawText: qrData.substring(0, 50) + '...' };
      }
    }
    
    if (QrEncryption.isEncrypted(qrData)) {
      return QrEncryption.getPublicPreview(qrData);
    }
    
    // For unencrypted data, hide sensitive fields in preview
    return {
      type: qrData.type,
      customerId: qrData.customerId,
      cardNumber: qrData.cardNumber,
      cardType: qrData.cardType,
      timestamp: qrData.timestamp,
      name: qrData.name ? '[HIDDEN]' : undefined,
      email: qrData.email ? '[HIDDEN]' : undefined,
      _encrypted: false
    };
  }
  
  /**
   * Determine if QR data should be encrypted
   */
  private static shouldEncryptQrData(data: any, options: QrDataOptions): boolean {
    // Force encryption if requested
    if (options.forceEncryption) {
      return true;
    }
    
    // Skip encryption if explicitly disabled
    if (options.enableEncryption === false) {
      return false;
    }
    
    // Skip encryption if globally disabled
    if (!this.ENCRYPTION_ENABLED) {
      return false;
    }
    
    // Only encrypt customer QR codes (they contain sensitive data)
    if (data.type !== 'customer') {
      return false;
    }
    
    // Only encrypt if we have sensitive data to protect
    const hasSensitiveData = data.name || data.email || data.phone || data.address;
    
    return hasSensitiveData;
  }
  
  /**
   * Validate that a QR code is properly formatted
   */
  static async validateQrData(qrText: string): Promise<{
    isValid: boolean;
    isEncrypted: boolean;
    canDecrypt: boolean;
    type?: string;
    error?: string;
  }> {
    try {
      const parsedData = JSON.parse(qrText);
      
      // Check basic structure
      if (!parsedData.type || !parsedData.customerId) {
        return {
          isValid: false,
          isEncrypted: false,
          canDecrypt: false,
          error: 'Missing required fields (type, customerId)'
        };
      }
      
      const isEncrypted = QrEncryption.isEncrypted(parsedData);
      
      if (isEncrypted) {
        // Try to decrypt to validate
        try {
          await QrEncryption.decryptQrData(parsedData);
          
          return {
            isValid: true,
            isEncrypted: true,
            canDecrypt: true,
            type: parsedData.type
          };
        } catch (decryptError) {
          return {
            isValid: false,
            isEncrypted: true,
            canDecrypt: false,
            type: parsedData.type,
            error: 'Failed to decrypt encrypted data'
          };
        }
      } else {
        // Unencrypted data
        return {
          isValid: true,
          isEncrypted: false,
          canDecrypt: true,
          type: parsedData.type
        };
      }
      
    } catch (error) {
      return {
        isValid: false,
        isEncrypted: false,
        canDecrypt: false,
        error: 'Invalid JSON format'
      };
    }
  }
  
  /**
   * Generate encryption status report for debugging
   */
  static getEncryptionStatus(): {
    encryptionAvailable: boolean;
    encryptionEnabled: boolean;
    keyConfigured: boolean;
    webCryptoAvailable: boolean;
  } {
    const keyConfigured = !!(process.env.QR_ENCRYPTION_KEY || process.env.QR_SECRET_KEY);
    const webCryptoAvailable = !!(crypto && crypto.subtle);
    
    return {
      encryptionAvailable: QrEncryption.validateSetup(),
      encryptionEnabled: this.ENCRYPTION_ENABLED,
      keyConfigured,
      webCryptoAvailable
    };
  }
}

export default QrDataManager;
