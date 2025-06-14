/**
 * Standard QR Code Generator
 * 
 * Uses the qrcode.react library to generate standardized, reliable QR codes.
 * This implementation replaces the custom QR code generator to improve scan reliability.
 */
import QRCode from 'qrcode';
import env from './env';

// Polyfill for crypto.randomUUID if not available
function generateUUID() {
  // Simple UUID v4 implementation for compatibility
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Standard QR code data format to ensure consistency across all QR code types
 */
export interface StandardQrCodeData {
  // Common fields for all QR code types
  type: 'CUSTOMER_CARD' | 'LOYALTY_CARD' | 'PROMO_CODE';
  qrUniqueId: string;
  timestamp: number;
  version: string;
  
  // Specific fields based on type
  customerId?: string | number;
  customerName?: string;
  businessId?: string | number;
  programId?: string | number;
  cardId?: string | number;
  promoCode?: string;
  
  // Card specific fields
  cardNumber?: string;
  cardType?: string;
  
  // Security fields
  signature?: string;
}

/**
 * Generate a QR code as a data URL string using the standardized format
 * @param data The data to encode in the QR code
 * @param options Optional parameters for customizing the QR code
 * @returns Promise that resolves to a data URL of the QR code
 */
export async function generateStandardQRCode(
  data: StandardQrCodeData,
  options: {
    size?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    color?: {
      dark?: string;
      light?: string;
    };
  } = {}
): Promise<string> {
  // Set default options
  const {
    size = 300,
    margin = 4,
    errorCorrectionLevel = 'M',
    color = {
      dark: '#000000',
      light: '#FFFFFF'
    }
  } = options;

  // Add a digital signature to the data for security
  const dataWithSignature = addSignature(data);
  
  // Convert data to JSON string
  const qrData = JSON.stringify(dataWithSignature);

  // Use qrcode library to generate QR code
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: size,
      margin: margin,
      errorCorrectionLevel: errorCorrectionLevel,
      color: color
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Add a digital signature to the QR code data for security verification
 */
function addSignature(data: StandardQrCodeData): StandardQrCodeData {
  // Create a copy of data without the signature field
  const { signature, ...dataWithoutSignature } = data;
  
  // Simple hash function since we might not have crypto.subtle in all environments
  function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
  
  // Generate a simple signature with a timestamp for verification
  const timestamp = new Date().getTime();
  const stringToHash = JSON.stringify(dataWithoutSignature) + (env.QR_SECRET_KEY || 'fallback-key') + timestamp;
  const newSignature = simpleHash(stringToHash) + '.' + timestamp;
  
  // Return data with the new signature
  return {
    ...dataWithoutSignature,
    signature: newSignature
  };
}

/**
 * Create a QR code for a customer card
 */
export async function createStandardCustomerQRCode(
  customerId: string | number,
  businessId?: string | number,
  customerName?: string,
  cardNumber?: string,
  cardType?: string
): Promise<string> {
  try {
    // Create standardized data structure
    const qrUniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? 
      crypto.randomUUID() : generateUUID();
    
    const qrData: StandardQrCodeData = {
      type: 'CUSTOMER_CARD',
      qrUniqueId,
      timestamp: Date.now(),
      version: '1.0',
      customerId,
      customerName,
      businessId,
      cardNumber: cardNumber || `${customerId}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      cardType: cardType || 'STANDARD'
    };
    
    // Generate QR code with standard options
    return generateStandardQRCode(qrData, {
      errorCorrectionLevel: 'M',  // Medium error correction for good balance
      size: 300
    });
  } catch (error) {
    console.error('Error creating customer QR code:', error);
    throw error;
  }
}

/**
 * Create a QR code for a loyalty card
 */
export async function createStandardLoyaltyCardQRCode(
  cardId: string | number,
  programId: string | number,
  businessId: string | number,
  customerId: string | number
): Promise<string> {
  // Create standardized data structure
  const qrUniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? 
    crypto.randomUUID() : generateUUID();
  
  const qrData: StandardQrCodeData = {
    type: 'LOYALTY_CARD',
    qrUniqueId,
    timestamp: Date.now(),
    version: '1.0',
    cardId,
    programId,
    businessId,
    customerId
  };
  
  // Generate QR code with standard options
  return generateStandardQRCode(qrData, {
    errorCorrectionLevel: 'Q',  // Higher error correction for loyalty cards
    size: 300
  });
}

/**
 * Create a QR code for a promo code
 */
export async function createStandardPromoQRCode(
  promoCode: string,
  businessId: string | number
): Promise<string> {
  // Create standardized data structure
  const qrUniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? 
    crypto.randomUUID() : generateUUID();
  
  const qrData: StandardQrCodeData = {
    type: 'PROMO_CODE',
    qrUniqueId,
    timestamp: Date.now(),
    version: '1.0',
    promoCode,
    businessId
  };
  
  // Generate QR code with standard options
  return generateStandardQRCode(qrData, {
    errorCorrectionLevel: 'Q',  // Higher error correction for promo codes
    size: 300
  });
}

/**
 * Verify the signature of a QR code data object
 */
export function verifyQrCodeSignature(data: StandardQrCodeData): boolean {
  try {
    // Extract the signature
    const { signature, ...dataWithoutSignature } = data;
    
    // If no signature exists, verification fails
    if (!signature) {
      return false;
    }
    
    // Simple hash function to verify signature
    function simpleHash(str: string): string {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString(16);
    }
    
    // Extract timestamp from signature
    const parts = signature.split('.');
    if (parts.length !== 2) return false;
    
    const timestamp = parseInt(parts[1]);
    if (isNaN(timestamp)) return false;
    
    // Recreate the signature for comparison
    const stringToHash = JSON.stringify(dataWithoutSignature) + (env.QR_SECRET_KEY || 'fallback-key') + timestamp;
    const expectedSignature = simpleHash(stringToHash) + '.' + timestamp;
    
    // Compare signatures
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying QR code signature:', error);
    return false;
  }
} 