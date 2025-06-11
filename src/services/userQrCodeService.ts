import { QrCodeStorageService } from './qrCodeStorageService';
import { createStandardCustomerQRCode } from '../utils/standardQrCodeGenerator';
import { User } from './userService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to manage user QR codes, ensuring each customer has a valid QR code
 */
export class UserQrCodeService {
  // Use the same key for consistency in security
  private static readonly SECRET_KEY = process.env.QR_SECRET_KEY || 'gudcity-qr-security-key-with-additional-entropy-for-hmac-generation';

  /**
   * Generate a QR code for a newly registered customer
   */
  static async generateCustomerQrCode(user: User): Promise<string | null> {
    if (!user.id || user.user_type !== 'customer') {
      console.log('Cannot generate QR code for non-customer or missing user ID');
      return null;
    }

    try {
      console.log(`Generating QR code for customer: ${user.id} (${user.name})`);

      // Generate a unique token for this customer
      const uniqueToken = this.generateUniqueToken(user.id);
      const qrUniqueId = uuidv4();

      // First, generate the QR code image
      const qrData = {
        type: 'CUSTOMER_CARD',
        customerId: user.id,
        name: user.name,
        timestamp: Date.now(),
        uniqueToken,
        app: 'GudCity Loyalty',
        qrUniqueId
      };

      // Create a visual QR code for the user
      const qrImageUrl = await createStandardCustomerQRCode(
        user.id.toString(), 
        '', // No specific business yet
        user.name
      );

      if (!qrImageUrl) {
        console.error(`Failed to create QR code image for customer ${user.id}`);
        return null;
      }

      // Store the QR code in the database
      try {
        const storedQrCode = await QrCodeStorageService.createQrCode({
          customerId: user.id,
          qrType: 'MASTER_CARD', // This is the main customer card
          data: qrData,
          imageUrl: qrImageUrl,
          isPrimary: true, // This is the primary QR code
        });

        if (storedQrCode) {
          console.log(`QR code stored successfully for customer ${user.id}, unique ID: ${storedQrCode.qr_unique_id}`);
          return qrImageUrl;
        } else {
          console.error(`Failed to store QR code for customer ${user.id}`);
          return null;
        }
      } catch (dbError) {
        console.error(`Database error storing QR code for customer ${user.id}:`, dbError);
        return qrImageUrl; // Return the image URL anyway so the customer can still use it
      }
    } catch (error) {
      console.error('Error generating customer QR code:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }

  /**
   * Get a customer's primary QR code or generate one if it doesn't exist
   */
  static async getOrCreateCustomerQrCode(user: User): Promise<string | null> {
    if (!user.id || user.user_type !== 'customer') {
      return null;
    }

    try {
      // Check if user already has a primary QR code
      const existingQrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(
        user.id,
        'MASTER_CARD'
      );

      if (existingQrCode) {
        // If it exists, just return the image URL
        return existingQrCode.qr_image_url || null;
      }

      // If not, generate a new one
      return this.generateCustomerQrCode(user);
    } catch (error) {
      console.error('Error getting or creating customer QR code:', error);
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
  
  /**
   * Generate a unique token based on customer ID
   */
  private static generateUniqueToken(id: string | number): string {
    // Create a deterministic but hard-to-guess token for this customer
    const idStr = String(id);
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const payload = `${idStr}|${this.SECRET_KEY}|${timestamp}`;
    
    // Simple hash function (djb2)
    let hash = 5381;
    for (let i = 0; i < payload.length; i++) {
      hash = ((hash << 5) + hash) + payload.charCodeAt(i);
    }
    
    // Convert to alphanumeric string (base 36)
    return Math.abs(hash).toString(36);
  }

  /**
   * Get details about a QR code including expiration date
   */
  static async getQrCodeDetails(userId: string | number): Promise<{
    expirationDate: string;
    isActive: boolean;
    createdAt: string;
    lastUsed?: string;
  } | null> {
    try {
      // First check if the user has a QR code
      const existingQrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(
        typeof userId === 'string' ? parseInt(userId) : userId,
        'MASTER_CARD'
      );

      if (!existingQrCode) {
        return null;
      }

      // Set expiration date to 30 days from creation or last update
      const creationDate = new Date(existingQrCode.created_at || new Date());
      const expirationDate = new Date(creationDate);
      expirationDate.setDate(expirationDate.getDate() + 30); // 30 days validity

      return {
        expirationDate: expirationDate.toISOString(),
        isActive: true,
        createdAt: creationDate.toISOString(),
        lastUsed: existingQrCode.last_used_at ? new Date(existingQrCode.last_used_at).toISOString() : undefined
      };
    } catch (error) {
      console.error('Error getting QR code details:', error);
      return null;
    }
  }
} 