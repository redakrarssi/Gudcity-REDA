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

export interface QrCodeStats {
  totalScans: number;
  successfulScans: number;
  customerScans: number;
  promoScans: number;
  loyaltyScans: number;
  pointsAwarded: number;
}

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

export interface LoyaltyCardProcessResult {
  success: boolean;
  message: string;
  pointsAwarded?: number;
}

export interface BusinessPerformance {
  business_id: number;
  business_name: string;
  total_scans: string | number;
  success_rate: string | number;
}

export class QrCodeService {
  private static readonly SECRET_KEY = env.QR_SECRET_KEY || 'gudcity-qrcode-security-key';
  
  /**
   * Validate QR code data before processing with enhanced validation
   */
  static async validateQrData(scanType: QrScanLog['scan_type'], data: any): Promise<{ valid: boolean; message: string; verifiedData?: any }> {
    try {
      // Basic validation using the enhanced validator
      const validationResult = safeValidateQrCode(data);
      
      if (!validationResult.valid) {
        return { 
          valid: false, 
          message: validationResult.error?.userMessage || 'Invalid QR code data' 
        };
      }
      
      // Verified data from basic validation
      const parsedData = validationResult.data;
      
      if (!parsedData) {
        return { valid: false, message: 'Failed to parse QR code data' };
      }
      
      // Additional validation based on scan type
      switch (scanType) {
        case 'CUSTOMER_CARD':
          // Verify QR code exists in database
          if (parsedData.qrUniqueId) {
            let storedQrCode;
            
            try {
              // Use database retry for resilience
              storedQrCode = await withRetryableQuery(
                () => QrCodeStorageService.getQrCodeByUniqueId(parsedData.qrUniqueId),
                { qrUniqueId: parsedData.qrUniqueId, scanType }
              );
            } catch (error) {
              logQrCodeError(error as Error, { 
                scanType, 
                qrUniqueId: parsedData.qrUniqueId 
              });
              return { valid: false, message: 'Error verifying QR code. Please try again.' };
            }
            
            if (!storedQrCode) {
              return { valid: false, message: 'QR code not found in database' };
            }
            
            // Verify QR code status
            if (storedQrCode.status !== 'ACTIVE') {
              return { valid: false, message: `QR code is ${storedQrCode.status.toLowerCase()}` };
            }
            
            // Verify digital signature with proper error handling
            try {
              const isValid = QrCodeStorageService.validateQrCode(storedQrCode);
              if (!isValid) {
                throw new QrSecurityError('QR code signature validation failed', {
                  qrUniqueId: parsedData.qrUniqueId,
                  storedQrCodeId: storedQrCode.id
                });
              }
            } catch (error) {
              logQrCodeError(error as Error, { scanType, storedQrCodeId: storedQrCode.id });
              return { valid: false, message: 'QR code security verification failed' };
            }
            
            // Verify expiration
            if (storedQrCode.expiry_date && new Date(storedQrCode.expiry_date) < new Date()) {
              try {
                await QrCodeStorageService.checkAndUpdateExpiry(storedQrCode.id);
              } catch (error) {
                logQrCodeError(error as Error, { 
                  scanType, 
                  operation: 'updateExpiry', 
                  qrCodeId: storedQrCode.id 
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
                qrCodeId: storedQrCode.id
              });
              return { valid: false, message: 'Error verifying QR code freshness. Please try again.' };
            }
            
            // Verify customer still exists using retryable query
            try {
              const customerCheck = await withRetryableQuery(
                () => sql`
                  SELECT id FROM users 
                  WHERE id = ${storedQrCode.customer_id}
                  AND user_type = 'customer'
                  AND status = 'active'
                `,
                { customerId: storedQrCode.customer_id }
              );
              
              if (!customerCheck.length) {
                return { valid: false, message: 'Customer not found or inactive' };
              }
            } catch (error) {
              logQrCodeError(error as Error, { 
                scanType, 
                operation: 'customerCheck',
                customerId: storedQrCode.customer_id
              });
              return { valid: false, message: 'Error verifying customer status. Please try again.' };
            }
            
            // Return the verified data from the database
            return { 
              valid: true, 
              message: 'QR code verified successfully',
              verifiedData: storedQrCode.qr_data
            };
          }
          break;
        
        case 'PROMO_CODE':
          if (!parsedData.promoId || !parsedData.code) {
            return { valid: false, message: 'Invalid promo code data: missing required fields' };
          }
          
          // Verify QR code exists in database if it has a uniqueId
          if (parsedData.qrUniqueId) {
            const storedQrCode = await QrCodeStorageService.getQrCodeByUniqueId(parsedData.qrUniqueId);
            
            if (!storedQrCode) {
              return { valid: false, message: 'Promo QR code not found in database' };
            }
            
            // Verify QR code status
            if (storedQrCode.status !== 'ACTIVE') {
              return { valid: false, message: `Promo code is ${storedQrCode.status.toLowerCase()}` };
            }
            
            // Verify digital signature
            if (!QrCodeStorageService.validateQrCode(storedQrCode)) {
              return { valid: false, message: 'Promo code signature validation failed' };
            }
            
            // Return the verified data
            return { 
              valid: true, 
              message: 'Promo code verified successfully', 
              verifiedData: storedQrCode.qr_data
            };
          }
          
          // For backward compatibility, check promo code in database
          const promoCheck = await sql`
            SELECT id, is_active, valid_until FROM promotions
            WHERE id = ${parsedData.promoId}
            AND code = ${parsedData.code}
          `;
          
          if (!promoCheck.length) {
            return { valid: false, message: 'Promo code not found' };
          }
          
          if (!promoCheck[0].is_active) {
            return { valid: false, message: 'Promo code is inactive' };
          }
          
          if (promoCheck[0].valid_until && new Date(promoCheck[0].valid_until) < new Date()) {
            return { valid: false, message: 'Promo code has expired' };
          }
          break;
          
        case 'LOYALTY_CARD':
          if (!parsedData.programId || !parsedData.customerId) {
            return { valid: false, message: 'Invalid loyalty card data: missing required fields' };
          }
          
          // Verify QR code exists in database if it has a uniqueId
          if (parsedData.qrUniqueId) {
            const storedQrCode = await QrCodeStorageService.getQrCodeByUniqueId(parsedData.qrUniqueId);
            
            if (!storedQrCode) {
              return { valid: false, message: 'Loyalty card QR code not found in database' };
            }
            
            // Verify QR code status
            if (storedQrCode.status !== 'ACTIVE') {
              return { valid: false, message: `Loyalty card is ${storedQrCode.status.toLowerCase()}` };
            }
            
            // Verify digital signature
            if (!QrCodeStorageService.validateQrCode(storedQrCode)) {
              return { valid: false, message: 'Loyalty card signature validation failed' };
            }
            
            // Verify the loyalty card still exists
            const cardCheck = await sql`
              SELECT id, is_active FROM loyalty_cards
              WHERE customer_id = ${storedQrCode.customer_id}
              AND program_id = ${parsedData.programId}
            `;
            
            if (!cardCheck.length) {
              return { valid: false, message: 'Loyalty card not found' };
            }
            
            if (!cardCheck[0].is_active) {
              return { valid: false, message: 'Loyalty card is inactive' };
            }
            
            // Return the verified data
            return { 
              valid: true, 
              message: 'Loyalty card verified successfully',
              verifiedData: storedQrCode.qr_data
            };
          }
          
          // For backward compatibility, check loyalty card in database
          const cardCheck = await sql`
            SELECT id, is_active FROM loyalty_cards
            WHERE customer_id = ${parsedData.customerId}
            AND program_id = ${parsedData.programId}
          `;
          
          if (!cardCheck.length) {
            return { valid: false, message: 'Loyalty card not found' };
          }
          
          if (!cardCheck[0].is_active) {
            return { valid: false, message: 'Loyalty card is inactive' };
          }
          break;
          
        default:
          return { valid: false, message: `Unknown scan type: ${scanType}` };
      }
      
      // If we get here without a return, it means we didn't validate completely
      return { valid: false, message: 'Incomplete validation process' };
    } catch (error) {
      // Comprehensive error logging
      logQrCodeError(error as Error, { scanType, data });
      
      if (error instanceof QrCodeError) {
        return { valid: false, message: error.userMessage };
      }
      
      return { valid: false, message: 'An error occurred during validation' };
    }
  }
  
  /**
   * Check if a QR code token needs rotation based on creation date
   * @param qrCode The QR code object from the database
   * @returns true if token needs rotation, false otherwise
   */
  private static async checkTokenRotation(qrCode: any): Promise<boolean> {
    // If rotation is disabled (0 days), skip rotation
    if (env.QR_TOKEN_ROTATION_DAYS <= 0) {
      return false;
    }

    // Calculate expiration based on creation date
    const creationDate = new Date(qrCode.created_at);
    const rotationDate = new Date(creationDate);
    rotationDate.setDate(rotationDate.getDate() + env.QR_TOKEN_ROTATION_DAYS);
    
    // If current date is past rotation date, token needs rotation
    const currentDate = new Date();
    return currentDate > rotationDate;
  }

  /**
   * Generate a new token for a QR code and update it in the database
   * @param qrCodeId The ID of the QR code to rotate
   * @returns The new QR code data or null on failure
   */
  static async rotateQrCodeToken(qrCodeId: number): Promise<any | null> {
    try {
      // Get the current QR code
      const qrCode = await QrCodeStorageService.getQrCodeById(qrCodeId);
      if (!qrCode) {
        console.error(`QR code not found for rotation: ${qrCodeId}`);
        return null;
      }

      // Create a new QR code with updated data
      const qrData = qrCode.qr_data;
      const newQrUniqueId = crypto.randomUUID();
      
      // Update the data with new identifiers
      qrData.qrUniqueId = newQrUniqueId;
      qrData.timestamp = Date.now();
      
      // Generate a new digital signature
      const signature = crypto
        .createHmac('sha256', this.SECRET_KEY)
        .update(JSON.stringify(qrData))
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
      
      return newQrCode;
    } catch (error) {
      console.error('Error rotating QR code token:', error);
      return null;
    }
  }
  
  /**
   * Process a QR code scan with enhanced error handling
   */
  static async processQrCodeScan(
    scanType: QrScanLog['scan_type'],
    scannedBy: number | string,
    scannedData: any,
    options: {
      customerId?: number | string;
      programId?: number | string;
      promoCodeId?: number | string;
      ipAddress?: string;
    } = {}
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number; scanLogId?: number; error?: any; rateLimited?: boolean }> {
    try {
      // Convert ID params to numbers
      const businessId = typeof scannedBy === 'string' ? parseInt(scannedBy, 10) : scannedBy;
      const customerId = options.customerId ? (typeof options.customerId === 'string' ? parseInt(options.customerId, 10) : options.customerId) : undefined;
      const programId = options.programId ? (typeof options.programId === 'string' ? parseInt(options.programId, 10) : options.programId) : undefined;
      const promoCodeId = options.promoCodeId ? (typeof options.promoCodeId === 'string' ? parseInt(options.promoCodeId, 10) : options.promoCodeId) : undefined;
      
      // Check rate limits first
      const rateLimiter = new RateLimiter();
      const rateLimitKey = `qrscan:${businessId}:${options.ipAddress || 'unknown'}`;
      const isRateLimited = await rateLimiter.isRateLimited(rateLimitKey);
      
      if (isRateLimited) {
        const error = new QrRateLimitError('Too many scan attempts', {
          businessId,
          ipAddress: options.ipAddress,
          scanType
        });
        
        logQrCodeError(error, {
          businessId,
          scanType,
          ipAddress: options.ipAddress
        });
        
        // Log the rate-limited scan attempt
        await this.logScan(
          scanType,
          businessId,
          scannedData,
          false,
          {
            customerId,
            programId,
            promoCodeId,
            errorMessage: 'Rate limit exceeded'
          }
        );
        
        return {
          success: false,
          message: error.userMessage,
          rateLimited: true
        };
      }
      
      // Increment rate limit counter
      await rateLimiter.increment(rateLimitKey);
      
      // Validate the QR code data
      const validation = await this.validateQrData(scanType, scannedData);
      
      if (!validation.valid) {
        // Log the failed scan
        const scanLogId = await this.logScan(
          scanType,
          businessId,
          scannedData,
          false,
          {
            customerId,
            programId,
            promoCodeId,
            errorMessage: validation.message
          }
        );
        
        return {
          success: false,
          message: validation.message,
          scanLogId
        };
      }
      
      // Use the verified data from validation
      const verifiedData = validation.verifiedData || scannedData;
      
      // Process the scan based on type using retryable transactions
      let result;
      
      try {
        switch (scanType) {
          case 'CUSTOMER_CARD':
            result = await withRetryableTransaction(
              () => this.processCustomerCard(businessId, verifiedData, customerId),
              { businessId, scanType, customerId }
            );
            break;
            
          case 'PROMO_CODE':
            result = await withRetryableTransaction(
              () => this.processPromoCode(businessId, verifiedData, customerId, promoCodeId),
              { businessId, scanType, customerId, promoCodeId }
            );
            break;
            
          case 'LOYALTY_CARD':
            result = await withRetryableTransaction(
              () => this.processLoyaltyCard(businessId, verifiedData, customerId, programId),
              { businessId, scanType, customerId, programId }
            );
            break;
            
          default:
            throw new QrValidationError(`Invalid scan type: ${scanType}`, { scanType });
        }
      } catch (error) {
        // Log processing error
        logQrCodeError(error, {
          businessId,
          scanType,
          customerId,
          programId,
          promoCodeId
        });
        
        // Log the failed scan
        const scanLogId = await this.logScan(
          scanType,
          businessId,
          scannedData,
          false,
          {
            customerId,
            programId,
            promoCodeId,
            errorMessage: error instanceof Error ? error.message : 'Unknown processing error'
          }
        );
        
        if (error instanceof QrCodeError) {
          return {
            success: false,
            message: error.userMessage,
            scanLogId,
            error
          };
        }
        
        return {
          success: false,
          message: 'An error occurred while processing the QR code. Please try again.',
          scanLogId,
          error
        };
      }
      
      // Log the successful scan
      const scanLogId = await this.logScan(
        scanType,
        businessId,
        scannedData,
        result.success,
        {
          customerId,
          programId,
          promoCodeId,
          pointsAwarded: result.pointsAwarded,
          errorMessage: result.success ? undefined : result.message
        }
      );
      
      return {
        ...result,
        scanLogId
      };
    } catch (error) {
      // Catch any unhandled errors
      logQrCodeError(error, {
        scanType,
        scannedBy,
        options
      });
      
      // Try to log the error
      try {
        await this.logScan(
          scanType,
          typeof scannedBy === 'string' ? parseInt(scannedBy, 10) : scannedBy,
          scannedData,
          false,
          {
            customerId: options.customerId,
            programId: options.programId,
            promoCodeId: options.promoCodeId,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        );
      } catch (logError) {
        console.error('Failed to log scan error:', logError);
      }
      
      if (error instanceof QrCodeError) {
        return {
          success: false,
          message: error.userMessage,
          error
        };
      }
      
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
        error
      };
    }
  }
  
  /**
   * Process customer card scan
   */
  private static async processCustomerCard(businessId: number, data: any, customerId?: number): Promise<{ success: boolean; message: string }> {
    try {
      // Verify that the customer exists
      const customerCheck = await sql`
        SELECT id FROM users 
        WHERE id = ${customerId || data.customerId}
        AND user_type = 'customer'
      `;
      
      if (!customerCheck.length) {
        return { success: false, message: 'Customer not found' };
      }
      
      // Record the customer visit
      await sql`
        INSERT INTO customer_visits (
          business_id,
          customer_id,
          visit_time
        ) VALUES (
          ${businessId},
          ${customerId || data.customerId},
          NOW()
        )
      `;
      
      return { success: true, message: 'Customer card processed successfully' };
    } catch (error) {
      console.error('Error processing customer card:', error);
      return { success: false, message: 'Failed to process customer card' };
    }
  }
  
  /**
   * Process promo code scan
   */
  private static async processPromoCode(businessId: number, data: any, customerId?: number, promoCodeId?: number): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the promo code exists and is valid
      const promoCheck = await sql`
        SELECT id, code, expiry_date, is_active
        FROM promo_codes
        WHERE id = ${promoCodeId || data.promoId}
        AND code = ${data.code}
      `;
      
      if (!promoCheck.length) {
        return { success: false, message: 'Promo code not found' };
      }
      
      const promo = promoCheck[0];
      
      // Check if the promo is still active
      if (!promo.is_active) {
        return { success: false, message: 'Promo code is inactive' };
      }
      
      // Check if the promo has expired
      if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
        return { success: false, message: 'Promo code has expired' };
      }
      
