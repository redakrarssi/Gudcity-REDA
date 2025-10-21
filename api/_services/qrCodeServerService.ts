import sql from '../_lib/db';
import { TransactionServerService } from './transactionServerService';

export interface QrCodeData {
  type: 'customer' | 'loyaltyCard' | 'promoCode';
  customerId?: string;
  businessId?: string;
  programId?: string;
  cardId?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  pointsAwarded?: number;
  customerId?: string;
  customerName?: string;
  programName?: string;
  error?: string;
}

export interface QrCodeIntegrityCheck {
  valid: boolean;
  qrCodeId: string;
  status: string;
  lastUsed?: Date;
  usesCount: number;
  message: string;
}

/**
 * Server-side service for handling QR codes
 * All database operations for QR codes
 */
export class QrCodeServerService {
  /**
   * Process customer QR code scan
   */
  static async processCustomerQrCode(
    qrData: QrCodeData,
    businessId: string,
    pointsToAward: number = 10
  ): Promise<ProcessResult> {
    try {
      const customerId = qrData.customerId;

      if (!customerId) {
        return {
          success: false,
          message: 'Invalid QR code: missing customer ID',
          error: 'Missing customer ID'
        };
      }

      // Get customer information
      const customerIdInt = parseInt(customerId);
      const businessIdInt = parseInt(businessId);

      const customer = await sql`
        SELECT id, name, email FROM users 
        WHERE id = ${customerIdInt} AND user_type = 'customer'
      `;

      if (customer.length === 0) {
        return {
          success: false,
          message: 'Customer not found',
          error: 'Customer not found'
        };
      }

      // Get the business's loyalty program
      const programs = await sql`
        SELECT id, name FROM loyalty_programs 
        WHERE business_id = ${businessIdInt} 
        AND status = 'active'
        LIMIT 1
      `;

      if (programs.length === 0) {
        return {
          success: false,
          message: 'No active loyalty program found for this business',
          error: 'No active program'
        };
      }

      const program = programs[0];
      const programId = program.id.toString();

      // Award points using transaction service
      const result = await TransactionServerService.awardPoints(
        customerId,
        businessId,
        programId,
        pointsToAward,
        'QR_SCAN',
        'Points awarded via QR code scan'
      );

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to award points',
          error: result.error
        };
      }

      // Log the QR scan
      await this.logQrScan({
        scanType: 'CUSTOMER_CARD',
        scannedBy: businessIdInt,
        customerId: customerIdInt,
        programId: program.id,
        pointsAwarded: pointsToAward,
        success: true,
        scannedData: JSON.stringify(qrData)
      });

