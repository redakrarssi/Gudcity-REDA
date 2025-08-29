/**
 * Client-Safe QR Code Service
 * 
 * This service provides client-side QR code functionality without accessing
 * server-side environment variables or database connections.
 * 
 * For server-side operations, use the main QrCodeService instead.
 */

import { 
  QrCodeType,
  QrCodeData,
  CustomerQrCodeData,
  LoyaltyCardQrCodeData,
  PromoCodeQrCodeData,
  UnknownQrCodeData,
  UnifiedScanResult
} from '../types/qrCode';

/**
 * Client-safe QR code validation
 */
export function validateQrCodeDataClient(data: any): { isValid: boolean; type?: QrCodeType; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Invalid QR code data format');
    return { isValid: false, errors };
  }
  
  // Basic validation for client-side display
  if (data.type && !Object.values(QrCodeType).includes(data.type as QrCodeType)) {
    errors.push('Invalid QR code type');
  }
  
  if (data.timestamp && (typeof data.timestamp !== 'number' || data.timestamp <= 0)) {
    errors.push('Invalid timestamp');
  }
  
  if (data.version && typeof data.version !== 'string') {
    errors.push('Invalid version format');
  }
  
  // Determine type based on available fields
  let detectedType: QrCodeType | undefined;
  
  if (data.customerId && data.businessId) {
    detectedType = QrCodeType.CUSTOMER_CARD;
  } else if (data.programId && data.businessId) {
    detectedType = QrCodeType.LOYALTY_CARD;
  } else if (data.promoCode) {
    detectedType = QrCodeType.PROMO_CODE;
  }
  
  return {
    isValid: errors.length === 0,
    type: detectedType,
    errors
  };
}

/**
 * Client-safe QR code type checking
 */
export function isCustomerQrCodeDataClient(data: any): data is CustomerQrCodeData {
  return data && 
         data.type === QrCodeType.CUSTOMER_CARD &&
         typeof data.customerId !== 'undefined' &&
         typeof data.businessId !== 'undefined';
}

export function isLoyaltyCardQrCodeDataClient(data: any): data is LoyaltyCardQrCodeData {
  return data && 
         data.type === QrCodeType.LOYALTY_CARD &&
         typeof data.programId !== 'undefined' &&
         typeof data.businessId !== 'undefined';
}

export function isPromoCodeQrCodeDataClient(data: any): data is PromoCodeQrCodeData {
  return data && 
         data.type === QrCodeType.PROMO_CODE &&
         typeof data.promoCode !== 'undefined';
}

/**
 * Client-safe QR code processing result
 */
export interface ClientQrCodeProcessResult {
  success: boolean;
  message: string;
  data?: QrCodeData;
  type?: QrCodeType;
  errors?: string[];
}

/**
 * Process QR code data on the client side
 */
export function processQrCodeDataClient(qrData: any): ClientQrCodeProcessResult {
  try {
    // Parse JSON if it's a string
    let parsedData: any;
    if (typeof qrData === 'string') {
      try {
        parsedData = JSON.parse(qrData);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid QR code data format',
          errors: ['Failed to parse QR code data']
        };
      }
    } else {
      parsedData = qrData;
    }
    
    // Validate the data
    const validation = validateQrCodeDataClient(parsedData);
    
    if (!validation.isValid) {
      return {
        success: false,
        message: 'QR code validation failed',
        errors: validation.errors
      };
    }
    
    // Return success with validated data
    return {
      success: true,
      message: 'QR code processed successfully',
      data: parsedData as QrCodeData,
      type: validation.type
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Error processing QR code',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Client-safe QR code display utilities
 */
export function formatQrCodeDisplayData(data: QrCodeData): {
  title: string;
  subtitle: string;
  details: Array<{ label: string; value: string }>;
} {
  const details: Array<{ label: string; value: string }> = [];
  
  if (data.type) details.push({ label: 'Type', value: data.type });
  if (data.version) details.push({ label: 'Version', value: data.version });
  if (data.timestamp) details.push({ label: 'Created', value: new Date(data.timestamp).toLocaleString() });
  
  let title = 'QR Code';
  let subtitle = 'Scan successful';
  
  if (isCustomerQrCodeDataClient(data)) {
    title = 'Customer Card';
    subtitle = `Customer ID: ${data.customerId}`;
    if (data.customerName) details.push({ label: 'Name', value: data.customerName });
    if (data.businessId) details.push({ label: 'Business ID', value: String(data.businessId) });
  } else if (isLoyaltyCardQrCodeDataClient(data)) {
    title = 'Loyalty Card';
    subtitle = `Program ID: ${data.programId}`;
    if (data.businessId) details.push({ label: 'Business ID', value: String(data.businessId) });
  } else if (isPromoCodeQrCodeDataClient(data)) {
    title = 'Promo Code';
    subtitle = data.promoCode;
    if (data.description) details.push({ label: 'Description', value: data.description });
  }
  
  return { title, subtitle, details };
}

/**
 * Client-safe QR code error handling
 */
export function handleQrCodeErrorClient(error: any): ClientQrCodeProcessResult {
  if (error instanceof Error) {
    return {
      success: false,
      message: 'QR code processing error',
      errors: [error.message]
    };
  }
  
  if (typeof error === 'string') {
    return {
      success: false,
      message: 'QR code error',
      errors: [error]
    };
  }
  
  return {
    success: false,
    message: 'Unknown QR code error',
    errors: ['An unexpected error occurred']
  };
}