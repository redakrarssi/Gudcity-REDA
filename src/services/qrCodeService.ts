import sql from '../utils/db';
import { createStandardCustomerQRCode, createStandardPromoQRCode, createStandardLoyaltyCardQRCode } from '../utils/standardQrCodeGenerator';
import { QrCodeStorageService } from './qrCodeStorageService';
import env from '../utils/env';
import rateLimiter from '../utils/rateLimiter';

// Import the new validation and error handling utilities
import { validateQrCodeData, safeValidateQrCode } from '../utils/qrCodeValidator';
import { 
  QrCodeError, 
  QrValidationError, 
  QrSecurityError, 
  QrExpirationError,
  QrBusinessLogicError,
  QrRateLimitError,
  logQrCodeError
} from '../utils/qrCodeErrorHandler';
import { withRetryableQuery, withRetryableTransaction } from '../utils/dbRetry';
import { NotificationService } from './notificationService';
import QrDataManager from '../utils/qrDataManager';
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
import type { NotificationType } from '../types/notification';
import { LoyaltyCardService } from './loyaltyCardService';
import { LoyaltyProgramService } from './loyaltyProgramService';
import { CustomerNotificationService } from './customerNotificationService';
import { CustomerService } from './customerService';
import { emitEnrollmentEvent } from '../utils/loyaltyEvents';

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
      const result = await sql`
        SELECT id, name, email, user_type FROM users WHERE id = ${userId}
      `;

      if (result.length === 0) {
        return null;
      }

      const user = result[0];
      
      if (user.user_type === 'customer') {
        return this.getCustomerQrCode(userId);
      } else if (user.user_type === 'business') {
        return this.getBusinessQrCode(userId);
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
      const result = await sql`
        SELECT id, name, email FROM users WHERE id = ${customerId} AND user_type = 'customer'
      `;

      if (result.length === 0) {
        return null;
      }

      const customer = result[0];
      
      const qrData = {
        type: 'customer',
        customerId: customer.id.toString(),
        name: customer.name,
        email: customer.email,
        cardNumber: `GC-${customer.id.toString().padStart(6, '0')}-C`,
        cardType: 'STANDARD',
        timestamp: Date.now()
      };

      // 🔒 Apply encryption to protect sensitive customer data (name, email)
      // Third-party QR scanners will only see encrypted data, business dashboard can decrypt
      const qrCodeData = await QrDataManager.prepareForGeneration(qrData, {
        enableEncryption: true,
        businessId: customerId
      });
      
      // Cache the result
      this.cache.set(cacheKey, { data: qrCodeData, timestamp: Date.now() });
      
      return qrCodeData;
              } catch (error) {
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
                  const result = await sql`
        SELECT id, name, email FROM users WHERE id = ${businessId} AND user_type = 'business'
      `;

      if (result.length === 0) {
        return null;
      }

      const business = result[0];
      
      const qrData = {
        type: 'business',
        businessId: business.id.toString(),
        name: business.name,
        email: business.email,
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
   */
  static async getLoyaltyCardQrCode(customerId: string, businessId: string, programId: string): Promise<string | null> {
    const cacheKey = `loyalty-qr-${customerId}-${businessId}-${programId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const result = await sql`
        SELECT 
          lc.*,
          lp.name as program_name,
          u.name as business_name,
          customer.name as customer_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN users u ON lc.business_id = u.id
        JOIN users customer ON lc.customer_id = customer.id
        WHERE lc.customer_id = ${customerId}
        AND lc.business_id = ${businessId}
        AND lc.program_id = ${programId}
        AND lc.is_active = true
      `;

      if (result.length === 0) {
          return null;
        }

      const card = result[0];
      
      const qrData = {
        type: 'loyaltyCard',
        cardId: card.id.toString(),
        customerId: card.customer_id.toString(),
        programId: card.program_id.toString(),
        businessId: card.business_id.toString(),
        cardNumber: card.card_number || `GC-${card.customer_id.toString().padStart(6, '0')}-C`,
        programName: card.program_name,
        businessName: card.business_name,
        customerName: card.customer_name,
        points: parseInt(card.points) || 0,
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
   * @param scanType The type of QR code scan
   * @param scannedBy The business ID of the scanner
   * @param scannedData The data from the QR code
   * @param options Additional options for processing
   * @returns Result of the scan processing
   */
  static async processQrCodeScan(
    qrCodeData: QrCodeData,
    businessId: string,
    pointsToAward: number = 10
  ): Promise<QrCodeProcessingResult> {
    try {
      console.log('Processing QR code scan:', { type: qrCodeData.type, businessId, pointsToAward });
      
      // 🔓 Decrypt QR data if encrypted for business dashboard processing
      const decryptedQrData = await QrDataManager.prepareForBusiness(JSON.stringify(qrCodeData));
      qrCodeData = decryptedQrData;
      
      // Handle legacy format conversion if needed
      if (!qrCodeData.type && 'customerId' in qrCodeData) {
        console.log('Converting legacy QR code format to customer type');
        (qrCodeData as any).type = 'customer';
      }
      
      switch (qrCodeData.type) {
        case 'customer':
          return await this.processCustomerQrCode(qrCodeData as CustomerQrCodeData, businessId, pointsToAward);
        
        case 'loyaltyCard':
          return await this.processLoyaltyCardQrCode(qrCodeData as LoyaltyCardQrCodeData, businessId, pointsToAward);
        
        case 'promoCode':
          return await this.processPromoCodeQrCode(qrCodeData as PromoCodeQrCodeData, businessId);
        
        default:
          return {
            success: false,
            message: `Unknown QR code type: ${qrCodeData.type || 'undefined'}`
          };
      }
    } catch (error) {
      console.error('Error processing QR code scan:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Process customer QR code scan - FIXED: No automatic point awarding
   */
  private static async processCustomerQrCode(
    qrCodeData: CustomerQrCodeData,
    businessId: string,
    pointsToAward: number
  ): Promise<QrCodeProcessingResult> {
    try {
      // Extract customer ID, handling different possible property names for backward compatibility
      const customerId = String(qrCodeData.customerId || qrCodeData.id || '');
      
      if (!customerId) {
        return {
          success: false,
          message: 'Invalid customer QR code - missing customer ID'
        };
      }

      // Log the scan in monitoring system
      try {
        await this.logScan(
          'CUSTOMER_CARD',
          businessId,
          qrCodeData,
          true,
          { customerId: customerId }
        );
      } catch (logError) {
        console.error('Error logging QR code scan:', logError);
        // Continue processing even if logging fails
      }

      // Get business information
      const business = await sql`
        SELECT name FROM users WHERE id = ${businessId} AND user_type = 'business'
      `;
      
      const businessName = business.length > 0 ? business[0].name : 'Business';

      // Send immediate notification that QR was scanned
      try {
        await CustomerNotificationService.createNotification({
          customerId: customerId,
          businessId: businessId,
          type: 'QR_SCANNED',
          title: 'QR Code Scanned',
          message: `Your QR code was scanned by ${businessName}`,
          requiresAction: false,
          actionTaken: false,
          isRead: false,
          data: {
            businessName: businessName,
            scanTime: new Date().toISOString(),
            location: 'In-store'
          }
        });
      } catch (notificationError) {
        console.error('Error creating QR scan notification:', notificationError);
      }

      // Check customer enrollment status with this business
      const enrollmentStatus = await CustomerService.getCustomerEnrollmentStatus(customerId, businessId);
      
      if (!enrollmentStatus.isEnrolled || enrollmentStatus.programIds.length === 0) {
        // Customer not enrolled - show enrollment options
        console.log(`Customer ${customerId} not enrolled with business ${businessId}`);
        
        // Get available programs for this business
        const availablePrograms = await sql`
          SELECT id, name, description, points_multiplier, is_active
          FROM loyalty_programs 
          WHERE business_id = ${businessId} AND is_active = true
          ORDER BY created_at DESC
        `;

            return {
              success: true,
          message: `Customer found but not enrolled. ${availablePrograms.length} programs available for enrollment.`,
              customerId: customerId,
              businessId: businessId,
          pointsAwarded: 0,
              data: {
            action: 'ENROLLMENT_REQUIRED',
            availablePrograms: availablePrograms.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              pointsMultiplier: p.points_multiplier
            })),
            customerName: qrCodeData.name || `Customer ${customerId}`,
            businessName: businessName
          }
        };
        } else {
        // Customer is enrolled - SHOW CUSTOMER INFO (do not auto-award points)
        console.log(`🎯 Customer ${customerId} has ${enrollmentStatus.programIds.length} program(s). Ready for manual point awarding.`);
        
        // Get customer's programs for display (do not award points automatically)
        const customerPrograms = [];
          for (const programId of enrollmentStatus.programIds) {
            const card = await LoyaltyCardService.getCustomerCard(customerId, businessId, programId);
          if (card) {
            customerPrograms.push({
                  cardId: card.id,
                  programId: programId,
              programName: card.programName || `Program ${programId}`,
              currentPoints: card.points || 0
            });
          }
        }
        
        console.log(`📋 Found ${customerPrograms.length} program(s) for customer ${customerId}`);
        // NO AUTOMATIC POINT AWARDING - Let business choose in modal

        // Return successful scan result with customer info (no points awarded yet)
            return {
              success: true,
          message: `Customer ${customerId} found. ${customerPrograms.length} program(s) available. Ready to award points.`,
              customerId: customerId,
              businessId: businessId,
          pointsAwarded: 0, // No automatic points awarding
              data: {
            action: 'CUSTOMER_IDENTIFIED',
            customerPrograms: customerPrograms,
            enrollmentStatus: enrollmentStatus
          }
        };
      }
    } catch (error) {
      console.error('Error processing customer QR code:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error processing customer QR code'
      };
    }
  }

  /**
   * Process loyalty card QR code scan - FIXED: No automatic point awarding
   */
  private static async processLoyaltyCardQrCode(
    qrCodeData: LoyaltyCardQrCodeData,
    businessId: string,
    pointsToAward: number
  ): Promise<any> {
    try {
      const customerId = qrCodeData.customerId;
      const cardId = qrCodeData.cardId;
      const programId = qrCodeData.programId;
      const programName = qrCodeData.programName || "Loyalty Program";
      
      // Get the business name
      const businessResult = await sql`
        SELECT name FROM users WHERE id = ${parseInt(businessId)}
      `;
      
      const businessName = businessResult.length > 0 
        ? businessResult[0].name 
        : 'Business';
      
      // FIXED: Do not automatically award points, just return card info
      console.log(`🎯 Loyalty Card QR scanned: Card ${cardId}, Program ${programId}. Ready for manual point awarding.`);
      
      // Get current card info for display (no automatic point awarding)
      const cardInfo = await sql`
        SELECT lc.*, lp.name as program_name
        FROM loyalty_cards lc
        LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
        WHERE lc.id = ${cardId}
      `;
      
      const success = cardInfo.length > 0; // Just check if card exists

      if (success) {
        // Return card info for display (no points awarded yet)
        return {
          success: true,
          message: `Loyalty card found. Ready to award points.`,
          customerId: customerId,
          businessId: businessId,
          cardId: cardId,
          pointsAwarded: 0, // No automatic points
          data: {
            action: 'CARD_IDENTIFIED',
            cardInfo: cardInfo[0],
            programName: programName
          }
        };
      } else {
        return {
          success: false,
          message: 'Loyalty card not found'
        };
      }
    } catch (error) {
      console.error('Error processing loyalty card QR code:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error processing loyalty card QR code'
      };
    }
  }

  /**
   * Process promo code QR code scan
   */
  private static async processPromoCodeQrCode(
    qrCodeData: PromoCodeQrCodeData,
    businessId: string
  ): Promise<QrCodeProcessingResult> {
    try {
      const promoCode = qrCodeData.promoCode;
      
      // Validate promo code
      const promoResult = await sql`
        SELECT * FROM promo_codes 
        WHERE code = ${promoCode} 
        AND business_id = ${businessId}
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      `;

      if (promoResult.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired promo code'
        };
      }

      const promo = promoResult[0];

      return {
        success: true,
        message: `Promo code "${promoCode}" scanned successfully!`,
        data: {
          action: 'PROMO_CODE_SCANNED',
          promoCode: promo.code,
          discount: promo.discount_percentage,
          description: promo.description
        }
      };
    } catch (error) {
      console.error('Error processing promo code QR code:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error processing promo code'
      };
    }
  }

  /**
   * Log a QR code scan for monitoring and analytics
   */
  private static async logScan(
    scanType: string,
    scannedBy: string,
    qrCodeData: any,
    isValid: boolean,
    metadata: any = {}
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO qr_scan_logs (
          scan_type,
          scanned_by,
          qr_code_data,
          is_valid,
          metadata,
          scanned_at
        ) VALUES (
          ${scanType},
          ${scannedBy},
          ${JSON.stringify(qrCodeData)},
          ${isValid},
          ${JSON.stringify(metadata)},
          NOW()
        )
      `;
    } catch (error) {
      console.error('Error logging QR scan:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Record a QR code scan for analytics
   */
  private static async recordQrCodeScan(
    scanType: string,
    customerId: string,
    businessId: string,
    isValid: boolean,
    details: any = {}
  ): Promise<void> {
    try {
      await QrCodeStorageService.recordQrCodeScan(
        `${scanType}-${Date.now()}`,
        businessId,
        isValid,
        {
          scanType,
          customerId,
          businessId,
          timestamp: new Date().toISOString(),
          ...details
        }
      );
    } catch (error) {
      console.error('Error recording QR scan analytics:', error);
      // Don't throw error to avoid breaking the main flow
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