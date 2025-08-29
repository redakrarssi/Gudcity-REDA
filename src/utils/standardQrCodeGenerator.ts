/**
 * Standard QR Code Generator
 * 
 * Uses the qrcode.react library to generate standardized, reliable QR codes.
 * This implementation replaces the custom QR code generator to improve scan reliability.
 */
import QRCode from 'qrcode';
import { 
  CustomerQrCodeData,
  LoyaltyCardQrCodeData,
  PromoCodeQrCodeData,
  QrCodeData
} from '../types/qrCode';
// Note: QR_SECRET_KEY is server-side only for security

// Polyfill for crypto.randomUUID if not available
function generateUUID(): string {
  // Simple UUID v4 implementation for compatibility
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a QR code as a data URL string using the standardized format
 * @param data The data to encode in the QR code
 * @param options Optional parameters for customizing the QR code
 * @returns Promise that resolves to a data URL of the QR code
 */
export async function generateStandardQRCode(
  data: QrCodeData,
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
function addSignature(data: QrCodeData): QrCodeData {
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
  // Note: In client-side context, we use a fallback signature for display purposes only
  // Real signatures should be generated server-side for security
  const timestamp = new Date().getTime();
  const stringToHash = JSON.stringify(dataWithoutSignature) + 'client-fallback-key' + timestamp;
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
  email?: string,
  cardNumber?: string,
  cardType?: string
): Promise<string> {
  try {
    // Create standardized data structure
    const qrUniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? 
      crypto.randomUUID() : generateUUID();
    
    const qrData: CustomerQrCodeData = {
      type: 'customer',
      customerId,
      name: customerName,
      email,
      businessId,
      timestamp: Date.now()
    };

    // Add card number and type if provided
    if (cardNumber) {
      (qrData as any).cardNumber = cardNumber;
    }
    
    if (cardType) {
      (qrData as any).cardType = cardType;
    }
    
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
export function createStandardLoyaltyCardQRCode(
  params: {
    cardId: string | number,
    programId: string | number,
    businessId: string | number,
    customerId: string | number,
    cardNumber?: string,
    programName?: string,
    businessName?: string,
    points?: number
  }
): LoyaltyCardQrCodeData {
  // Create standardized data structure
  const qrData: LoyaltyCardQrCodeData = {
    type: 'loyaltyCard',
    cardId: params.cardId,
    programId: params.programId,
    businessId: params.businessId,
    customerId: params.customerId,
    points: params.points,
    cardNumber: params.cardNumber,
    timestamp: Date.now()
  };
  
  // Add optional metadata for better display
  if (params.programName) {
    (qrData as any).programName = params.programName;
  }
  
  if (params.businessName) {
    (qrData as any).businessName = params.businessName;
  }
  
  return qrData;
}

/**
 * Create a QR code for a promo code
 */
export async function createStandardPromoQRCode(
  code: string,
  businessId: string | number,
  discount?: number,
  expiryDate?: string
): Promise<string> {
  // Create standardized data structure
  const qrData: PromoCodeQrCodeData = {
    type: 'promoCode',
    code,
    businessId,
    discount,
    expiryDate,
    timestamp: Date.now()
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
export function verifyQrCodeSignature(data: QrCodeData): boolean {
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
    
    const signatureHash = parts[0];
    const signatureTimestamp = parseInt(parts[1], 10);
    
    // Check if the signature is too old (24 hours)
    const currentTime = new Date().getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (currentTime - signatureTimestamp > maxAge) {
      return false;
    }
    
    // Recreate the hash with the same data and timestamp
    const stringToHash = JSON.stringify(dataWithoutSignature) + (env.QR_SECRET_KEY || 'fallback-key') + signatureTimestamp;
    const expectedHash = simpleHash(stringToHash);
    
    // Compare the hashes
    return expectedHash === signatureHash;
  } catch (error) {
    console.error('Error verifying QR code signature:', error);
    return false;
  }
} 