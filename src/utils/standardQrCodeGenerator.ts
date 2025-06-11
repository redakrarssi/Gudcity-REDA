/**
 * Standard QR Code Generator
 * 
 * Uses the qrcode.react library to generate standardized, reliable QR codes.
 * This implementation replaces the custom QR code generator to improve scan reliability.
 */
import QRCode from 'qrcode';
import crypto from 'crypto';
import env from './env';

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
  
  // Generate a signature using HMAC
  const hmac = crypto.createHmac('sha256', env.QR_SECRET_KEY || 'fallback-key-do-not-use-in-production');
  hmac.update(JSON.stringify(dataWithoutSignature));
  const newSignature = hmac.digest('hex');
  
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
  customerName?: string
): Promise<string> {
  // Create standardized data structure
  const qrData: StandardQrCodeData = {
    type: 'CUSTOMER_CARD',
    qrUniqueId: crypto.randomUUID(),
    timestamp: Date.now(),
    version: '1.0',
    customerId,
    customerName,
    businessId
  };
  
  // Generate QR code with standard options
  return generateStandardQRCode(qrData, {
    errorCorrectionLevel: 'M',  // Medium error correction for good balance
    size: 300
  });
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
  const qrData: StandardQrCodeData = {
    type: 'LOYALTY_CARD',
    qrUniqueId: crypto.randomUUID(),
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
  const qrData: StandardQrCodeData = {
    type: 'PROMO_CODE',
    qrUniqueId: crypto.randomUUID(),
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
    
    // Generate a new signature
    const hmac = crypto.createHmac('sha256', env.QR_SECRET_KEY || 'fallback-key-do-not-use-in-production');
    hmac.update(JSON.stringify(dataWithoutSignature));
    const expectedSignature = hmac.digest('hex');
    
    // Compare signatures
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying QR code signature:', error);
    return false;
  }
} 