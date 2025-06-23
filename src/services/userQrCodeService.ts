import { QrCodeStorageService, QrCodeCreationParams } from './qrCodeStorageService';
import { createStandardCustomerQRCode, StandardQrCodeData } from '../utils/standardQrCodeGenerator';
import { User } from './userService';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sql from '../utils/db';
import db from '../utils/databaseConnector';
import logger from '../utils/logger';
import { Customer } from '../types/customer';
import { QRCodeData } from '../types/qrCode';

/**
 * Service to manage user QR codes, ensuring each customer has a valid QR code
 */
export class UserQrCodeService {
  // Use the same key for consistency in security
  private static readonly SECRET_KEY = process.env.QR_SECRET_KEY || 'gudcity-qr-security-key-with-additional-entropy-for-hmac-generation';

  /**
   * Generates a consistent card number for a user
   * This ensures the same user always gets the same card number
   */
  static generateConsistentCardNumber(userId: string | number): string {
    // Convert userId to string if it's a number
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    
    // Create a consistent prefix
    const prefix = 'GC';
    
    // Use the user ID as a seed for consistent generation
    const idPart = userIdStr.replace(/\D/g, ''); // Remove non-digits
    const shortId = idPart.substring(0, 6).padStart(6, '0');
    
    // Add a checksum digit (simple implementation)
    let sum = 0;
    for (let i = 0; i < shortId.length; i++) {
      sum += parseInt(shortId[i]);
    }
    const checksum = sum % 10;
    
    // Format as GC-XXXXXX-C
    return `${prefix}-${shortId}-${checksum}`;
  }

  /**
   * Generate a QR code for a newly registered customer
   */
  static async generateCustomerQrCode(user: User, cardDetails?: {
    cardNumber?: string;
    cardType?: string;
  }): Promise<string | null> {
    if (!user || !user.id) {
      console.error('Invalid user provided to generateCustomerQrCode');
      return null;
    }
    
    try {
      // Generate a unique token and ID for security
      const uniqueToken = this.generateUniqueToken(user.id);
      const qrUniqueId = uuidv4();

      // Convert user ID to string for consistency
      const userId = user.id.toString();

      // Generate consistent card number if not provided
      let cardNumber = cardDetails?.cardNumber;
      if (!cardNumber) {
        cardNumber = this.generateConsistentCardNumber(userId);
        console.log(`Generated consistent card number: ${cardNumber} for user ${userId}`);
      }

      const cardType = cardDetails?.cardType || 'STANDARD';
      
      console.log('Creating standard QR code with:', {
        userId,
        cardNumber,
        cardType
      });
      
      let qrImageUrl;
      try {
        // Create a standardized QR code for the customer
        qrImageUrl = await createStandardCustomerQRCode(
          userId,
          undefined, // business ID not needed here
          user.name || 'Customer',
          cardNumber,
          cardType
        );
        
        console.log('QR code created successfully');
      } catch (qrGenError) {
        console.error('Error generating QR code image:', qrGenError);
        
        // Create a simpler QR code as fallback
        try {
          console.log('Attempting fallback QR generation');
          const fallbackData = JSON.stringify({
            customerId: userId,
            cardNumber: cardNumber,
            timestamp: Date.now(),
            type: 'CUSTOMER_CARD',
          });
          
          // Use direct QRCode library
          const QRCode = (await import('qrcode')).default;
          qrImageUrl = await QRCode.toDataURL(fallbackData);
          
          console.log('Fallback QR code created successfully');
        } catch (fallbackError) {
          console.error('Fallback QR generation failed:', fallbackError);
          return null;
        }
      }
      
      // Store the QR code in the database
      try {
        // Ensure customer_qrcodes table exists before attempting insert
        const tableExists = await sql.tableExists('customer_qrcodes');
        if (!tableExists) {
          console.error('customer_qrcodes table does not exist in the database');
          // Return just the QR code for display
          return qrImageUrl;
        }

        // Standard QR code data
        const qrData: StandardQrCodeData = {
          type: 'CUSTOMER_CARD',
          qrUniqueId,
          timestamp: Date.now(),
          version: '1.0',
          customerId: userId,
          customerName: user.name || 'Customer',
          cardNumber,
          cardType
        };
        
        // Try to store the QR code
        const params: QrCodeCreationParams = {
          customerId: userId,
          qrType: 'CUSTOMER_CARD',
          data: JSON.stringify(qrData),
          imageUrl: qrImageUrl,
          isPrimary: true,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 365 days (1 year)
        };
        
        const savedQrCode = await QrCodeStorageService.createQrCode(params);
        
        if (savedQrCode) {
          console.log(`Successfully stored QR code in database for user ${userId}`);
        } else {
          console.error(`Failed to store QR code in database for user ${userId}`);
        }

        // Cache the result regardless of database storage success
        this.cacheQrCode(userId, qrImageUrl);
      } catch (storageError) {
        console.error('Error storing QR code:', storageError);
        // Return the QR code anyway even if we couldn't store it
      }
      
      return qrImageUrl;
    } catch (error) {
      console.error('Error generating customer QR code:', error);
      return null;
    }
  }

