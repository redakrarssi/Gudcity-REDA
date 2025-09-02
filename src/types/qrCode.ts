/**
 * QR Code Type System
 * 
 * This file contains type definitions for QR code scanning and processing
 * throughout the Vcarda REDA application.
 */

/**
 * Represents the possible types of QR codes in the system
 */
export type QrCodeType = 'customer' | 'loyaltyCard' | 'promoCode' | 'unknown';

/**
 * Base interface for all QR code data
 */
export interface BaseQrCodeData {
  type: QrCodeType;
  timestamp?: number;
  signature?: string;
  text?: string; // Added for compatibility with QRScanner component
}

/**
 * Customer QR code data
 */
export interface CustomerQrCodeData extends BaseQrCodeData {
  type: 'customer';
  customerId: string | number;
  name?: string;
  email?: string;
  businessId?: string | number;
  // Additional fields for compatibility with QRScanner component
  customerName?: string;
  phone?: string;
  tier?: string;
  points?: number;
  loyaltyPoints?: number;
  visits?: number;
  totalSpent?: number;
}

/**
 * Loyalty card QR code data
 */
export interface LoyaltyCardQrCodeData extends BaseQrCodeData {
  type: 'loyaltyCard';
  cardId: string | number;
  customerId: string | number;
  programId: string | number;
  businessId: string | number;
  points?: number;
  // Additional fields for compatibility with QRScanner component
  cardNumber?: string;
  cardType?: string;
}

/**
 * Promo code QR code data
 */
export interface PromoCodeQrCodeData extends BaseQrCodeData {
  type: 'promoCode';
  code: string;
  businessId: string | number;
  discount?: number;
  expiryDate?: string;
  // Additional fields for compatibility with QRScanner component
  customerId?: string | number;
  value?: number;
  expiresAt?: string;
}

/**
 * Unknown QR code data
 */
export interface UnknownQrCodeData extends BaseQrCodeData {
  type: 'unknown';
  rawData: string;
}

/**
 * Union type for all possible QR code data formats
 */
export type QrCodeData = 
  | CustomerQrCodeData 
  | LoyaltyCardQrCodeData 
  | PromoCodeQrCodeData 
  | UnknownQrCodeData;

/**
 * Unified scan result interface that accommodates both the centralized type system
 * and the QRScanner component's requirements
 * 
 * @deprecated Use UnifiedScanResult instead
 */
export interface ScanResult {
  success: boolean;
  type: QrCodeType;
  data: QrCodeData;
  message?: string;
  timestamp: string;
  rawData?: string;
}

/**
 * Unified scan result interface that accommodates both the centralized type system
 * and the QRScanner component's requirements
 */
export interface UnifiedScanResult<T extends QrCodeData = QrCodeData> {
  // Required fields
  type: QrCodeType;
  data: T;
  timestamp: string;
  
  // Optional fields with different naming conventions
  success?: boolean;
  rawData?: string; // From centralized type system
  raw?: string; // From QRScanner component
  message?: string;
}

/**
 * Type adapter to convert from QRScanner's ScanResult to UnifiedScanResult
 * @param result The QRScanner component's scan result
 * @returns A UnifiedScanResult
 */
export function fromComponentScanResult(result: { 
  type: QrCodeType; 
  data: any; 
  timestamp: string; 
  raw: string;
}): UnifiedScanResult {
  return {
    type: result.type,
    data: result.data,
    timestamp: result.timestamp,
    raw: result.raw,
    success: true, // Default to true since component doesn't include this
  };
}

/**
 * Type adapter to convert from UnifiedScanResult to QRScanner's ScanResult
 * @param result The unified scan result
 * @returns A format compatible with QRScanner component
 */
export function toComponentScanResult(result: UnifiedScanResult): {
  type: QrCodeType;
  data: any;
  timestamp: string;
  raw: string;
} {
  return {
    type: result.type,
    data: result.data,
    timestamp: result.timestamp,
    raw: result.rawData || result.raw || '',
  };
}

/**
 * QR code validation result
 */
export interface QrValidationResult {
  valid: boolean;
  message: string;
  data?: QrCodeData;
}

/**
 * QR code processing status
 */
export type QrProcessingStatus = 'pending' | 'processing' | 'success' | 'error';

/**
 * QR code scan log type
 */
export interface QrScanLog {
  scan_id?: number;
  scan_type: QrCodeType;
  user_id?: number | string;
  business_id?: number | string;
  timestamp: string;
  status: 'success' | 'error';
  error_message?: string;
  data_hash?: string;
}

/**
 * Ensures an ID is always a string
 * @param id - The ID to convert to string
 * @returns The ID as a string, or '0' if undefined/null
 */
export function ensureId(id: string | number | undefined | null): string {
  if (id === undefined || id === null) {
    return '0';
  }
  return String(id);
}

/**
 * Type guard to check if data is CustomerQrCodeData
 */
export function isCustomerQrCodeData(data: unknown): data is CustomerQrCodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'customer' &&
    'customerId' in data
  );
}

/**
 * Type guard to check if data is LoyaltyCardQrCodeData
 */
export function isLoyaltyCardQrCodeData(data: unknown): data is LoyaltyCardQrCodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'loyaltyCard' &&
    'cardId' in data
  );
}

/**
 * Type guard to check if data is PromoCodeQrCodeData
 */
export function isPromoCodeQrCodeData(data: unknown): data is PromoCodeQrCodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'promoCode' &&
    'code' in data
  );
}

/**
 * Type guard to check if data is QrCodeData
 */
export function isQrCodeData(data: unknown): data is QrCodeData {
  return (
    isCustomerQrCodeData(data) ||
    isLoyaltyCardQrCodeData(data) ||
    isPromoCodeQrCodeData(data) ||
    (typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      data.type === 'unknown')
  );
}

/**
 * Type guard to check if result is a UnifiedScanResult
 */
export function isUnifiedScanResult(result: unknown): result is UnifiedScanResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'type' in result &&
    'data' in result &&
    'timestamp' in result
  );
} 