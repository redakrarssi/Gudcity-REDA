/**
 * QR Code Service - API Version
 * 
 * This service replaces direct database connections with secure API calls.
 * All QR code operations now go through the serverless API layer.
 * 
 * Migration Status: ✅ COMPLETE
 * Security Level: 🔒 SECURE - No direct DB access
 */

import { qrApi, pointsApi, customerApi } from '../utils/enhancedApiClient';
import { logger } from '../utils/logger';

export interface QRCodeData {
  type: 'customer' | 'loyaltyCard';
  customerId?: string;
  cardId?: string;
  businessId?: string;
  programId?: string;
  cardNumber?: string;
  programName?: string;
  businessName?: string;
  points?: number;
  timestamp?: number;
}

/**
 * Service for managing QR codes with API integration
 */
export class QrCodeService {
  /**
   * Generate a QR code for a customer or loyalty card
   */
  static async generateQrCode(data: QRCodeData): Promise<{ success: boolean; qrCode?: string; qrImageUrl?: string; error?: string }> {
    try {
      logger.info('Generating QR code', { type: data.type });
      
      if (!data.type) {
        return { success: false, error: 'QR code type is required' };
      }

      const response = await qrApi.generate({
        type: data.type,
        customerId: data.customerId,
        cardId: data.cardId,
        businessId: data.businessId,
        programId: data.programId,
      });

      if (!response.success) {
        logger.error('Failed to generate QR code', { error: response.error });
        return { success: false, error: response.error || 'QR code generation failed' };
      }

      logger.info('QR code generated successfully');
      return {
        success: true,
        qrCode: response.data?.qrCode,
        qrImageUrl: response.data?.qrImageUrl
      };
    } catch (error) {
      logger.error('Error generating QR code', { error });
      return { success: false, error: 'An error occurred while generating QR code' };
    }
  }

  /**
   * Validate a QR code
   */
  static async validateQrCode(qrData: string): Promise<{ valid: boolean; data?: any; error?: string }> {
    try {
      logger.info('Validating QR code');

      const response = await qrApi.validate(qrData);

      if (!response.success) {
        logger.error('QR code validation failed', { error: response.error });
        return { valid: false, error: response.error || 'Invalid QR code' };
      }

      logger.info('QR code validated successfully');
      return {
        valid: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Error validating QR code', { error });
      return { valid: false, error: 'An error occurred while validating QR code' };
    }
  }

  /**
   * Process a customer QR code scan (for point awarding)
   */
  static async processCustomerQrCode(
    qrData: string,
    businessId: string,
    pointsToAward?: number
  ): Promise<{ success: boolean; customer?: any; message?: string; error?: string }> {
    try {
      logger.info('Processing customer QR code', { businessId });

      // First validate the QR code
      const validation = await this.validateQrCode(qrData);
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid QR code' };
      }

      // Scan the QR code
      const scanResponse = await qrApi.scan(qrData, businessId);

      if (!scanResponse.success) {
        logger.error('QR code scan failed', { error: scanResponse.error });
        return { success: false, error: scanResponse.error || 'QR code scan failed' };
      }

      // If points should be awarded, award them
      if (pointsToAward && pointsToAward > 0) {
        const customerData = scanResponse.data;
        
        if (customerData.programId) {
          const pointsResponse = await pointsApi.award({
            customerId: customerData.customerId,
            programId: customerData.programId,
            businessId: businessId,
            points: pointsToAward,
            description: 'Points awarded via QR scan',
            source: 'SCAN'
          });

          if (!pointsResponse.success) {
            logger.error('Failed to award points', { error: pointsResponse.error });
            // Don't fail the whole operation, just log the error
          } else {
            logger.info('Points awarded successfully', { points: pointsToAward });
          }
        }
      }

      return {
        success: true,
        customer: scanResponse.data,
        message: 'QR code processed successfully'
      };
    } catch (error) {
      logger.error('Error processing customer QR code', { error });
      return { success: false, error: 'An error occurred while processing QR code' };
    }
  }

  /**
   * Revoke a QR code (invalidate it)
   */
  static async revokeQrCode(qrCodeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Revoking QR code', { qrCodeId });

      const response = await qrApi.revoke(qrCodeId);

      if (!response.success) {
        logger.error('Failed to revoke QR code', { qrCodeId, error: response.error });
        return { success: false, error: response.error || 'Failed to revoke QR code' };
      }

      logger.info('QR code revoked successfully', { qrCodeId });
      return { success: true };
    } catch (error) {
      logger.error('Error revoking QR code', { qrCodeId, error });
      return { success: false, error: 'An error occurred while revoking QR code' };
    }
  }

  /**
   * Get QR code status
   */
  static async getQrCodeStatus(qrCodeId: string): Promise<{ status?: string; isActive?: boolean; error?: string }> {
    try {
      const response = await qrApi.getStatus(qrCodeId);

      if (!response.success) {
        logger.error('Failed to get QR code status', { qrCodeId, error: response.error });
        return { error: response.error || 'Failed to get QR code status' };
      }

      return {
        status: response.data?.status,
        isActive: response.data?.isActive
      };
    } catch (error) {
      logger.error('Error getting QR code status', { qrCodeId, error });
      return { error: 'An error occurred while getting QR code status' };
    }
  }

  /**
   * Generate customer QR code with full customer data
   */
  static async generateCustomerQrCode(customerId: string): Promise<{ success: boolean; qrCode?: string; qrImageUrl?: string; error?: string }> {
    try {
      // Get customer data first
      const customerResponse = await customerApi.get(customerId);

      if (!customerResponse.success) {
        return { success: false, error: 'Customer not found' };
      }

      const customer = customerResponse.data;

      // Generate QR code
      return await this.generateQrCode({
        type: 'customer',
        customerId: customer.id,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error generating customer QR code', { customerId, error });
      return { success: false, error: 'An error occurred while generating customer QR code' };
    }
  }

  /**
   * Generate loyalty card QR code
   */
  static async generateLoyaltyCardQrCode(cardId: string): Promise<{ success: boolean; qrCode?: string; qrImageUrl?: string; error?: string }> {
    try {
      return await this.generateQrCode({
        type: 'loyaltyCard',
        cardId: cardId,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Error generating loyalty card QR code', { cardId, error });
      return { success: false, error: 'An error occurred while generating loyalty card QR code' };
    }
  }

  /**
   * Parse QR code data
   */
  static parseQrCodeData(qrDataString: string): QRCodeData | null {
    try {
      const data = JSON.parse(qrDataString);
      
      // Validate required fields based on type
      if (data.type === 'customer' && !data.customerId) {
        logger.error('Invalid customer QR code: missing customerId');
        return null;
      }
      
      if (data.type === 'loyaltyCard' && (!data.cardId || !data.customerId || !data.programId)) {
        logger.error('Invalid loyalty card QR code: missing required fields');
        return null;
      }
      
      return data as QRCodeData;
    } catch (error) {
      logger.error('Error parsing QR code data', { error });
      return null;
    }
  }

  /**
   * Verify QR code format
   */
  static verifyQrCodeFormat(qrData: string): boolean {
    try {
      const parsed = this.parseQrCodeData(qrData);
      return parsed !== null;
    } catch {
      return false;
    }
  }
}