  /**
   * Get or create a QR code for a customer
   */
  static async getOrCreateCustomerQrCode(user: User, cardDetails?: {
    cardNumber?: string;
    cardType?: string;
  }): Promise<string | null> {
    if (!user || !user.id) {
      console.error('Invalid user provided to getOrCreateCustomerQrCode');
      return null;
    }

    const userId = user.id.toString();
    
    console.log(`Getting or creating QR code for customer ${userId}`);
    
    // Try to get from session storage cache first for performance
    const cachedQrCode = this.getCachedQrCode(userId);
    if (cachedQrCode) {
      console.log('Using cached QR code from session storage');
      return cachedQrCode;
    }

    // Ensure consistent card number
    if (!cardDetails) {
      cardDetails = {
        cardNumber: this.generateConsistentCardNumber(userId),
        cardType: 'STANDARD'
      };
    } else if (!cardDetails.cardNumber) {
      cardDetails.cardNumber = this.generateConsistentCardNumber(userId);
    }

    console.log(`Using card details: ${JSON.stringify(cardDetails)}`);

    // Try to get from storage service
    try {
      // Get customer's primary QR code
      console.log('Fetching primary QR code from storage service');
      const qrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(userId, 'CUSTOMER_CARD');
      
      if (qrCode) {
        console.log('Found existing QR code in database');
        
        // Use the existing QR code image URL
        if (qrCode.qr_image_url) {
          console.log('Using existing QR image URL from database');
          this.cacheQrCode(userId, qrCode.qr_image_url);
          return qrCode.qr_image_url;
        }
        
        // No image URL in storage, try to extract from qr_data
        if (qrCode.qr_data) {
          try {
            console.log('Parsing QR data from database');
            let qrData = qrCode.qr_data;
            
            // Convert to object if it's a string
            if (typeof qrData === 'string') {
              console.log('Converting QR data string to object');
              qrData = JSON.parse(qrData);
            }
            
            if (qrData.qrImageUrl) {
              console.log('Found QR image URL in parsed data');
              this.cacheQrCode(userId, qrData.qrImageUrl);
              return qrData.qrImageUrl;
            } else {
              console.log('No image URL in QR data, regenerating QR code');
            }
          } catch (parseError) {
            console.error('Error parsing QR code data:', parseError);
          }
        }
        
        // We have a QR code record but no usable image, generate a new one
        console.log('Regenerating QR code from existing data');
        try {
          const QRCode = (await import('qrcode')).default;
          let dataToEncode;
          
          try {
            dataToEncode = typeof qrCode.qr_data === 'string' ? 
              JSON.parse(qrCode.qr_data) : qrCode.qr_data;
          } catch (e) {
            dataToEncode = {
              customerId: userId,
              cardNumber: cardDetails.cardNumber,
              timestamp: Date.now(),
              type: 'CUSTOMER_CARD'
            };
          }
          
          const regeneratedQrImageUrl = await QRCode.toDataURL(JSON.stringify(dataToEncode));
          
          // Update the existing record with the new image URL
          try {
            await sql.query(`
              UPDATE customer_qrcodes
              SET qr_image_url = $1, updated_at = NOW()
              WHERE id = $2
            `, [regeneratedQrImageUrl, qrCode.id]);
            console.log('Updated QR code record with new image URL');
          } catch (updateError) {
            console.error('Error updating QR code record:', updateError);
          }
          
          this.cacheQrCode(userId, regeneratedQrImageUrl);
          return regeneratedQrImageUrl;
        } catch (regenerateError) {
          console.error('Error regenerating QR code:', regenerateError);
        }
      } else {
        console.log('No existing QR code found in database');
      }
    } catch (error) {
      console.error('Error getting QR code from storage:', error);
      // Continue and try to generate a fresh QR code
    }

    // If we got here, we need to generate a new QR code
    console.log('Generating new QR code for customer');
    return this.generateCustomerQrCode(user, cardDetails);
  }

