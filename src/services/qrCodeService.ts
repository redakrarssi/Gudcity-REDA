import sql from '../utils/db';
import { createCustomerQRCode, createPromoQRCode, createLoyaltyCardQRCode } from '../utils/qrCodeGenerator';

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

export class QrCodeService {
  /**
   * Log a QR code scan
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
    try {
      const {
        customerId,
        programId,
        promoCodeId,
        pointsAwarded,
        errorMessage
      } = options;

      // Convert IDs to numbers if they're strings
      const scannedById = typeof scannedBy === 'string' ? parseInt(scannedBy) : scannedBy;
      const customerIdNum = customerId ? (typeof customerId === 'string' ? parseInt(customerId) : customerId) : null;
      const programIdNum = programId ? (typeof programId === 'string' ? parseInt(programId) : programId) : null;
      const promoCodeIdNum = promoCodeId ? (typeof promoCodeId === 'string' ? parseInt(promoCodeId) : promoCodeId) : null;
      
      // Create qr_scan_logs table if it doesn't exist
      await sql`
        CREATE TABLE IF NOT EXISTS qr_scan_logs (
          id SERIAL PRIMARY KEY,
          scan_type VARCHAR(20) NOT NULL,
          scanned_by INTEGER NOT NULL,
          scanned_data TEXT NOT NULL,
          customer_id INTEGER,
          program_id INTEGER,
          promo_code_id INTEGER,
          points_awarded INTEGER,
          success BOOLEAN NOT NULL DEFAULT FALSE,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
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
          error_message
        ) VALUES (
          ${scanType},
          ${scannedById},
          ${JSON.stringify(scannedData)},
          ${customerIdNum},
          ${programIdNum},
          ${promoCodeIdNum},
          ${pointsAwarded || null},
          ${success},
          ${errorMessage || null}
        )
        RETURNING id
      `;
      
      return result[0]?.id || null;
    } catch (error) {
      console.error('Error logging QR scan:', error);
      return null;
    }
  }
  
  /**
   * Get recent QR code scans for a business
   */
  static async getRecentScans(
    businessId: number | string, 
    limit = 10
  ): Promise<QrScanLog[]> {
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
        return [];
      }
      
      const result = await sql`
        SELECT * FROM qr_scan_logs
        WHERE scanned_by = ${businessIdNum}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return result;
    } catch (error) {
      console.error('Error getting recent QR scans:', error);
      return [];
    }
  }
  
  /**
   * Get scan statistics for a business
   */
  static async getScanStats(businessId: number | string): Promise<{
    totalScans: number;
    successfulScans: number;
    customerScans: number;
    promoScans: number;
    loyaltyScans: number;
    pointsAwarded: number;
  }> {
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
}

export default QrCodeService; 