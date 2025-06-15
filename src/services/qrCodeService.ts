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
        const errorMessage = validationResult.error ? 
          (typeof validationResult.error.getUserMessage === 'function' ? 
            validationResult.error.getUserMessage() : 'Invalid QR code data') : 
          'Invalid QR code data';
        
        return { 
          valid: false, 
          message: errorMessage
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
            let storedQrCode: any = null;
            
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
                  qrUniqueId: parsedData.qrUniqueId,
                  operation: 'validateSignature'
                });
                
                return { valid: false, message: 'QR code security verification failed' };
              }
            } catch (error) {
              logQrCodeError(error as Error, { 
                scanType, 
                storedQrCodeId: storedQrCode.id || 'unknown' 
              });
              return { valid: false, message: 'QR code security verification failed' };
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
              return { valid: false, message: 'Error verifying QR code freshness. Please try again.' };
            }
            
            // Verify customer still exists using retryable query
            const customerId = storedQrCode.customer_id;
            if (!customerId) {
              return { valid: false, message: 'Invalid QR code: missing customer ID' };
            }
            
            try {
              const customerCheck = await withRetryableQuery(
                () => sql`
                  SELECT id FROM users 
                  WHERE id = ${customerId}
                  AND user_type = 'customer'
                  AND status = 'active'
                `,
                { customerId }
              );
              
              if (!customerCheck || !Array.isArray(customerCheck) || !customerCheck.length) {
                return { valid: false, message: 'Customer not found or inactive' };
              }
            } catch (error) {
              logQrCodeError(error as Error, { 
                scanType, 
                operation: 'customerCheck',
                customerId
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
          // Parse as any to allow dynamic property access for promo codes
          const promoData = parsedData as any;
          
          if (!promoData.promoId || !promoData.code) {
            return { valid: false, message: 'Invalid promo code data: missing required fields' };
          }
          
          // Verify QR code exists in database if it has a uniqueId
          if (promoData.qrUniqueId) {
            const storedQrCode = await QrCodeStorageService.getQrCodeByUniqueId(promoData.qrUniqueId);
            
            if (!storedQrCode) {
              return { valid: false, message: 'Promo QR code not found in database' };
            }
            
            // Verify QR code status
            if (!storedQrCode.status || storedQrCode.status !== 'ACTIVE') {
              const status = storedQrCode.status || 'inactive';
              return { valid: false, message: `Promo code is ${status.toLowerCase()}` };
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
          try {
            const promoCheck = await sql`
              SELECT id, code, valid_until, is_active FROM promotions
              WHERE id = ${promoData.promoId}
              AND code = ${promoData.code}
            `;
            
            if (!promoCheck || !Array.isArray(promoCheck) || !promoCheck.length) {
              return { valid: false, message: 'Promo code not found' };
            }
            
            const promo = promoCheck[0];
            
            // Check if the promo is still active
            if (!promo.is_active) {
              return { valid: false, message: 'Promo code is inactive' };
            }
            
            // Check if the promo has expired
            if (promo.valid_until) {
              const expiryDate = new Date(promo.valid_until);
              if (expiryDate < new Date()) {
                return { valid: false, message: 'Promo code has expired' };
              }
            }
            
            return { valid: true, message: 'Promo code verified', verifiedData: parsedData };
          } catch (promoError) {
            logQrCodeError(promoError as Error, {
              scanType,
              operation: 'promoCheck',
              promoId: promoData.promoId,
              promoCode: promoData.code
            });
            return { valid: false, message: 'Error verifying promo code' };
          }
          
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
      
      // If we reach here, no specific validation occurred
      return { valid: true, message: 'Basic validation passed', verifiedData: parsedData };
    } catch (error) {
      console.error('Error validating QR data:', error);
      return { 
        valid: false, 
        message: error instanceof Error ? 
          error.message : 'An error occurred during QR code validation'
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
   * Process a QR code scan and perform appropriate actions based on the scan type
   */
  static async processQrCodeScan(
    scanType: QrScanLog['scan_type'],
    scannedBy: number | string,
    scannedData: any,
    options: {
      customerId?: number | string;
      programId?: number | string;
      promoCodeId?: number | string;
      pointsToAward?: number;
      ipAddress?: string;
    } = {}
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number; scanLogId?: number; error?: any; rateLimited?: boolean }> {
    try {
      // Convert IDs to strings for consistency in database operations
      const businessId = String(scannedBy);
      const customerId = options.customerId ? String(options.customerId) : undefined;
      const programId = options.programId ? String(options.programId) : undefined;
      const pointsToAward = options.pointsToAward || 10; // Default to 10 points if not specified

      // First, rate limit check to prevent excessive scanning
      const ipAddress = options.ipAddress || '127.0.0.1';
      const isRateLimited = await rateLimiter.check(`qr_scan:${businessId}:${ipAddress}`, 5, 60); // 5 scans per minute
      
      if (isRateLimited) {
        return { 
          success: false, 
          message: 'Rate limit exceeded. Please wait before scanning again.', 
          rateLimited: true 
        };
      }
      
      // Validate the QR code data with enhanced security checks
      const validationResult = await this.validateQrData(scanType, scannedData);
      
      if (!validationResult.valid) {
        const scanLogId = await this.logScan(
          scanType,
          businessId,
          scannedData,
          false,
          { errorMessage: validationResult.message }
        );
        
        return { success: false, message: validationResult.message, scanLogId };
      }
      
      // Use the verified data if available, otherwise use the original data
      const dataToProcess = validationResult.verifiedData || scannedData;
      
      let processResult;
      
      // Process based on scan type
      switch (scanType) {
        case 'CUSTOMER_CARD':
          try {
            // Verify or create customer-business relationship
            await this.verifyOrCreateCustomerBusiness(
              businessId, 
              customerId || dataToProcess.customerId
            );
            
            // Process the customer card scan with points award
            processResult = await this.processCustomerCard(
              businessId, 
              dataToProcess, 
              customerId,
              pointsToAward
            );
          } catch (error) {
            console.error('Error processing customer card:', error);
            processResult = { 
              success: false, 
              message: error instanceof Error ? error.message : 'Error processing customer card' 
            };
          }
          break;
          
        case 'PROMO_CODE':
          processResult = await this.processPromoCode(
            businessId, 
            dataToProcess, 
            customerId, 
            options.promoCodeId
          );
          break;
          
        case 'LOYALTY_CARD':
          processResult = await this.processLoyaltyCard(
            businessId, 
            dataToProcess, 
            customerId, 
            programId
          );
          break;
          
        default:
          processResult = { success: false, message: 'Unsupported QR code type' };
      }
      
      // Log the scan result
      const scanLogId = await this.logScan(
        scanType,
        businessId,
        dataToProcess,
        processResult.success,
        {
          customerId: customerId || dataToProcess.customerId,
          programId: programId || dataToProcess.programId,
          pointsAwarded: processResult.pointsAwarded,
          errorMessage: !processResult.success ? processResult.message : undefined
        }
      );
      
      return { ...processResult, scanLogId };
    } catch (error) {
      console.error('Error processing QR code scan:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error processing QR code scan',
        error 
      };
    }
  }
  
  /**
   * Verify or create a relationship between customer and business
   * This function ensures a connection exists between customer and business
   */
  private static async verifyOrCreateCustomerBusiness(
    businessId: string | number,
    customerId?: string | number
  ): Promise<boolean> {
    if (!customerId || !businessId) {
      console.error('Missing customer ID or business ID in verifyOrCreateCustomerBusiness');
      return false;
    }
    
    // Convert IDs to consistent string format
    const strCustomerId = String(customerId);
    const strBusinessId = String(businessId);
    
    // Retry logic for database operations
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Check if relationship exists - using parameterized query
        const existingRelationship = await sql`
          SELECT id, relationship_type 
          FROM customer_business_relationships
          WHERE customer_id = ${strCustomerId}
          AND business_id = ${strBusinessId}
        `;
        
        if (existingRelationship.length > 0) {
          // Relationship exists, update last interaction
          await sql`
            UPDATE customer_business_relationships
            SET updated_at = NOW(),
                interaction_count = interaction_count + 1
            WHERE id = ${existingRelationship[0].id}
          `;
          console.log(`Updated existing customer-business relationship: ${strCustomerId}-${strBusinessId}`);
          return true;
        }
        
        // Begin transaction for creating relationship
        await sql.begin();
        
        try {
          // Double check if relationship was created by another process
          const doubleCheck = await sql`
            SELECT id FROM customer_business_relationships
            WHERE customer_id = ${strCustomerId}
            AND business_id = ${strBusinessId}
          `;
          
          if (doubleCheck.length > 0) {
            // Another process created it, just update
            await sql`
              UPDATE customer_business_relationships
              SET updated_at = NOW(),
                  interaction_count = interaction_count + 1
              WHERE id = ${doubleCheck[0].id}
            `;
            await sql.commit();
            console.log(`Used existing customer-business relationship: ${strCustomerId}-${strBusinessId}`);
            return true;
          }
          
          // Create new relationship
          await sql`
            INSERT INTO customer_business_relationships (
              customer_id,
              business_id,
              relationship_type,
              created_at,
              updated_at,
              interaction_count
            ) VALUES (
              ${strCustomerId},
              ${strBusinessId},
              'loyalty_member',
              NOW(),
              NOW(),
              1
            )
          `;
          
          await sql.commit();
          console.log(`Created new customer-business relationship: ${strCustomerId}-${strBusinessId}`);
          return true;
        } catch (txError) {
          // Something went wrong during transaction
          await sql.rollback();
          
          if (attempts >= maxAttempts) {
            throw txError;
          }
          
          // Wait and retry
          console.warn(`Transaction error in verifyOrCreateCustomerBusiness (attempt ${attempts}):`, txError);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error('Failed to verify/create customer-business relationship after multiple attempts:', error);
          return false;
        }
        
        // Wait and retry
        console.warn(`Error in verifyOrCreateCustomerBusiness (attempt ${attempts}):`, error);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return false;
  }

  /**
   * Process a customer card scan and award loyalty points
   */
  private static async processCustomerCard(
    businessId: number | string, 
    data: any, 
    customerId?: number | string,
    pointsToAward: number = 10
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number }> {
    try {
      // Use provided customer ID or extract from data
      const customerIdToUse = customerId || data.customerId;
      
      if (!customerIdToUse) {
        return { success: false, message: 'Missing customer ID' };
      }
      
      // Verify customer exists
      const customerCheck = await sql`
        SELECT id FROM users
        WHERE id = ${String(customerIdToUse)}
        AND user_type = 'customer'
        AND status = 'active'
      `;
      
      if (!customerCheck.length) {
        return { success: false, message: 'Customer not found or inactive' };
      }
      
      // Determine which loyalty program to use
      const programs = await sql`
        SELECT id FROM loyalty_programs
        WHERE business_id = ${String(businessId)}
        AND is_active = true
        ORDER BY is_default DESC, created_at ASC
      `;
      
      if (!programs.length) {
        return { success: false, message: 'No active loyalty programs found for this business' };
      }
      
      // Use first program (should be default if exists)
      const programId = programs[0].id;
      
      // Check if customer has a card for this program
      let card = await sql`
        SELECT id FROM loyalty_cards
        WHERE customer_id = ${String(customerIdToUse)}
        AND business_id = ${String(businessId)}
        AND program_id = ${programId}
        AND is_active = true
      `;
      
      // If no card exists, create one through LoyaltyCardService
      if (!card.length) {
        try {
          // Use the LoyaltyCardService to create a new card
          const { LoyaltyCardService } = await import('./loyaltyCardService');
          
          const newCard = await LoyaltyCardService.enrollCustomerInProgram(
            String(customerIdToUse),
            String(businessId),
            String(programId)
          );
          
          if (!newCard) {
            return { 
              success: false, 
              message: 'Failed to create loyalty card for customer' 
            };
          }
          
          card = [{ id: newCard.id }];
        } catch (enrollError) {
          console.error('Error enrolling customer in program:', enrollError);
          return { 
            success: false, 
            message: 'Error creating loyalty card: ' + 
              (enrollError instanceof Error ? enrollError.message : 'Unknown error') 
          };
        }
      }
      
      // Add points to the card
      try {
        const { LoyaltyCardService } = await import('./loyaltyCardService');
        
        const updatedCard = await LoyaltyCardService.addPoints(
          card[0].id,
          pointsToAward,
          'QR_SCAN'
        );
        
        if (!updatedCard) {
          return { success: false, message: 'Failed to add points to card' };
        }
        
        const customerName = data.customerName || 'Customer';
        return { 
          success: true, 
          message: `Added ${pointsToAward} points to ${customerName}'s card`, 
          pointsAwarded: pointsToAward
        };
      } catch (pointsError) {
        console.error('Error adding points to card:', pointsError);
        return { 
          success: false, 
          message: 'Error adding points: ' + 
            (pointsError instanceof Error ? pointsError.message : 'Unknown error')
        };
      }
    } catch (error) {
      console.error('Error processing customer card:', error);
      return { 
        success: false, 
        message: 'Error processing customer card: ' + 
          (error instanceof Error ? error.message : 'Unknown error')
      };
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

  /**
   * Handle scanning a customer card for enrollment and promo codes
   */
  static async handleCustomerCardScan(params: {
    customerId: string | number;
    businessId: string | number;
    programId?: string | number;
    cardNumber?: string;
    pointsToAward?: number;
  }): Promise<{
    success: boolean;
    message: string;
    pointsAwarded?: number;
    isEnrolled?: boolean;
    hasPromos?: boolean;
    businessName?: string;
  }> {
    try {
      const customerId = typeof params.customerId === 'string' 
        ? parseInt(params.customerId) 
        : params.customerId;
      
      const businessId = typeof params.businessId === 'string' 
        ? parseInt(params.businessId) 
        : params.businessId;
      
      let programId: number | undefined = undefined;
      if (params.programId) {
        programId = typeof params.programId === 'string' 
          ? parseInt(params.programId) 
          : params.programId;
      }

      // Apply rate limiting to prevent abuse - using a more unique key including card number if available
      const rateLimitKey = `scan:${customerId}:${businessId}:${params.cardNumber || 'card'}`;
      if (rateLimiter.isRateLimited(rateLimitKey)) {
        console.warn(`Rate limited scan attempt: ${rateLimitKey}`);
        return {
          success: false,
          message: 'This card was scanned recently. Please wait before scanning again.'
        };
      }

      // Track the scan attempt with shorter timeout to reduce false positives
      rateLimiter.trackEvent(rateLimitKey, 30); // 30 second rate limit instead of default

      // Get business information with proper error handling
      let businessName = 'Business';
      try {
        const businessResult = await sql`
          SELECT name FROM businesses WHERE id = ${businessId}
        `;
        
        if (businessResult && businessResult.length > 0) {
          businessName = businessResult[0].name || 'Business';
        } else {
          console.warn(`Business with ID ${businessId} not found`);
        }
      } catch (businessError) {
        console.error('Error fetching business information:', businessError);
        // Continue processing with default business name
      }

      // Check if the customer exists with better error handling
      try {
        const customerResult = await sql`
          SELECT id, name FROM users 
          WHERE id = ${customerId}
          AND status = 'active'
          AND user_type = 'customer'
        `;
        
        if (customerResult.length === 0) {
          return {
            success: false,
            message: 'Customer not found or inactive',
            businessName
          };
        }
      } catch (customerError) {
        console.error('Error verifying customer:', customerError);
        return {
          success: false,
          message: 'Error verifying customer information. Please try again.',
          businessName
        };
      }

      // Establish customer-business relationship first
      try {
        const relationshipEstablished = await this.verifyOrCreateCustomerBusiness(businessId, customerId);
        if (!relationshipEstablished) {
          console.warn(`Failed to establish customer-business relationship: ${customerId}-${businessId}`);
          // Continue processing but log the warning
        }
      } catch (relationshipError) {
        console.error('Error establishing customer-business relationship:', relationshipError);
        // Continue processing despite relationship error
      }

      // Record the scan and award points - using transaction with retry mechanism
      const pointsToAward = params.pointsToAward || 10;
      let transactionAttempts = 0;
      const maxAttempts = 3;
      
      while (transactionAttempts < maxAttempts) {
        transactionAttempts++;
        
        // Begin transaction
        try {
          await sql.begin();
          
          // Award points to the customer
          await sql`
            INSERT INTO customer_points (
              customer_id,
              business_id,
              program_id,
              points,
              source,
              description,
              created_at
            ) VALUES (
              ${customerId},
              ${businessId},
              ${programId || null},
              ${pointsToAward},
              'qr_scan',
              'Points awarded for QR card scan',
              NOW()
            )
          `;
          
          // Check if the customer is enrolled in the program if programId is provided
          let isEnrolled = false;
          if (programId) {
            const enrollmentResult = await sql`
              SELECT id FROM customer_program_enrollments
              WHERE customer_id = ${customerId}
              AND program_id = ${programId}
              AND status = 'ACTIVE'
            `;
            
            isEnrolled = enrollmentResult.length > 0;
          }
          
          // Check if the customer has available promo codes
          const promoResult = await sql`
            SELECT COUNT(*) as count FROM promo_codes p
            WHERE p.status = 'ACTIVE'
            AND p.start_date <= NOW()
            AND p.end_date >= NOW()
            AND (p.max_uses IS NULL OR p.current_uses < p.max_uses)
            AND NOT EXISTS (
              SELECT 1 FROM customer_promo_codes cp
              WHERE cp.customer_id = ${customerId}
              AND cp.promo_code_id = p.id
            )
            LIMIT 1
          `;
          
          const hasPromos = promoResult.length > 0 && promoResult[0].count > 0;
          
          // Log the scan
          const scanLogParams = {
            scanType: 'CUSTOMER_CARD' as QrScanLog['scan_type'],
            scannedBy: businessId,
            scannedData: JSON.stringify({ 
              customerId, 
              businessId, 
              programId, 
              cardNumber: params.cardNumber,
              pointsAwarded: pointsToAward 
            }),
            success: true,
            customerId,
            programId,
            pointsAwarded: pointsToAward
          };
          
          await this.logScan(
            scanLogParams.scanType,
            scanLogParams.scannedBy,
            scanLogParams.scannedData,
            scanLogParams.success,
            {
              customerId: scanLogParams.customerId,
              programId: scanLogParams.programId,
              pointsAwarded: scanLogParams.pointsAwarded
            }
          );
          
          // Commit transaction
          await sql.commit();
          
          // Invalidate customer dashboard queries to refresh the UI
          import('../utils/queryClient').then(({ invalidateCustomerQueries }) => {
            invalidateCustomerQueries(customerId);
          }).catch(err => {
            console.error('Failed to invalidate customer queries:', err);
          });
          
          // Send notification to customer - non-blocking
          try {
            this.sendScanNotification(
              customerId.toString(),
              true,
              businessName,
              pointsToAward,
              { isEnrolled, hasPromos }
            ).catch(notifyError => {
              console.error('Error sending scan notification:', notifyError);
            });
          } catch (notifyError) {
            console.error('Error initiating scan notification:', notifyError);
            // Non-critical error, continue
          }
          
          return {
            success: true,
            message: `Successfully awarded ${pointsToAward} points to customer`,
            pointsAwarded: pointsToAward,
            isEnrolled,
            hasPromos,
            businessName
          };
        } catch (txError) {
          // Attempt rollback
          try {
            await sql.rollback();
          } catch (rollbackError) {
            console.error('Error rolling back transaction:', rollbackError);
          }
          
          // If this is the last attempt, throw the error
          if (transactionAttempts >= maxAttempts) {
            throw txError;
          }
          
          // Otherwise wait and retry
          console.warn(`Transaction failed, retrying (${transactionAttempts}/${maxAttempts}):`, txError);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // If we got here, we failed all transaction attempts
      throw new Error(`Failed to process transaction after ${maxAttempts} attempts`);
    } catch (error) {
      console.error('Error handling customer card scan:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process customer card'
      };
    }
  }
}

export default QrCodeService; 