  /**
   * Cache a QR code in session storage for better performance
   */
  private static cacheQrCode(userId: string, qrImageUrl: string): void {
    try {
      sessionStorage.setItem(`qrcode_${userId}`, JSON.stringify({
        timestamp: Date.now(),
        qrImageUrl
      }));
    } catch (error) {
      console.error('Error caching QR code:', error);
    }
  }

  /**
   * Get a cached QR code from session storage
   */
  private static getCachedQrCode(userId: string): string | null {
    try {
      const cachedItem = sessionStorage.getItem(`qrcode_${userId}`);
      if (cachedItem) {
        const { timestamp, qrImageUrl } = JSON.parse(cachedItem);
        // Check if the cache is still valid (1 hour)
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          return qrImageUrl;
        }
      }
    } catch (error) {
      console.error('Error getting cached QR code:', error);
    }
    return null;
  }

  /**
   * Generate a unique token for the user based on their ID
   */
  private static generateUniqueToken(userId: string | number): string {
    const hmac = crypto.createHmac('sha256', this.SECRET_KEY);
    hmac.update(userId.toString());
    return hmac.digest('hex');
  }

  /**
   * Get QR code details for a customer
   */
  static async getQrCodeDetails(userId: string): Promise<{
    userId: string;
    createdAt: string;
    lastUsed: string | null;
    expirationDate: string | null;
    usageCount: number;
  } | null> {
    try {
      const result = await sql.query(
        `SELECT 
          u.id as user_id, 
          q.created_at, 
          q.last_used, 
          q.expiration_date, 
          q.usage_count
        FROM users u
        LEFT JOIN user_qrcodes q ON u.id = q.user_id
        WHERE u.id = $1`,
        [userId]
      );

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      
      return {
        userId: row.user_id,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        lastUsed: row.last_used ? new Date(row.last_used).toISOString() : null,
        expirationDate: row.expiration_date ? new Date(row.expiration_date).toISOString() : null,
        usageCount: row.usage_count || 0
      };
    } catch (error) {
      logger.error('Error getting QR code details:', error);
      return null;
    }
  }

  /**
   * Get all programs a customer is enrolled in
   */
  static async getCustomerEnrolledPrograms(userId: string): Promise<any[]> {
    try {
      // Use tagged template literals instead of sql.query
      const result = await sql`
        SELECT 
          cp.id, 
          cp.program_id, 
          lp.name as program_name, 
          lp.description, 
          cp.current_points,
          cp.enrolled_at
        FROM customer_programs cp
        JOIN loyalty_programs lp ON cp.program_id = lp.id
        WHERE cp.customer_id = ${userId}
      `;

      return result;
    } catch (error) {
      logger.error('Error getting customer enrolled programs:', error);
      // Return empty array instead of null to avoid UI errors
      return [];
    }
  }

  /**
   * Get all promo codes available to a customer
   */
  static async getCustomerAvailablePromoCodes(userId: string): Promise<any[]> {
    try {
      // Use tagged template literals instead of sql.query
      const result = await sql`
        SELECT 
          p.id,
          p.code,
          p.description,
          p.discount_amount,
          p.start_date,
          p.end_date
        FROM promo_codes p
        JOIN customer_promo_codes cp ON p.id = cp.promo_id
        WHERE cp.customer_id = ${userId}
        AND p.end_date > NOW()
        AND cp.is_used = FALSE
      `;

      return result;
    } catch (error) {
      logger.error('Error getting customer available promo codes:', error);
      // Return empty array instead of null to avoid UI errors
      return [];
    }
  }

  /**
   * Enroll a customer in a loyalty program
   */
  static async enrollCustomerInProgram(
    customerId: string | number,
    programId: string | number,
    businessId: string | number
  ): Promise<boolean> {
    try {
      // Check if the table exists
      const tableExists = await sql.tableExists('customer_program_enrollments');
      if (!tableExists) {
        console.error('customer_program_enrollments table does not exist in database');
        return false;
      }

      // Convert string IDs to numbers if needed
      const custId = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      const progId = typeof programId === 'string' ? parseInt(programId) : programId;
      const busId = typeof businessId === 'string' ? parseInt(businessId) : businessId;

      // Check if enrollment already exists
      const existingEnrollment = await sql.query(`
        SELECT id FROM customer_program_enrollments
        WHERE customer_id = $1 AND program_id = $2
      `, [custId, progId]);

      if (existingEnrollment.length > 0) {
        // If enrollment exists but is inactive, reactivate it
        if (existingEnrollment[0].status === 'INACTIVE') {
          await sql.query(`
            UPDATE customer_program_enrollments
            SET status = 'ACTIVE', updated_at = NOW()
            WHERE id = $1
          `, [existingEnrollment[0].id]);
          return true;
        }
        // Already enrolled and active
        return true;
      }

      // Create new enrollment
      await sql.query(`
        INSERT INTO customer_program_enrollments (
          customer_id, program_id, business_id, join_date, status,
          points, tier_level, created_at, updated_at
        ) VALUES (
          $1, $2, $3, NOW(), 'ACTIVE', 0, 'STANDARD', NOW(), NOW()
        )
      `, [custId, progId, busId]);

      return true;
    } catch (error) {
      console.error('Error enrolling customer in program:', error);
      return false;
    }
  }

  /**
   * Assign a promo code to a customer
   */
  static async assignPromoCodeToCustomer(
    customerId: string | number,
    promoCodeId: string | number
  ): Promise<boolean> {
    try {
      // Check if the tables exist
      const promoCodesTableExists = await sql.tableExists('promo_codes');
      const customerPromoCodesTableExists = await sql.tableExists('customer_promo_codes');
      
      if (!promoCodesTableExists || !customerPromoCodesTableExists) {
        console.error('One or more required tables do not exist in database');
        return false;
      }

      // Convert string IDs to numbers if needed
      const custId = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      const promoId = typeof promoCodeId === 'string' ? parseInt(promoCodeId) : promoCodeId;

      // Start a transaction
      await sql.begin();
      
      try {
        // Check if the promo code exists and is active
        const promoCode = await sql.query(`
          SELECT id, max_uses, current_uses
          FROM promo_codes
          WHERE id = $1 AND status = 'ACTIVE'
          AND start_date <= NOW() AND end_date >= NOW()
        `, [promoId]);

        if (promoCode.length === 0) {
          await sql.rollback();
          return false;
        }

        // Check if the promo code has reached its usage limit
        if (promoCode[0].max_uses !== null && 
            promoCode[0].current_uses >= promoCode[0].max_uses) {
          await sql.rollback();
          return false;
        }

        // Check if the customer already has this promo code
        const existingPromo = await sql.query(`
          SELECT id FROM customer_promo_codes
          WHERE customer_id = $1 AND promo_code_id = $2
        `, [custId, promoId]);

        if (existingPromo.length > 0) {
          await sql.rollback();
          return true; // Already assigned
        }

        // Assign the promo code to the customer
        await sql.query(`
          INSERT INTO customer_promo_codes (
            customer_id, promo_code_id, claimed_at, status,
            created_at, updated_at
          ) VALUES (
            $1, $2, NOW(), 'CLAIMED', NOW(), NOW()
          )
        `, [custId, promoId]);

        await sql.commit();
        return true;
      } catch (innerError) {
        await sql.rollback();
        throw innerError;
      }
    } catch (error) {
      console.error('Error assigning promo code to customer:', error);
      return false;
    }
  }

  /**
   * Use a promo code that's been assigned to a customer
   */
  static async useCustomerPromoCode(
    customerId: string | number,
    promoCodeId: string | number
  ): Promise<boolean> {
    try {
      // Check if the tables exist
      const promoCodesTableExists = await sql.tableExists('promo_codes');
      const customerPromoCodesTableExists = await sql.tableExists('customer_promo_codes');
      
      if (!promoCodesTableExists || !customerPromoCodesTableExists) {
        console.error('One or more required tables do not exist in database');
        return false;
      }

      // Convert string IDs to numbers if needed
      const custId = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      const promoId = typeof promoCodeId === 'string' ? parseInt(promoCodeId) : promoCodeId;

      // Start a transaction
      await sql.begin();
      
      try {
        // Check if the customer has this promo code and it hasn't been used
        const customerPromo = await sql.query(`
          SELECT id FROM customer_promo_codes
          WHERE customer_id = $1 AND promo_code_id = $2
          AND status = 'CLAIMED' AND used_at IS NULL
        `, [custId, promoId]);

        if (customerPromo.length === 0) {
          await sql.rollback();
          return false;
        }

        // Mark the promo code as used
        await sql.query(`
          UPDATE customer_promo_codes
          SET used_at = NOW(), status = 'USED', updated_at = NOW()
          WHERE id = $1
        `, [customerPromo[0].id]);

        // Increment usage count on the promo code
        await sql.query(`
          UPDATE promo_codes
          SET current_uses = current_uses + 1, updated_at = NOW()
          WHERE id = $1
        `, [promoId]);

        await sql.commit();
        return true;
      } catch (innerError) {
        await sql.rollback();
        throw innerError;
      }
    } catch (error) {
      console.error('Error using customer promo code:', error);
      return false;
    }
  }

  /**
   * Generate a QR code for a specific loyalty card
   */
  static async generateLoyaltyCardQrCode(
    customerId: number | string, 
    businessId: number | string, 
    programId: number | string, 
    cardId: number | string
  ): Promise<string | null> {
    try {
      // Validate inputs
      if (!customerId) {
        console.error('Missing customer ID for loyalty card QR code');
        return null;
      }
      
      if (!businessId) {
        console.error('Missing business ID for loyalty card QR code');
        return null;
      }
      
      if (!programId) {
        console.error('Missing program ID for loyalty card QR code');
        return null;
      }
      
      if (!cardId) {
        console.error('Missing card ID for loyalty card QR code');
        return null;
      }
      
      // Convert IDs to numbers if they're strings
      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      const businessIdNum = typeof businessId === 'string' ? parseInt(businessId) : businessId;
      const programIdNum = typeof programId === 'string' ? parseInt(programId) : programId;
      const cardIdNum = typeof cardId === 'string' ? parseInt(cardId) : cardId;
      
      // Validate numeric IDs
      if (isNaN(customerIdNum) || customerIdNum <= 0) {
        console.error('Invalid customer ID for loyalty card QR code');
        return null;
      }
      
      if (isNaN(businessIdNum) || businessIdNum <= 0) {
        console.error('Invalid business ID for loyalty card QR code');
        return null;
      }
      
      if (isNaN(programIdNum) || programIdNum <= 0) {
        console.error('Invalid program ID for loyalty card QR code');
        return null;
      }
      
      if (isNaN(cardIdNum) || cardIdNum <= 0) {
        console.error('Invalid card ID for loyalty card QR code');
        return null;
      }
      
      // Generate a unique token for this loyalty card
      const uniqueToken = this.generateUniqueToken(`${customerIdNum}-${businessIdNum}-${programIdNum}-${cardIdNum}`);
      const qrUniqueId = uuidv4();

      // Create QR code data
      const qrData = {
        type: 'LOYALTY_CARD',
        customerId: customerIdNum,
        businessId: businessIdNum,
        programId: programIdNum,
        cardId: cardIdNum,
        timestamp: Date.now(),
        uniqueToken,
        qrUniqueId
      };

      // Generate the QR code image
      let qrImageUrl: string | null = null;
      try {
        qrImageUrl = await createStandardCustomerQRCode(
          customerIdNum.toString(),
          businessIdNum.toString()
        );
        
        if (!qrImageUrl) {
          console.error('Failed to generate QR code image for loyalty card');
          return null;
        }
      } catch (imageError) {
        console.error('Error generating QR code image:', imageError);
        return null;
      }

      // Store in database
      try {
        const storedQrCode = await QrCodeStorageService.createQrCode({
          customerId: customerIdNum,
          businessId: businessIdNum,
          qrType: 'LOYALTY_CARD',
          data: qrData,
          imageUrl: qrImageUrl
        });

        if (storedQrCode) {
          console.log(`Successfully created loyalty card QR code: ${storedQrCode.qr_unique_id}`);
          return qrImageUrl;
        } else {
          console.error('Failed to store loyalty card QR code in database');
          return qrImageUrl; // Still return the image even if DB storage failed
        }
      } catch (dbError) {
        console.error('Database error storing loyalty card QR code:', dbError);
        return qrImageUrl; // Return the image URL anyway so the card can still be used
      }
    } catch (error) {
      console.error('Error generating loyalty card QR code:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }

  /**
   * Verify a QR code and update its scan count
   */
  static async verifyAndTrackQrCode(
    qrUniqueId: string, 
    scannedBy: number | string
  ): Promise<{
    isValid: boolean;
    qrCode?: any;
    message: string;
  }> {
    try {
      if (!qrUniqueId) {
        return {
          isValid: false,
          message: 'Missing QR code identifier'
        };
      }
      
      if (!scannedBy) {
        return {
          isValid: false,
          message: 'Missing scanner identifier'
        };
      }
      
      // Normalize the scannedBy parameter
      const scannedById = typeof scannedBy === 'string' ? parseInt(scannedBy) : scannedBy;
      
      if (!scannedById || isNaN(scannedById) || scannedById <= 0) {
        return {
          isValid: false,
          message: 'Invalid scanner ID'
        };
      }
      
      // Get the QR code from the database
      const qrCode = await QrCodeStorageService.getQrCodeByUniqueId(qrUniqueId);
      
      if (!qrCode) {
        return {
          isValid: false,
          message: 'QR code not found'
        };
      }

      // Check if the QR code is active
      if (qrCode.status !== 'ACTIVE') {
        return {
          isValid: false,
          message: `QR code is ${qrCode.status.toLowerCase()}`
        };
      }

      // Validate the signature - this now uses our enhanced verification
      if (!QrCodeStorageService.validateQrCode(qrCode)) {
        return {
          isValid: false,
          message: 'QR code signature validation failed'
        };
      }

      // Check for expiration
      if (qrCode.expiry_date && new Date(qrCode.expiry_date) < new Date()) {
        try {
          // Update the status to expired
          await QrCodeStorageService.checkAndUpdateExpiry(qrCode.id);
        } catch (expiryError) {
          console.error('Error updating QR code expiry:', expiryError);
        }
        
        return {
          isValid: false,
          message: 'QR code has expired'
        };
      }
      
      // Verify the uniqueToken if present
      if (qrCode.qr_data?.uniqueToken) {
        try {
          const expectedToken = this.generateUniqueToken(
            qrCode.qr_data.type === 'LOYALTY_CARD' 
              ? `${qrCode.customer_id}-${qrCode.business_id}-${qrCode.qr_data.programId}-${qrCode.qr_data.cardId}`
              : qrCode.customer_id
          );
          
          if (qrCode.qr_data.uniqueToken !== expectedToken) {
            console.error('QR code token validation failed');
            return {
              isValid: false,
              message: 'QR code token validation failed'
            };
          }
        } catch (tokenError) {
          console.error('Error validating QR code token:', tokenError);
          return {
            isValid: false,
            message: 'Error validating QR code token'
          };
        }
      }

      // Record the scan with more information
      try {
        await QrCodeStorageService.recordQrCodeScan(
          qrCode.id,
          scannedById,
          true,
          {
            deviceInfo: {
              userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
              platform: typeof window !== 'undefined' ? window.navigator.platform : 'Unknown',
              timestamp: new Date().toISOString()
            },
            ipAddress: '0.0.0.0', // This should be populated with actual IP when available
            scanResult: { verified: true, method: 'enhanced_verification' }
          }
        );
      } catch (scanError) {
        console.error('Error recording QR code scan:', scanError);
        // Continue anyway - don't fail the verification just because we couldn't record it
      }

      // Return success with the QR code data
      return {
        isValid: true,
        qrCode: qrCode.qr_data,
        message: 'QR code verified successfully'
      };
    } catch (error) {
      console.error('Error verifying QR code:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      return {
        isValid: false,
        message: 'Error processing QR code'
      };
    }
  }

  /**
   * Get customer card information
   */
  static async getCustomerCardInfo(customerId: string | number): Promise<{
    cardNumber: string;
    cardType: string;
    expirationDate?: Date;
    isActive: boolean;
    programs: Array<{
      id: number;
      programId: number;
      businessId: number;
      programName: string;
      points: number;
      tierLevel: string;
      joinDate: Date;
      status: string;
    }>;
    promoCodes: Array<{
      id: number;
      code: string;
      description: string;
      discountType: string;
      discountValue: number;
      startDate: Date;
      endDate: Date;
      status: string;
      claimed: boolean;
      used: boolean;
    }>;
  }> {
    try {
      // Get the customer's QR code
      const qrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(
        customerId.toString(), 
        'CUSTOMER_CARD'
      );

      // Default response with generated card number
      const response = {
        cardNumber: this.generateConsistentCardNumber(customerId),
        cardType: 'STANDARD',
        isActive: true,
        expirationDate: undefined as Date | undefined,
        programs: [] as Array<{
          id: number;
          programId: number;
          businessId: number;
          programName: string;
          points: number;
          tierLevel: string;
          joinDate: Date;
          status: string;
        }>,
        promoCodes: [] as Array<{
          id: number;
          code: string;
          description: string;
          discountType: string;
          discountValue: number;
          startDate: Date;
          endDate: Date;
          status: string;
          claimed: boolean;
          used: boolean;
        }>
      };

      // If we found a QR code, update the response with its data
      if (qrCode) {
        try {
          const qrData = typeof qrCode.qr_data === 'string' 
            ? JSON.parse(qrCode.qr_data) 
            : qrCode.qr_data;
          
          response.cardNumber = qrData.cardNumber || response.cardNumber;
          response.cardType = qrData.cardType || response.cardType;
          response.expirationDate = qrCode.expiry_date;
          response.isActive = qrCode.status === 'ACTIVE';
        } catch (parseError) {
          console.error('Error parsing QR code data:', parseError);
        }
      }

      // Get enrolled programs
      response.programs = await this.getCustomerEnrolledPrograms(customerId);
      
      // Get promo codes
      response.promoCodes = await this.getCustomerAvailablePromoCodes(customerId);
      
      return response;
    } catch (error) {
      console.error('Error getting customer card info:', error);
      
      // Return default info with generated card number
      return {
        cardNumber: this.generateConsistentCardNumber(customerId),
        cardType: 'STANDARD',
        isActive: true,
        programs: [] as Array<{
          id: number;
          programId: number;
          businessId: number;
          programName: string;
          points: number;
          tierLevel: string;
          joinDate: Date;
          status: string;
        }>,
        promoCodes: [] as Array<{
          id: number;
          code: string;
          description: string;
          discountType: string;
          discountValue: number;
          startDate: Date;
          endDate: Date;
          status: string;
          claimed: boolean;
          used: boolean;
        }>
      };
    }
  }

  /**
   * Save QR code data for a user
   */
  static async saveQrCodeData(userId: string, qrData: QrCodeData | string): Promise<boolean> {
    try {
      // Check if qrData is already an object or needs parsing
      const qrDataObj = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      
      // Validate that qrDataObj has expected properties
      if (!qrDataObj) {
        logger.error('Invalid QR code data format');
        return false;
      }
      
      // Store as JSON string
      const jsonData = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);
      
      // Check if record exists
      const existingRecord = await db.query(
        'SELECT id FROM user_qrcodes WHERE user_id = $1',
        [userId]
      );

      if (existingRecord.rows.length > 0) {
        // Update existing record
        await db.query(
          'UPDATE user_qrcodes SET qr_data = $1, updated_at = NOW() WHERE user_id = $2',
          [jsonData, userId]
        );
      } else {
        // Insert new record
        await db.query(
          'INSERT INTO user_qrcodes (user_id, qr_data, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
          [userId, jsonData]
        );
      }

      return true;
    } catch (error) {
      logger.error('Error saving QR code data:', error);
      return false;
    }
  }

  /**
   * Get QR code data for a user
   */
  static async getQrCodeData(userId: string): Promise<QrCodeData | null> {
    try {
      const result = await db.query(
        'SELECT qr_data FROM user_qrcodes WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Safely parse the JSON data with error handling
      try {
        // Check if the data is already an object
        if (typeof result.rows[0].qr_data === 'object' && result.rows[0].qr_data !== null) {
          return result.rows[0].qr_data as QrCodeData;
        }
        
        // Otherwise parse the string
        return JSON.parse(result.rows[0].qr_data);
      } catch (parseError) {
        logger.error('Error parsing QR code data:', parseError);
        
        // Return a basic valid object rather than null
        return {
          type: 'unknown',
          rawData: `Failed to parse data for user ${userId}`
        };
      }
    } catch (error) {
      logger.error('Error getting QR code data:', error);
      return null;
    }
  }

  /**
   * Update QR code usage count and last used timestamp
   */
  static async updateQrCodeUsage(userId: string): Promise<boolean> {
    try {
      const result = await db.query(
        `UPDATE user_qrcodes 
        SET usage_count = COALESCE(usage_count, 0) + 1, last_used = NOW() 
        WHERE user_id = $1
        RETURNING id`,
        [userId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error updating QR code usage:', error);
      return false;
    }
  }
} 