import { QrCodeStorageService, QrCodeCreationParams } from './qrCodeStorageService';
import { createStandardCustomerQRCode, StandardQrCodeData } from '../utils/standardQrCodeGenerator';
import { User } from './userService';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Service to manage user QR codes, ensuring each customer has a valid QR code
 */
export class UserQrCodeService {
  // Use the same key for consistency in security
  private static readonly SECRET_KEY = process.env.QR_SECRET_KEY || 'gudcity-qr-security-key-with-additional-entropy-for-hmac-generation';

  /**
   * Generate a QR code for a newly registered customer
   */
  static async generateCustomerQrCode(user: User, cardDetails?: {
    cardNumber?: string;
    cardType?: string;
  }): Promise<string | null> {
    if (!user || !user.id) {
      return null;
    }
    
    try {
      // Generate a unique token and ID for security
      const uniqueToken = this.generateUniqueToken(user.id);
      const qrUniqueId = uuidv4();

      // Generate card number if not provided
      const cardNumber = cardDetails?.cardNumber || `${user.id}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      const cardType = cardDetails?.cardType || 'STANDARD';
      
      // Create a standardized QR code for the customer
      const qrImageUrl = await createStandardCustomerQRCode(
        user.id,
        undefined, // business ID not needed here
        user.name || 'Customer',
        cardNumber,
        cardType
      );
      
      // Store the QR code in the database
      try {
        // Standard QR code data
        const qrData: StandardQrCodeData = {
          type: 'CUSTOMER_CARD',
          qrUniqueId,
          timestamp: Date.now(),
          version: '1.0',
          customerId: user.id,
          customerName: user.name || 'Customer',
          cardNumber,
          cardType
        };
        
        // Try to store the QR code
        const params: QrCodeCreationParams = {
          customerId: user.id,
          qrType: 'CUSTOMER_CARD',
          data: JSON.stringify(qrData),
          imageUrl: qrImageUrl,
          isPrimary: true,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };
        
        await QrCodeStorageService.createQrCode(params);

        // Cache the result
        this.cacheQrCode(user.id.toString(), qrImageUrl);
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
    
    // Try to get from session storage cache first for performance
    const cachedQrCode = this.getCachedQrCode(userId);
    if (cachedQrCode && !cardDetails) {
      return cachedQrCode;
    }

    // Try to get from storage service
    try {
      // Get customer's primary QR code
      const qrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(userId, 'CUSTOMER_CARD');
      
      if (qrCode) {
        // Check if we have new card details to update
        if (cardDetails && qrCode.qr_data) {
          try {
            const existingData = JSON.parse(qrCode.qr_data);
            if (cardDetails.cardNumber && cardDetails.cardNumber !== existingData.cardNumber ||
                cardDetails.cardType && cardDetails.cardType !== existingData.cardType) {
              // Card details changed, generate a new QR code
              return this.generateCustomerQrCode(user, cardDetails);
            }
          } catch (parseError) {
            console.error('Error parsing QR code data:', parseError);
          }
        }
        
        // Use the existing QR code image URL
        if (qrCode.qr_image_url) {
          this.cacheQrCode(userId, qrCode.qr_image_url);
          return qrCode.qr_image_url;
        }
        
        // No image URL in storage, try to extract from qr_data
        if (qrCode.qr_data) {
          try {
            const data = JSON.parse(qrCode.qr_data);
            if (data.qrImageUrl) {
              this.cacheQrCode(userId, data.qrImageUrl);
              return data.qrImageUrl;
            }
          } catch (parseError) {
            console.error('Error parsing QR code data:', parseError);
          }
        }
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
  static async getQrCodeDetails(userId: string | number): Promise<{
    expirationDate?: Date;
    cardNumber?: string;
    cardType?: string;
    isActive?: boolean;
  } | null> {
    try {
      const qrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(userId.toString(), 'CUSTOMER_CARD');
      if (!qrCode) {
        return null;
      }

      const result: {
        expirationDate?: Date;
        cardNumber?: string;
        cardType?: string;
        isActive?: boolean;
      } = {
        expirationDate: qrCode.expiry_date,
        isActive: qrCode.status === 'ACTIVE'
      };

      // Try to extract card details from QR data
      if (qrCode.qr_data) {
        try {
          const data = JSON.parse(qrCode.qr_data);
          result.cardNumber = data.cardNumber;
          result.cardType = data.cardType;
        } catch (parseError) {
          console.error('Error parsing QR code data:', parseError);
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting QR code details:', error);
      return null;
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
} 