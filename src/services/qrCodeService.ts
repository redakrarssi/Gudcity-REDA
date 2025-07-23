import sql from '../utils/db';
import { createStandardCustomerQRCode, createStandardPromoQRCode, createStandardLoyaltyCardQRCode } from '../utils/standardQrCodeGenerator';
import { QrCodeStorageService } from './qrCodeStorageService';
import env from '../utils/env';
import rateLimiter from '../utils/rateLimiter';
import crypto from 'crypto';

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
  private static readonly SECRET_KEY = env.QR_SECRET_KEY || 'gudcity-qrcode-security-key';
  private static readonly MAX_RETRY_COUNT = 3;
  private static readonly RETRY_DELAY_MS = 500;
  private static readonly QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';
  
  /**
   * Generate a QR code image URL from data
   * @param data The data to encode in the QR code
   * @param size The size of the QR code image (default: 200x200)
   * @param errorCorrectionLevel The error correction level (L, M, Q, H)
   * @returns Promise resolving to the QR code image URL
   */
  static async generateQrCode(
    data: string,
    size: string = '200x200',
    errorCorrectionLevel: string = 'M'
  ): Promise<string> {
    try {
      // Validate input
      if (!data) {
        throw new Error('QR code data is required');
      }
      
      // URL encode the data
      const encodedData = encodeURIComponent(data);
      
      // Construct the QR code API URL
      const qrCodeUrl = `${this.QR_API_URL}?size=${size}&data=${encodedData}&ecc=${errorCorrectionLevel}`;
      
      return qrCodeUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }
  
  /**
   * Validate QR code data before processing with enhanced validation
   */
  static async validateQrData<T extends QrCodeData = QrCodeData>(
    scanType: QrScanLog['scan_type'], 
    data: unknown
  ): Promise<QrValidationResultExtended<T>> {
    try {
      // Basic validation using the enhanced validator
      const validationResult = safeValidateQrCode(data);
      
      if (!validationResult.valid || !validationResult.data) {
        const errorMessage = validationResult.error ? 
          (typeof validationResult.error.getUserMessage === 'function' ? 
            validationResult.error.getUserMessage() : 'Invalid QR code data') : 
          'Invalid QR code data';
        
        return { 
          valid: false, 
          message: errorMessage,
          error: validationResult.error
        };
      }
      
      // Verified data from basic validation
      const parsedData = validationResult.data as T;
      
      if (!parsedData) {
        return { valid: false, message: 'Failed to parse QR code data' };
      }
      
      // Additional validation based on scan type
      switch (scanType) {
        case 'CUSTOMER_CARD':
          // Verify QR code exists in database
          if ('qrUniqueId' in parsedData && parsedData.qrUniqueId) {
            let storedQrCode: any = null;
            
            try {
              // Use database retry for resilience
              storedQrCode = await withRetryableQuery(
                () => QrCodeStorageService.getQrCodeByUniqueId(parsedData.qrUniqueId as string),
                { 
                  maxRetries: this.MAX_RETRY_COUNT, 
                  retryDelayMs: this.RETRY_DELAY_MS,
                  context: { 
                    qrUniqueId: parsedData.qrUniqueId, 
                    scanType 
                  }
                }
              );
            } catch (error) {
              logQrCodeError(error as Error, { 
                scanType, 
                qrUniqueId: parsedData.qrUniqueId as string
              });
              return { valid: false, message: 'Error verifying QR code. Please try again.', error: error as Error };
            }
            
            if (!storedQrCode) {
              return { valid: false, message: 'QR code not found in database' };
            }
            
            // Verify QR code status
            if (!storedQrCode.status || storedQrCode.status !== 'ACTIVE') {
              const status = storedQrCode.status || 'inactive';
              return { valid: false, message: `QR code is ${status.toLowerCase()}` };
            }
            
            // Verify digital signature with proper error handling
            try {
              const isValid = QrCodeStorageService.validateQrCode(storedQrCode);
              if (!isValid) {
                const securityError = new QrSecurityError('QR code signature validation failed', {
                  qrUniqueId: parsedData.qrUniqueId,
                  storedQrCodeId: storedQrCode.id || 'unknown'
                });
                
                logQrCodeError(securityError, {
                  scanType,
                  qrUniqueId: parsedData.qrUniqueId as string,
                  operation: 'validateSignature'
                });
                
                return { valid: false, message: 'QR code security verification failed', error: securityError };
              }
            } catch (error) {
              logQrCodeError(error as Error, { 
                scanType, 
                storedQrCodeId: storedQrCode.id || 'unknown' 
              });
              return { valid: false, message: 'QR code security verification failed', error: error as Error };
            }
            
            // Verify expiration
            const expiryDate = storedQrCode.expiry_date ? new Date(storedQrCode.expiry_date) : null;
            if (expiryDate && expiryDate < new Date()) {
              try {
                // Only attempt to update expiry if we have a valid ID
                if (storedQrCode.id) {
                  await QrCodeStorageService.checkAndUpdateExpiry(storedQrCode.id);
                }
              } catch (error) {
                logQrCodeError(error as Error, { 
                  scanType, 
                  operation: 'updateExpiry', 
                  qrCodeId: storedQrCode.id || 'unknown'
                });
              }
              return { valid: false, message: 'QR code has expired' };
            }
            
            // Check for token rotation if needed
            try {
              const needsRotation = await this.checkTokenRotation(storedQrCode);
              if (needsRotation) {
                return { valid: false, message: 'QR code needs to be refreshed. Please get an updated code.' };
              }
            } catch (error) {
              logQrCodeError(error as Error, { 
                scanType, 
                operation: 'tokenRotation',
                qrCodeId: storedQrCode.id || 'unknown'
              });
              return { valid: false, message: 'Error verifying QR code freshness. Please try again.', error: error as Error };
            }
            
            // Verify customer still exists using retryable query
            const customerId = storedQrCode.customer_id;
            if (!customerId) {
              return { valid: false, message: 'Invalid QR code: missing customer ID' };
            }
            
            try {
              const customerExists = await withRetryableQuery(
                async () => {
                  const result = await sql`
                    SELECT id FROM customers WHERE id = ${customerId} LIMIT 1
                  `;
                  return result.length > 0;
                },
                { 
                  maxRetries: this.MAX_RETRY_COUNT, 
                  retryDelayMs: this.RETRY_DELAY_MS,
                  context: { customerId, operation: 'verifyCustomerExists' }
                }
              );
              
              if (!customerExists) {
                return { valid: false, message: 'Customer not found' };
              }
            } catch (error) {
              logQrCodeError(error as Error, { 
                scanType, 
                customerId,
                operation: 'verifyCustomerExists'
              });
              return { valid: false, message: 'Error verifying customer. Please try again.', error: error as Error };
            }
          }
          
          // Return the verified data
          return { 
            valid: true, 
            message: 'QR code is valid', 
            verifiedData: parsedData 
          };
          
        case 'LOYALTY_CARD':
          // Verify card ID and customer ID
          if (isLoyaltyCardQrCodeData(parsedData)) {
            if (!parsedData.cardId) {
              return { valid: false, message: 'Invalid loyalty card: missing card ID' };
            }
            
            if (!parsedData.customerId) {
              return { valid: false, message: 'Invalid loyalty card: missing customer ID' };
            }
            
            // Return the verified data
            return { 
              valid: true, 
              message: 'Loyalty card QR code is valid', 
              verifiedData: parsedData 
            };
          }
          return { valid: false, message: 'Invalid loyalty card QR code format' };
          
        case 'PROMO_CODE':
          // Verify promo code
          if (isPromoCodeQrCodeData(parsedData)) {
            if (!parsedData.code) {
              return { valid: false, message: 'Invalid promo code: missing code' };
            }
            
            // Return the verified data
            return { 
              valid: true, 
              message: 'Promo code QR code is valid', 
              verifiedData: parsedData 
            };
          }
          return { valid: false, message: 'Invalid promo code QR code format' };
          
        default:
          return { valid: false, message: `Unsupported scan type: ${scanType}` };
      }
    } catch (error) {
      logQrCodeError(error as Error, { scanType, operation: 'validateQrData' });
      return { 
        valid: false, 
        message: 'Error validating QR code data', 
        error: error as Error 
      };
    }
  }
  
  /**
   * Check if a QR code token needs to be rotated for security
   */
  private static async checkTokenRotation(qrCode: any): Promise<boolean> {
    try {
      // If rotation is disabled (0 days), skip rotation
      if (!env.QR_TOKEN_ROTATION_DAYS || env.QR_TOKEN_ROTATION_DAYS <= 0) {
        return false;
      }

      // If qrCode is missing created_at, use a conservative approach
      if (!qrCode || !qrCode.created_at) {
        console.warn('QR code missing creation date in checkTokenRotation');
        return false; // Don't trigger rotation for invalid data
      }

      // Calculate expiration based on creation date
      const creationDate = new Date(qrCode.created_at);
      if (isNaN(creationDate.getTime())) {
        console.warn('Invalid creation date in QR code');
        return false; // Invalid date, don't trigger rotation
      }
      
      const rotationDate = new Date(creationDate);
      rotationDate.setDate(rotationDate.getDate() + env.QR_TOKEN_ROTATION_DAYS);
      
      // If current date is past rotation date, token needs rotation
      const currentDate = new Date();
      return currentDate > rotationDate;
    } catch (error) {
      console.error('Error in checkTokenRotation:', error);
      return false; // Default to not rotating on error
    }
  }

  /**
   * Generate a new token for a QR code and update it in the database
   * @param qrCodeId The ID of the QR code to rotate
   * @returns The new QR code data or null on failure
   */
  static async rotateQrCodeToken(qrCodeId: number): Promise<any | null> {
    if (!qrCodeId || isNaN(qrCodeId) || qrCodeId <= 0) {
      console.error('Invalid QR code ID for rotation');
      return null;
    }
    
    // Retry logic for rotation
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Get the current QR code
        const qrCode = await QrCodeStorageService.getQrCodeById(qrCodeId);
        if (!qrCode) {
          console.error(`QR code not found for rotation: ${qrCodeId}`);
          return null;
        }
        
        // Ensure qrCode has required properties
        if (!qrCode.qr_data) {
          console.error(`QR code ${qrCodeId} missing required data for rotation`);
          return null;
        }

        // Begin transaction for atomicity
        await sql.begin();
        
        try {
          // Create a new QR code with updated data
          const qrData = typeof qrCode.qr_data === 'string' ? 
            JSON.parse(qrCode.qr_data) : qrCode.qr_data;
            
          const newQrUniqueId = crypto.randomUUID();
          
          // Update the data with new identifiers
          qrData.qrUniqueId = newQrUniqueId;
          qrData.timestamp = Date.now();
          qrData.rotationDate = new Date().toISOString();
          qrData.previousId = qrCode.qr_unique_id; // Keep reference to previous QR
          
          // Generate a new digital signature with full payloads
          const signature = crypto
            .createHmac('sha256', this.SECRET_KEY)
            .update(JSON.stringify({
              data: qrData,
              created: new Date().toISOString(),
              version: '2.0' // Increment version to indicate rotation
            }))
            .digest('hex');
          
          // Mark the old QR code as replaced
          await QrCodeStorageService.updateQrCodeStatus(
            qrCodeId, 
            'REPLACED', 
            'Replaced during token rotation'
          );
          
          // Create a new QR code record
          const newQrCode = await QrCodeStorageService.createQrCode({
            customerId: qrCode.customer_id,
            businessId: qrCode.business_id,
            qrType: qrCode.qr_type,
            data: qrData,
            imageUrl: qrCode.qr_image_url,
            isPrimary: qrCode.is_primary,
            digitalSignature: signature
          });
          
          // Commit transaction
          await sql.commit();
          
          console.log(`Successfully rotated QR code token: ${qrCodeId} -> ${newQrCode?.id || 'unknown'}`);
          return newQrCode;
        } catch (txError) {
          // Roll back on error
          try {
            await sql.rollback();
          } catch (rollbackError) {
            console.error('Error during transaction rollback in QR rotation:', rollbackError);
          }
          
          // If this is the last attempt, throw the error
          if (attempts >= maxAttempts) {
            throw txError;
          }
          
          // Otherwise, wait and retry
          console.warn(`Error during QR code rotation (attempt ${attempts}/${maxAttempts}):`, txError);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error('Error rotating QR code token after multiple attempts:', error);
          return null;
        }
        
        console.warn(`Error in QR code rotation (attempt ${attempts}/${maxAttempts}):`, error);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return null;
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
   * Process customer QR code scan
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

      // Check if customer is already enrolled in any business programs
      const enrollmentStatus = await CustomerService.getCustomerEnrollmentStatus(customerId, businessId);
      
      if (!enrollmentStatus.isEnrolled) {
        // Customer not enrolled - get default program and request enrollment
        const defaultProgram = await LoyaltyProgramService.getDefaultBusinessProgram(businessId);
        
        if (defaultProgram) {
          // Create enrollment approval request
          try {
            await CustomerNotificationService.createApprovalRequest({
              customerId: customerId,
              businessId: businessId,
              requestType: 'ENROLLMENT',
              entityId: defaultProgram.id,
              data: {
                programId: defaultProgram.id,
                programName: defaultProgram.name,
                businessId: businessId,
                businessName: businessName,
                programType: defaultProgram.type,
                programDescription: defaultProgram.description,
                message: `${businessName} would like to enroll you in their ${defaultProgram.name} loyalty program`
              }
            });

            // Emit QR scan event for analytics
            try {
              this.recordQrCodeScan(
                'CUSTOMER_CARD',
                customerId,
                businessId,
                true,
                {
                  action: 'ENROLLMENT_REQUESTED',
                  programName: defaultProgram.name
                }
              );
            } catch (analyticsError) {
              console.error('Error recording QR scan analytics:', analyticsError);
            }

            return {
              success: true,
              message: `QR code scanned successfully. Enrollment request sent to customer.`,
              customerId: customerId,
              businessId: businessId,
              programId: defaultProgram.id,
              data: {
                action: 'ENROLLMENT_REQUESTED',
                programName: defaultProgram.name
              }
            };
          } catch (error) {
            console.error('Error creating enrollment request:', error);
            return {
              success: false,
              message: 'QR code scanned but failed to create enrollment request'
            };
          }
        } else {
          return {
            success: false,
            message: 'QR code scanned but no loyalty programs available for enrollment'
          };
        }
      } else {
        // Customer is enrolled - award points to their cards
        try {
          let totalPointsAwarded = 0;
          const cardUpdates = [];

          for (const programId of enrollmentStatus.programIds) {
            const card = await LoyaltyCardService.getCustomerCard(customerId, businessId, programId);
            
            if (card) {
              const success = await LoyaltyCardService.awardPointsToCard(
                card.id,
                pointsToAward,
                'SCAN',
                `QR code scan at ${businessName}`,
                `qr-scan-${Date.now()}`,
                businessId
              );
              
              if (success) {
                totalPointsAwarded += pointsToAward;
                cardUpdates.push({
                  cardId: card.id,
                  programId: programId,
                  pointsAwarded: pointsToAward
                });
              }
            }
          }

          if (totalPointsAwarded > 0) {
            // Get program name for better user experience
            let programName = "Loyalty Program";
            try {
              const programResult = await sql`
                SELECT name FROM loyalty_programs WHERE id = ${enrollmentStatus.programIds[0]}
              `;
              if (programResult && programResult.length > 0) {
                programName = programResult[0].name;
              }
            } catch (err) {
              console.error('Error fetching program name:', err);
            }
            
            // Send notification about points awarded
            try {
              await CustomerNotificationService.createNotification({
                customerId: customerId,
                businessId: businessId,
                type: 'POINTS_ADDED',
                title: 'Points Added',
                message: `You've received ${totalPointsAwarded} points from ${businessName} in the program ${programName}`,
                requiresAction: false,
                actionTaken: false,
                isRead: false,
                data: {
                  points: totalPointsAwarded,
                  businessName: businessName,
                  programName: programName,
                  source: 'QR_SCAN',
                  cardUpdates: cardUpdates
                }
              });
            } catch (notificationError) {
              console.error('Error creating points notification:', notificationError);
            }

            // Emit QR scan event for analytics
            try {
              this.recordQrCodeScan(
                'CUSTOMER_CARD',
                customerId,
                businessId,
                true,
                {
                  action: 'POINTS_AWARDED',
                  cardUpdates: cardUpdates
                }
              );
            } catch (analyticsError) {
              console.error('Error recording QR scan analytics:', analyticsError);
            }

            return {
              success: true,
              message: `QR code scanned successfully. ${totalPointsAwarded} points awarded!`,
              customerId: customerId,
              businessId: businessId,
              pointsAwarded: totalPointsAwarded,
              data: {
                action: 'POINTS_AWARDED',
                cardUpdates: cardUpdates
              }
            };
          } else {
            return {
              success: false,
              message: 'QR code scanned but failed to award points'
            };
          }
        } catch (error) {
          console.error('Error awarding points:', error);
          return {
            success: false,
            message: 'QR code scanned but failed to process point award'
          };
        }
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
   * Process loyalty card QR code scan
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
      
      // Award points to the card
      const { success } = await LoyaltyCardService.awardPointsToCard(
        cardId,
        pointsToAward,
        'SCAN',
        'QR code scan reward',
        `qr-scan-${Date.now()}`,
        businessId
      );

      if (success) {
        // Send notification about points awarded
        try {
          await CustomerNotificationService.createNotification({
            customerId: customerId,
            businessId: businessId,
            type: 'POINTS_ADDED',
            title: 'Points Added',
            message: `You've received ${pointsToAward} points from ${businessName} in the program ${programName}`,
            requiresAction: false,
            actionTaken: false,
            isRead: false,
            referenceId: cardId,
            data: {
              points: pointsToAward,
              businessName: businessName,
              programName: programName,
              cardId: cardId,
              source: 'LOYALTY_CARD_SCAN'
            }
          });
        } catch (notificationError) {
          console.error('Error creating points notification:', notificationError);
        }

        // Emit QR scan event for analytics
        try {
          this.recordQrCodeScan(
            'LOYALTY_CARD',
            customerId,
            businessId,
            true,
            {
              action: 'POINTS_AWARDED',
              cardId: cardId
            }
          );
        } catch (analyticsError) {
          console.error('Error recording QR scan analytics:', analyticsError);
        }

        return {
          success: true,
          message: `Loyalty card scanned successfully. ${pointsToAward} points awarded!`,
          customerId: customerId,
          businessId: businessId,
          cardId: cardId,
          pointsAwarded: pointsToAward
        };
      } else {
        return {
          success: false,
          message: 'Failed to award points to loyalty card'
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
      const promoCode = qrCodeData.code || '';
      
      if (!promoCode) {
        return {
          success: false,
          message: 'Invalid promo code QR code - missing code'
        };
      }

      // For now, just return success - implement promo code validation later
      return {
        success: true,
        message: `Promo code ${promoCode} scanned successfully`,
        businessId: businessId,
        data: {
          promoCode: promoCode,
          action: 'PROMO_CODE_SCANNED'
        }
      };
    } catch (error) {
      console.error('Error processing promo code QR code:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error processing promo code QR code'
      };
    }
  }

  /**
   * Record QR code scan for analytics
   */
  static async recordQrCodeScan(
    qrCodeType: string,
    customerId: string,
    businessId: string,
    success: boolean,
    data: any = {}
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO qr_scan_logs (
          qr_code_type,
          customer_id,
          business_id,
          success,
          scan_data,
          scanned_at
        )
        VALUES (
          ${qrCodeType},
          ${customerId},
          ${businessId},
          ${success},
          ${JSON.stringify(data)},
          NOW()
        )
      `;
    } catch (error) {
      console.error('Error recording QR code scan:', error);
      // Don't throw, this is for analytics only
    }
  }

  /**
   * Ensure QR scan logs table exists
   */
  static async ensureQrScanLogsTable(): Promise<void> {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS qr_scan_logs (
          id SERIAL PRIMARY KEY,
          qr_code_type VARCHAR(50) NOT NULL,
          customer_id VARCHAR(255) NOT NULL,
          business_id VARCHAR(255) NOT NULL,
          success BOOLEAN NOT NULL,
          scan_data JSONB,
          scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_customer 
        ON qr_scan_logs(customer_id)
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_business 
        ON qr_scan_logs(business_id)
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_scanned_at 
        ON qr_scan_logs(scanned_at)
      `;
    } catch (error) {
      console.error('Error ensuring QR scan logs table:', error);
    }
  }
}

export default QrCodeService; 