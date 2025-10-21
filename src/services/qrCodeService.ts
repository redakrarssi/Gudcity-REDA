import { apiProcessQrCode, apiGenerateQrCode, apiValidateQrCode } from './apiClient';

// Import types
import {
  QrCodeType,
  QrCodeData,
  CustomerQrCodeData,
  LoyaltyCardQrCodeData,
  PromoCodeQrCodeData,
  UnknownQrCodeData,
  QrValidationResult,
  QrProcessingStatus,
  QrScanLog as TypedQrScanLog,
  isCustomerQrCodeData,
  isLoyaltyCardQrCodeData,
  isPromoCodeQrCodeData,
  ensureId
} from '../types/qrCode';

/**
 * QR code scan log database record
 */
export interface QrScanLog {
  id: number;
  scan_type: 'CUSTOMER_CARD' | 'PROMO_CODE' | 'LOYALTY_CARD';
  scanned_by: number; // business_id
  scanned_data: string; // JSON string of the scanned data
  customer_id?: number;
  program_id?: number;
  promo_code_id?: number;
  points_awarded?: number;
  success: boolean;
  error_message?: string;
  created_at: Date | string;
}

/**
 * QR code processing result
 */
export interface QrCodeProcessingResult {
  success: boolean;
  message: string;
  pointsAwarded?: number;
  customerId?: string;
  customerName?: string;
  programName?: string;
  data?: any;
  error?: string;
}

/**
 * QR code statistics interface
 */
export interface QrCodeStats {
  totalScans: number;
  successfulScans: number;
  customerScans: number;
  promoScans: number;
  loyaltyScans: number;
  pointsAwarded: number;
}

/**
 * QR code analytics interface
 */
export interface QrCodeAnalytics {
  dailyScans: {
    date: string;
    total: number;
    successful: number;
  }[];
  scanTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  businessPerformance: {
    businessId: number;
    businessName: string;
    totalScans: number;
    successRate: number;
  }[];
}

/**
 * Loyalty card processing result
 */
export interface LoyaltyCardProcessResult {
  success: boolean;
  message: string;
  pointsAwarded?: number;
}

/**
 * Business performance analytics
 */
export interface BusinessPerformance {
  business_id: number;
  business_name: string;
  total_scans: string | number;
  success_rate: string | number;
}

/**
 * QR code scan options
 */
export interface QrScanOptions {
  customerId?: string | number;
  programId?: string | number;
  promoCodeId?: string | number;
  pointsToAward?: number;
  ipAddress?: string;
}

/**
 * QR code scan result
 */
export interface QrScanResult<T extends QrCodeData = QrCodeData> {
  success: boolean;
  message: string;
  pointsAwarded?: number;
  scanLogId?: number;
  error?: Error;
  rateLimited?: boolean;
  data?: T;
  status: QrProcessingStatus;
}

/**
 * QR code validation result with enhanced typing
 */
export interface QrValidationResultExtended<T extends QrCodeData = QrCodeData> {
  valid: boolean;
  message: string;
  verifiedData?: T;
  error?: Error;
}

/**
 * QR code service for handling all QR code related operations
 */
export class QrCodeService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get user QR code (customer or business)
   * Determines user type and returns appropriate QR code
   */
  static async getUserQrCode(userId: string): Promise<string | null> {
    try {
      // Use API to get user info which will determine the type
      // Try customer QR first
      const customerQr = await this.getCustomerQrCode(userId);
      if (customerQr) {
        return customerQr;
      }
      
      // If customer QR fails, try business QR
      const businessQr = await this.getBusinessQrCode(userId);
      if (businessQr) {
        return businessQr;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user QR code:', error);
      return null;
    }
  }
  
  /**
   * Get customer QR code with encrypted sensitive data
   */
  static async getCustomerQrCode(customerId: string): Promise<string | null> {
    const cacheKey = `customer-qr-${customerId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

      try {
        const result = await apiGenerateQrCode(customerId);
        if (result && result.qrData) {
          const qrDataString = JSON.stringify(result.qrData);
          this.cache.set(cacheKey, { data: qrDataString, timestamp: Date.now() });
          return qrDataString;
        }
      return null;
      } catch (error: any) {
      console.error('Error generating customer QR code:', error);
      return null;
    }
  }

  /**
   * Get business QR code
   */
  static async getBusinessQrCode(businessId: string): Promise<string | null> {
    const cacheKey = `business-qr-${businessId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
            
    try {
      // Note: API generate endpoint handles both customer and business
      // For business QR, we create a simple structure
      const qrData = {
        type: 'business',
        businessId: businessId,
        timestamp: Date.now()
      };

      const qrCodeData = JSON.stringify(qrData);
      
      // Cache the result
      this.cache.set(cacheKey, { data: qrCodeData, timestamp: Date.now() });
      
      return qrCodeData;
    } catch (error) {
      console.error('Error generating business QR code:', error);
      return null;
    }
  }
  
  /**
   * Get loyalty card QR code for a specific program
   * Note: This method creates a simple QR code structure. The API will validate
   * the card when it's scanned by a business.
   */
  static async getLoyaltyCardQrCode(customerId: string, businessId: string, programId: string): Promise<string | null> {
    const cacheKey = `loyalty-qr-${customerId}-${businessId}-${programId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Create QR data structure for loyalty card
      // The server will validate this when it's scanned
      const qrData = {
        type: 'loyaltyCard',
        customerId: customerId,
        programId: programId,
        businessId: businessId,
        timestamp: Date.now()
      };

      const qrCodeData = JSON.stringify(qrData);
      
      // Cache the result
      this.cache.set(cacheKey, { data: qrCodeData, timestamp: Date.now() });
      
      return qrCodeData;
    } catch (error) {
      console.error('Error generating loyalty card QR code:', error);
      return null;
    }
  }
  
  /**
   * Process a QR code scan
   * @param qrCodeData The QR code data to process
   * @param businessId The business ID of the scanner
   * @param pointsToAward Number of points to award (if applicable)
   * @returns Result of the scan processing
   */
  static async processQrCodeScan(
    qrCodeData: QrCodeData,
    businessId: string,
    pointsToAward: number = 10
  ): Promise<QrCodeProcessingResult> {
    try {
      console.log('Processing QR code scan:', { type: qrCodeData.type, businessId, pointsToAward });
      
      // Handle legacy format conversion if needed
      if (!qrCodeData.type && 'customerId' in qrCodeData) {
        console.log('Converting legacy QR code format to customer type');
        (qrCodeData as any).type = 'customer';
      }
      
          const result = await apiProcessQrCode(qrCodeData, pointsToAward);
          if (result) {
            return {
              success: result.success,
              message: result.message,
              pointsAwarded: result.pointsAwarded,
              customerId: result.customerId,
              customerName: result.customerName,
              data: result
            };
      }
      
      return {
        success: false,
        message: 'Failed to process QR code'
      };
    } catch (error: any) {
      console.error('Error processing QR code scan:', error);
      return {
        success: false,
        message: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  static clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

export default QrCodeService; 