      return {
        success: true,
        message: `${pointsToAward} points awarded successfully`,
        pointsAwarded: pointsToAward,
        customerId,
        customerName: customer[0].name,
        programName: program.name
      };
    } catch (error) {
      console.error('Error processing customer QR code:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process loyalty card QR code scan
   */
  static async processLoyaltyCardQrCode(
    qrData: QrCodeData,
    businessId: string,
    pointsToAward: number = 10
  ): Promise<ProcessResult> {
    try {
      const { customerId, programId, cardId } = qrData;

      if (!customerId || !programId) {
        return {
          success: false,
          message: 'Invalid QR code: missing required data',
          error: 'Missing required fields'
        };
      }

      const customerIdInt = parseInt(customerId);
      const programIdInt = parseInt(programId);
      const businessIdInt = parseInt(businessId);

      // Verify the program belongs to this business
      const program = await sql`
        SELECT id, name, business_id FROM loyalty_programs 
        WHERE id = ${programIdInt}
      `;

      if (program.length === 0) {
        return {
          success: false,
          message: 'Loyalty program not found',
          error: 'Program not found'
        };
      }

      if (program[0].business_id !== businessIdInt) {
        return {
          success: false,
          message: 'This QR code belongs to a different business',
          error: 'Business mismatch'
        };
      }

      // Get customer information
      const customer = await sql`
        SELECT id, name, email FROM users 
        WHERE id = ${customerIdInt} AND user_type = 'customer'
      `;

      if (customer.length === 0) {
        return {
          success: false,
          message: 'Customer not found',
          error: 'Customer not found'
        };
      }

      // Award points
      const result = await TransactionServerService.awardPoints(
        customerId,
        businessId,
        programId,
        pointsToAward,
        'QR_SCAN',
        'Points awarded via loyalty card QR scan'
      );

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to award points',
          error: result.error
        };
      }

      // Log the scan
      await this.logQrScan({
        scanType: 'LOYALTY_CARD',
        scannedBy: businessIdInt,
        customerId: customerIdInt,
        programId: programIdInt,
        pointsAwarded: pointsToAward,
        success: true,
        scannedData: JSON.stringify(qrData)
      });

      return {
        success: true,
        message: `${pointsToAward} points awarded successfully`,
        pointsAwarded: pointsToAward,
        customerId,
        customerName: customer[0].name,
        programName: program[0].name
      };
    } catch (error) {
      console.error('Error processing loyalty card QR code:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate customer QR code data
   */
  static async generateCustomerQrCode(customerId: string): Promise<{
    success: boolean;
    qrData?: QrCodeData;
    error?: string;
  }> {
    try {
      const customerIdInt = parseInt(customerId);

      // Verify customer exists
      const customer = await sql`
        SELECT id, name, email FROM users 
        WHERE id = ${customerIdInt} AND user_type = 'customer'
      `;

      if (customer.length === 0) {
        return {
          success: false,
          error: 'Customer not found'
        };
      }

      const qrData: QrCodeData = {
        type: 'customer',
        customerId: customerId,
        timestamp: Date.now()
      };

      return {
        success: true,
        qrData
      };
    } catch (error) {
      console.error('Error generating customer QR code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate QR code data
   */
  static async validateQrCode(qrData: QrCodeData): Promise<{
    valid: boolean;
    message: string;
  }> {
    try {
      // Basic validation
      if (!qrData.type) {
        return {
          valid: false,
          message: 'Invalid QR code: missing type'
        };
      }

      if (qrData.type === 'customer') {
        if (!qrData.customerId) {
          return {
            valid: false,
            message: 'Invalid customer QR code: missing customer ID'
          };
        }

        // Verify customer exists
        const customerIdInt = parseInt(qrData.customerId);
        const customer = await sql`
          SELECT id FROM users 
          WHERE id = ${customerIdInt} AND user_type = 'customer'
        `;

        if (customer.length === 0) {
          return {
            valid: false,
            message: 'Customer not found'
          };
        }
      } else if (qrData.type === 'loyaltyCard') {
        if (!qrData.customerId || !qrData.programId) {
          return {
            valid: false,
            message: 'Invalid loyalty card QR code: missing required fields'
          };
        }

        // Verify customer and program exist
        const customerIdInt = parseInt(qrData.customerId);
        const programIdInt = parseInt(qrData.programId);

        const customer = await sql`
          SELECT id FROM users 
          WHERE id = ${customerIdInt} AND user_type = 'customer'
        `;

        const program = await sql`
          SELECT id FROM loyalty_programs WHERE id = ${programIdInt}
        `;

        if (customer.length === 0) {
          return {
            valid: false,
            message: 'Customer not found'
          };
        }

        if (program.length === 0) {
          return {
            valid: false,
            message: 'Loyalty program not found'
          };
        }
      }

      return {
        valid: true,
        message: 'QR code is valid'
      };
    } catch (error) {
      console.error('Error validating QR code:', error);
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Validation error'
      };
    }
  }

  /**
   * Get QR code integrity check
   */
  static async getQrCodeIntegrity(qrCodeId: string): Promise<QrCodeIntegrityCheck> {
    try {
      // Check if QR code exists in storage
      const qrCode = await sql`
        SELECT 
          qr_unique_id,
          status,
          last_used_at,
          uses_count
        FROM customer_qrcodes
        WHERE qr_unique_id = ${qrCodeId}
      `;

      if (qrCode.length === 0) {
        return {
          valid: false,
          qrCodeId,
          status: 'NOT_FOUND',
          usesCount: 0,
          message: 'QR code not found in database'
        };
      }

      const qr = qrCode[0];

      return {
        valid: qr.status === 'ACTIVE',
        qrCodeId,
        status: qr.status,
        lastUsed: qr.last_used_at,
        usesCount: qr.uses_count || 0,
        message: qr.status === 'ACTIVE' ? 'QR code is valid' : `QR code status: ${qr.status}`
      };
    } catch (error) {
      console.error('Error checking QR code integrity:', error);
      return {
        valid: false,
        qrCodeId,
        status: 'ERROR',
        usesCount: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log QR code scan
   */
  private static async logQrScan(params: {
    scanType: 'CUSTOMER_CARD' | 'LOYALTY_CARD' | 'PROMO_CODE';
    scannedBy: number;
    customerId?: number;
    programId?: number;
    promoCodeId?: number;
    pointsAwarded?: number;
    success: boolean;
    scannedData: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await sql`
        INSERT INTO qr_scan_logs (
          scan_type,
          scanned_by,
          customer_id,
          program_id,
          promo_code_id,
          points_awarded,
          success,
          scanned_data,
          error_message,
          created_at
        )
        VALUES (
          ${params.scanType},
          ${params.scannedBy},
          ${params.customerId || null},
          ${params.programId || null},
          ${params.promoCodeId || null},
          ${params.pointsAwarded || null},
          ${params.success},
          ${params.scannedData},
          ${params.errorMessage || null},
          NOW()
        )
      `;
    } catch (error) {
      console.error('Error logging QR scan:', error);
      // Don't throw - logging failure shouldn't break the scan
    }
  }

  /**
   * Get QR scan statistics for a business
   */
  static async getQrScanStats(
    businessId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    totalPointsAwarded: number;
  }> {
    try {
      const businessIdInt = parseInt(businessId);

      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = `AND created_at BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`;
      }

      const stats = await sql.unsafe(`
        SELECT 
          COUNT(*) as total_scans,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_scans,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_scans,
          SUM(COALESCE(points_awarded, 0)) as total_points_awarded
        FROM qr_scan_logs
        WHERE scanned_by = ${businessIdInt}
        ${dateFilter}
      `);

      return {
        totalScans: parseInt(stats[0].total_scans) || 0,
        successfulScans: parseInt(stats[0].successful_scans) || 0,
        failedScans: parseInt(stats[0].failed_scans) || 0,
        totalPointsAwarded: parseInt(stats[0].total_points_awarded) || 0
      };
    } catch (error) {
      console.error('Error getting QR scan stats:', error);
      return {
        totalScans: 0,
        successfulScans: 0,
        failedScans: 0,
        totalPointsAwarded: 0
      };
    }
  }
}