      // Record promo code usage
      await sql`
        INSERT INTO promo_code_usages (
          promo_code_id,
          business_id,
          customer_id,
          used_at
        ) VALUES (
          ${promoCodeId || data.promoId},
          ${businessId},
          ${customerId === undefined ? null : customerId},
          NOW()
        )
      `;
      
      return { success: true, message: 'Promo code processed successfully' };
    } catch (error) {
      console.error('Error processing promo code:', error);
      return { success: false, message: 'Failed to process promo code' };
    }
  }
  
  /**
   * Process loyalty card scan
   */
  private static async processLoyaltyCard(businessId: number, data: any, customerId?: number, programId?: number): Promise<LoyaltyCardProcessResult> {
    try {
      // Verify the loyalty program exists
      const programCheck = await sql`
        SELECT id, points_per_scan, is_active
        FROM loyalty_programs
        WHERE id = ${programId || data.programId}
        AND business_id = ${businessId}
      `;
      
      if (!programCheck.length) {
        return { success: false, message: 'Loyalty program not found' };
      }
      
      const program = programCheck[0];
      
      // Check if the program is active
      if (!program.is_active) {
        return { success: false, message: 'Loyalty program is inactive' };
      }
      
      const customerIdToUse = customerId || data.customerId;
      
      // Check if the customer exists
      const customerCheck = await sql`
        SELECT id FROM users
        WHERE id = ${customerIdToUse}
        AND user_type = 'customer'
      `;
      
      if (!customerCheck.length) {
        return { success: false, message: 'Customer not found' };
      }
      
      // Check if the customer is enrolled in the program
      const enrollmentCheck = await sql`
        SELECT id FROM loyalty_enrollments
        WHERE program_id = ${programId || data.programId}
        AND customer_id = ${customerIdToUse}
      `;
      
      if (!enrollmentCheck.length) {
        // Auto-enroll the customer
        await sql`
          INSERT INTO loyalty_enrollments (
            program_id,
            customer_id,
            enrolled_at,
            points_balance
          ) VALUES (
            ${programId || data.programId},
            ${customerIdToUse},
            NOW(),
            0
          )
        `;
      }
      
      // Award points
      const pointsToAward = program.points_per_scan || 1;
      
      await sql`
        UPDATE loyalty_enrollments
        SET points_balance = points_balance + ${pointsToAward},
            last_activity = NOW()
        WHERE program_id = ${programId || data.programId}
        AND customer_id = ${customerIdToUse}
      `;
      
      // Record the points transaction
      await sql`
        INSERT INTO loyalty_transactions (
          program_id,
          customer_id,
          business_id,
          points,
          transaction_type,
          transaction_date
        ) VALUES (
          ${programId || data.programId},
          ${customerIdToUse},
          ${businessId},
          ${pointsToAward},
          'SCAN',
          NOW()
        )
      `;
      
      return { 
        success: true, 
        message: `${pointsToAward} points awarded successfully`, 
        pointsAwarded: pointsToAward 
      };
    } catch (error) {
      console.error('Error processing loyalty card:', error);
      return { success: false, message: 'Failed to process loyalty card' };
    }
  }
  
  /**
   * Log a QR code scan in the database
   */
  static async logScan(
    scanType: QrScanLog['scan_type'],
    scannedBy: number | string,
    scannedData: any,
    success: boolean,
    options: {
      customerId?: number | string;
      programId?: number | string;
      promoCodeId?: number | string;
      pointsAwarded?: number;
      errorMessage?: string;
    } = {}
  ): Promise<number | null> {
    // Validate input parameters
    if (!scanType) {
      console.error('Missing scan type in logScan');
      return null;
    }
    
    if (!scannedBy) {
      console.error('Missing scanner ID in logScan');
      return null;
    }
    
    try {
      // Convert IDs to numbers
      const scannedById = typeof scannedBy === 'string' ? parseInt(scannedBy) : scannedBy;
      const customerIdNum = options.customerId 
        ? (typeof options.customerId === 'string' ? parseInt(options.customerId) : options.customerId) 
        : null;
      const programIdNum = options.programId 
        ? (typeof options.programId === 'string' ? parseInt(options.programId) : options.programId) 
        : null;
      const promoCodeIdNum = options.promoCodeId 
        ? (typeof options.promoCodeId === 'string' ? parseInt(options.promoCodeId) : options.promoCodeId) 
        : null;
      
      // Convert data to string if it's an object
      const scanDataString = typeof scannedData === 'string' 
        ? scannedData 
        : JSON.stringify(scannedData);
      
      // Validate converted IDs
      if (isNaN(scannedById) || scannedById <= 0) {
        console.error('Invalid scanner ID:', scannedBy);
        return null;
      }
      
      if (customerIdNum !== null && (isNaN(customerIdNum) || customerIdNum <= 0)) {
        console.error('Invalid customer ID:', options.customerId);
        return null;
      }
      
      if (programIdNum !== null && (isNaN(programIdNum) || programIdNum <= 0)) {
        console.error('Invalid program ID:', options.programId);
        return null;
      }
      
      if (promoCodeIdNum !== null && (isNaN(promoCodeIdNum) || promoCodeIdNum <= 0)) {
        console.error('Invalid promo code ID:', options.promoCodeId);
        return null;
      }
      
      // Insert scan log
      const result = await sql`
        INSERT INTO qr_scan_logs (
          scan_type,
          scanned_by,
          scanned_data,
          customer_id,
          program_id,
          promo_code_id,
          points_awarded,
          success,
          error_message,
          created_at
        ) VALUES (
          ${scanType},
          ${scannedById},
          ${scanDataString},
          ${customerIdNum},
          ${programIdNum},
          ${promoCodeIdNum},
          ${options.pointsAwarded || null},
          ${success},
          ${options.errorMessage || null},
          NOW()
        )
        RETURNING id
      `;
      
      if (result && result.length > 0) {
        // Also log details for analytics
        try {
          await sql`
            INSERT INTO scan_analytics (
              scan_log_id,
              scan_type,
              business_id,
              customer_id,
              program_id,
              success,
              points_awarded,
              scan_date
            ) VALUES (
              ${result[0].id},
              ${scanType},
              ${scannedById},
              ${customerIdNum},
              ${programIdNum},
              ${success},
              ${options.pointsAwarded || 0},
              NOW()
            )
          `;
        } catch (analyticsError) {
          console.error('Failed to log scan analytics (non-critical):', analyticsError);
          // Continue anyway - analytics are non-critical
        }
        
        return result[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error logging QR code scan:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }
  
  /**
   * Get recent QR code scans for a business with pagination
   */
  static async getRecentScans(
    businessId: number | string, 
    page = 1,
    limit = 10
  ): Promise<{ scans: QrScanLog[]; total: number; pages: number }> {
    try {
      const businessIdNum = typeof businessId === 'string' ? parseInt(businessId) : businessId;
      const offset = (page - 1) * limit;
      
      // Check if the table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'qr_scan_logs'
        ) as exists
      `;
      
      if (!tableExists[0]?.exists) {
        return { scans: [], total: 0, pages: 0 };
      }
      
      // Get total count
      const countResult = await sql`
        SELECT COUNT(*) as total
        FROM qr_scan_logs
        WHERE scanned_by = ${businessIdNum}
      `;
      
      const total = parseInt(countResult[0]?.total || '0');
      const pages = Math.ceil(total / limit);
      
      // Get scans with pagination
      const scans = await sql`
        SELECT * FROM qr_scan_logs
        WHERE scanned_by = ${businessIdNum}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      return { 
        scans: scans as QrScanLog[], 
        total, 
        pages 
      };
    } catch (error) {
      console.error('Error getting recent QR scans:', error);
      return { scans: [], total: 0, pages: 0 };
    }
  }
  
  /**
   * Get detailed scan statistics for a business
   */
  static async getScanStats(businessId: number | string): Promise<QrCodeStats> {
    try {
      const businessIdNum = typeof businessId === 'string' ? parseInt(businessId) : businessId;
      
      // Check if the table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'qr_scan_logs'
        ) as exists
      `;
      
      if (!tableExists[0]?.exists) {
        return {
          totalScans: 0,
          successfulScans: 0,
          customerScans: 0,
          promoScans: 0,
          loyaltyScans: 0,
          pointsAwarded: 0
        };
      }
      
      // Get stats
      const result = await sql`
        SELECT
          COUNT(*) as total_scans,
          SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successful_scans,
          SUM(CASE WHEN scan_type = 'CUSTOMER_CARD' THEN 1 ELSE 0 END) as customer_scans,
          SUM(CASE WHEN scan_type = 'PROMO_CODE' THEN 1 ELSE 0 END) as promo_scans,
          SUM(CASE WHEN scan_type = 'LOYALTY_CARD' THEN 1 ELSE 0 END) as loyalty_scans,
          COALESCE(SUM(points_awarded), 0) as points_awarded
        FROM qr_scan_logs
        WHERE scanned_by = ${businessIdNum}
      `;
      
      return {
        totalScans: parseInt(result[0]?.total_scans || '0'),
        successfulScans: parseInt(result[0]?.successful_scans || '0'),
        customerScans: parseInt(result[0]?.customer_scans || '0'),
        promoScans: parseInt(result[0]?.promo_scans || '0'),
        loyaltyScans: parseInt(result[0]?.loyalty_scans || '0'),
        pointsAwarded: parseInt(result[0]?.points_awarded || '0')
      };
    } catch (error) {
      console.error('Error getting QR scan stats:', error);
      return {
        totalScans: 0,
        successfulScans: 0,
        customerScans: 0,
        promoScans: 0,
        loyaltyScans: 0,
        pointsAwarded: 0
      };
    }
  }
  
  /**
   * Get QR code analytics for a time period
   */
  static async getQrCodeAnalytics(
    businessId?: number | string,
    days = 30
  ): Promise<QrCodeAnalytics> {
    try {
      const businessIdNum = businessId ? (typeof businessId === 'string' ? parseInt(businessId) : businessId) : undefined;
      
      // Check if the table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'qr_scan_logs'
        ) as exists
      `;
      
      if (!tableExists[0]?.exists) {
        return {
          dailyScans: [],
          scanTypes: [],
          businessPerformance: []
        };
      }
      
      // Build the business filter
      const businessFilter = businessIdNum ? sql`AND scanned_by = ${businessIdNum}` : sql``;
      
      // Get daily scans
      const dailyScans = await sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successful
        FROM qr_scan_logs
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        ${businessFilter}
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      // Get scan types distribution
      const scanTypes = await sql`
        SELECT 
          scan_type as type,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM qr_scan_logs WHERE created_at >= NOW() - INTERVAL '${days} days' ${businessFilter}), 2) as percentage
        FROM qr_scan_logs
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        ${businessFilter}
        GROUP BY scan_type
        ORDER BY count DESC
      `;
      
      // Get business performance if no specific business is specified
      const businessPerformance: BusinessPerformance[] = [];
      
      if (!businessIdNum) {
        const performanceResults = await sql`
          SELECT 
            l.scanned_by as business_id,
            b.name as business_name,
            COUNT(*) as total_scans,
            ROUND(SUM(CASE WHEN l.success = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
          FROM qr_scan_logs l
          JOIN businesses b ON l.scanned_by = b.id
          WHERE l.created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY l.scanned_by, b.name
          ORDER BY total_scans DESC
          LIMIT 10
        `;
        
        // Convert database results to BusinessPerformance array
        for (const row of performanceResults) {
          businessPerformance.push({
            business_id: row.business_id,
            business_name: row.business_name,
            total_scans: row.total_scans,
            success_rate: row.success_rate
          });
        }
      }
      
      return {
        dailyScans: dailyScans.map(row => ({
          date: row.date,
          total: parseInt(row.total),
          successful: parseInt(row.successful)
        })),
        scanTypes: scanTypes.map(row => ({
          type: row.type,
          count: parseInt(row.count),
          percentage: parseFloat(row.percentage)
        })),
        businessPerformance: businessPerformance.map(row => ({
          businessId: row.business_id,
          businessName: row.business_name,
          totalScans: parseInt(row.total_scans as string),
          successRate: parseFloat(row.success_rate as string)
        }))
      };
    } catch (error) {
      console.error('Error getting QR code analytics:', error);
      return {
        dailyScans: [],
        scanTypes: [],
        businessPerformance: []
      };
    }
  }

  /**
   * Send notification for QR code scan (success or failure)
   * 
   * @param userId The user ID to send the notification to
   * @param success Whether the scan was successful
   * @param businessName The name of the business where the scan happened
   * @param points Points earned (if successful)
   * @param details Additional details about the scan
   */
  static async sendScanNotification(
    userId: string,
    success: boolean,
    businessName: string,
    points?: number,
    details?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await NotificationService.sendScanNotification(
        userId,
        success,
        businessName,
        points,
        details
      );
    } catch (error) {
      console.error('Error sending scan notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending notification'
      };
    }
  }
}

export default QrCodeService; 