/**
 * QR Card Generator Utility
 * 
 * Standardized utility for generating QR codes for customer cards
 * using the consistent format that works with customer ID 4.
 * This ensures all future QR cards follow the same structure.
 */
import { v4 as uuidv4 } from 'uuid';
import { QrCodeStorageService } from '../services/qrCodeStorageService';
import { createStandardCustomerQRCode } from './standardQrCodeGenerator';
import { UserQrCodeService } from '../services/userQrCodeService';
import { User } from '../services/userService';
import { log as logger } from './logger';
import db from '../utils/db';

/**
 * QR Card Generator class that handles all QR code generation for customer cards
 */
export class QrCardGenerator {
  /**
   * Generate a QR code for a customer
   * @param customer The customer object or customer ID
   * @param options Additional options for QR code generation
   * @returns Promise that resolves to the QR code URL or null if generation failed
   */
  static async generateCustomerQrCode(
    customer: User | any | string | number,
    options: {
      isPrimary?: boolean;
      cardType?: string;
      expiryDays?: number;
    } = {}
  ): Promise<string | null> {
    try {
      // Extract customer ID and info
      let customerId: string | number;
      let customerName: string | undefined;
      let customerEmail: string | undefined;
      
      if (typeof customer === 'string' || typeof customer === 'number') {
        // If just an ID is provided
        customerId = customer;
      } else if ('id' in customer) {
        // If a User or Customer object is provided
        customerId = customer.id;
        customerName = 'name' in customer ? customer.name : undefined;
        customerEmail = 'email' in customer ? customer.email : undefined;
      } else {
        throw new Error('Invalid customer parameter');
      }
      
      // Default options
      const {
        isPrimary = true,
        cardType = 'STANDARD',
        expiryDays = 365
      } = options;
      
      // Generate a consistent card number
      const cardNumber = UserQrCodeService.generateConsistentCardNumber(customerId);
      
      // Generate QR code data URL using the standard generator
      const qrImageUrl = await createStandardCustomerQRCode(
        customerId,
        undefined, // No business ID for customer's primary QR
        customerName,
        customerEmail
      );
      
      if (!qrImageUrl) {
        throw new Error('Failed to generate QR code image');
      }
      
      // Create QR data object with the structure that works for customer ID 4
      const qrData = {
        type: 'customer',
        customerId: customerId,
        name: customerName,
        email: customerEmail,
        cardNumber: cardNumber,
        cardType: cardType,
        timestamp: Date.now()
      };
      
      // Set expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      
      // Store the QR code in the database
      const storedQrCode = await QrCodeStorageService.createQrCode({
        customerId: customerId,
        qrType: 'CUSTOMER_CARD',
        data: qrData,
        imageUrl: qrImageUrl,
        isPrimary: isPrimary,
        expiryDate: expiryDate
      });
      
      if (!storedQrCode) {
        throw new Error('Failed to store QR code in database');
      }
      
      // If this is set as primary, ensure any other QR codes are set to non-primary
      if (isPrimary && storedQrCode.id) {
        // Update other QR codes to non-primary
        try {
          await QrCardGenerator.updateOtherQrCodesToNonPrimary(
            customerId.toString(), 
            storedQrCode.id.toString(), 
            'CUSTOMER_CARD'
          );
        } catch (error) {
          logger.error('Error updating other QR codes to non-primary:', error);
          // Continue even if this fails
        }
      }
      
      logger.info(`Successfully generated QR code for customer ${customerId}`);
      return qrImageUrl;
    } catch (error) {
      logger.error('Error generating customer QR code:', error);
      return null;
    }
  }
  
  /**
   * Generate a QR code for a loyalty card
   * @param cardId The loyalty card ID
   * @param customerId The customer ID
   * @param programId The loyalty program ID
   * @param businessId The business ID
   * @param options Additional options for QR code generation
   * @returns Promise that resolves to the QR code URL or null if generation failed
   */
  static async generateLoyaltyCardQrCode(
    cardId: string | number,
    customerId: string | number,
    programId: string | number,
    businessId: string | number,
    options: {
      cardNumber?: string;
      programName?: string;
      businessName?: string;
      points?: number;
      expiryDays?: number;
    } = {}
  ): Promise<string | null> {
    try {
      // Default options
      const {
        cardNumber = UserQrCodeService.generateConsistentCardNumber(customerId),
        programName,
        businessName,
        points = 0,
        expiryDays = 365
      } = options;
      
      // Create the QR data object with the structure that works
      const qrData = {
        type: 'loyaltyCard',
        cardId: cardId,
        customerId: customerId,
        programId: programId,
        businessId: businessId,
        cardNumber: cardNumber,
        programName: programName,
        businessName: businessName,
        points: points,
        timestamp: Date.now()
      };
      
      // Generate QR code image
      const qrImageUrl = await createStandardCustomerQRCode(
        customerId,
        businessId,
        undefined,
        undefined
      );
      
      if (!qrImageUrl) {
        throw new Error('Failed to generate QR code image');
      }
      
      // Set expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      
      // Store the QR code in the database
      const storedQrCode = await QrCodeStorageService.createQrCode({
        customerId: customerId,
        businessId: businessId,
        qrType: 'LOYALTY_CARD',
        data: qrData,
        imageUrl: qrImageUrl,
        isPrimary: false, // Loyalty cards are never primary
        expiryDate: expiryDate
      });
      
      if (!storedQrCode) {
        throw new Error('Failed to store loyalty card QR code in database');
      }
      
      logger.info(`Successfully generated QR code for loyalty card ${cardId}`);
      return qrImageUrl;
    } catch (error) {
      logger.error('Error generating loyalty card QR code:', error);
      return null;
    }
  }
  
  /**
   * Update other QR codes to non-primary
   * @param customerId The customer ID
   * @param currentQrCodeId The current QR code ID to exclude
   * @param qrType The QR code type
   * @returns Promise that resolves to true if successful
   */
  static async updateOtherQrCodesToNonPrimary(
    customerId: string,
    currentQrCodeId: string,
    qrType: string
  ): Promise<boolean> {
    try {
      // Use the imported db module to update other QR codes
      await db`
        UPDATE customer_qrcodes
        SET is_primary = false, updated_at = NOW()
        WHERE customer_id = ${customerId}
        AND id != ${currentQrCodeId}
        AND qr_type = ${qrType}
      `;
      return true;
    } catch (error) {
      logger.error('Error updating QR codes to non-primary:', error);
      return false;
    }
  }
  
  /**
   * Ensure a customer has a valid QR code
   * This will check if a customer has a valid QR code and create one if not
   * @param customerId The customer ID
   * @returns Promise that resolves to true if customer has a valid QR code
   */
  static async ensureCustomerHasQrCode(customerId: string | number): Promise<boolean> {
    try {
      // Check if customer already has a primary QR code
      const existingQrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(
        customerId.toString(),
        'CUSTOMER_CARD'
      );
      
      if (existingQrCode && existingQrCode.status === 'ACTIVE') {
        // Customer already has an active QR code, validate its structure
        let qrData;
        try {
          qrData = typeof existingQrCode.qr_data === 'string'
            ? JSON.parse(existingQrCode.qr_data)
            : existingQrCode.qr_data;
        } catch (parseError) {
          logger.error(`Error parsing QR data for customer ${customerId}:`, parseError);
          qrData = {};
        }
        
        // Check if the QR code data has the required fields
        const hasCorrectStructure = qrData &&
          qrData.type === 'customer' &&
          qrData.customerId &&
          qrData.cardNumber;
        
        if (!hasCorrectStructure) {
          // QR code exists but has incorrect structure, generate a new one
          await this.generateCustomerQrCode(customerId);
        }
        
        return true;
      } else {
        // Customer doesn't have an active QR code, generate one
        const result = await this.generateCustomerQrCode(customerId);
        return !!result;
      }
    } catch (error) {
      logger.error(`Error ensuring QR code for customer ${customerId}:`, error);
      return false;
    }
  }
} 