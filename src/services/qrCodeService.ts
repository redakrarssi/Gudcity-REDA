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
  /**
   * Validate QR code data before processing
   */
  static validateQrData(scanType: QrScanLog['scan_type'], data: any): { valid: boolean; message: string } {
    try {
      // Basic validation checks
      if (!data) {
        return { valid: false, message: 'QR code data is empty' };
      }
      
      // Parse data if it's a string
      let parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Type-specific validations
      switch (scanType) {
        case 'CUSTOMER_CARD':
          if (!parsedData.customerId || !parsedData.customerName) {
            return { valid: false, message: 'Invalid customer card data: missing required fields' };
          }
          break;
        
        case 'PROMO_CODE':
          if (!parsedData.promoId || !parsedData.code) {
            return { valid: false, message: 'Invalid promo code data: missing required fields' };
          }
          break;
          
        case 'LOYALTY_CARD':
          if (!parsedData.programId || !parsedData.customerId) {
            return { valid: false, message: 'Invalid loyalty card data: missing required fields' };
          }
          break;
          
        default:
          return { valid: false, message: 'Unknown QR code type' };
      }
      
      return { valid: true, message: 'QR code data is valid' };
    } catch (error) {
      console.error('Error validating QR code data:', error);
      return { valid: false, message: 'Error parsing QR code data' };
    }
  }
  
  /**
   * Process QR code scan with transaction support
   */
  static async processQrCodeScan(
    scanType: QrScanLog['scan_type'],
    scannedBy: number | string,
    scannedData: any,
    options: {
      customerId?: number | string;
      programId?: number | string;
      promoCodeId?: number | string;
    } = {}
  ): Promise<{ success: boolean; message: string; pointsAwarded?: number; scanLogId?: number }> {
    // Start a transaction to ensure data consistency
    const client = await sql.query('BEGIN', []);
    
    try {
      // Validate the data first
      const validation = this.validateQrData(scanType, scannedData);
      if (!validation.valid) {
        await sql.query('ROLLBACK', []);
        return { success: false, message: validation.message };
      }
      
      // Parse data if it's a string
      const parsedData = typeof scannedData === 'string' ? JSON.parse(scannedData) : scannedData;
      
      // Convert IDs to numbers
      const scannedById = typeof scannedBy === 'string' ? parseInt(scannedBy) : scannedBy;
      const customerIdNum = options.customerId ? (typeof options.customerId === 'string' ? parseInt(options.customerId) : options.customerId) : undefined;
      const programIdNum = options.programId ? (typeof options.programId === 'string' ? parseInt(options.programId) : options.programId) : undefined;
      const promoCodeIdNum = options.promoCodeId ? (typeof options.promoCodeId === 'string' ? parseInt(options.promoCodeId) : options.promoCodeId) : undefined;
      
      // Process based on type
      let pointsAwarded = 0;
      let result = { success: true, message: 'QR code processed successfully' };
      
      switch (scanType) {
        case 'CUSTOMER_CARD':
          // Process customer card logic
          // e.g. Register customer visit, verify customer, etc.
          result = await this.processCustomerCard(scannedById, parsedData, customerIdNum);
          break;
          
        case 'PROMO_CODE':
          // Process promo code logic
          // e.g. Apply promotion, verify eligibility, etc.
          result = await this.processPromoCode(scannedById, parsedData, customerIdNum, promoCodeIdNum);
          break;
          
        case 'LOYALTY_CARD':
          // Process loyalty card logic
          // e.g. Award points, check program status, etc.
          const loyaltyResult = await this.processLoyaltyCard(scannedById, parsedData, customerIdNum, programIdNum);
          result = loyaltyResult;
          pointsAwarded = loyaltyResult.pointsAwarded || 0;
          break;
      }
      
      // If processing failed, rollback and return error
      if (!result.success) {
        await sql.query('ROLLBACK', []);
        return result;
      }
      
      // Log the scan
      const scanLogId = await this.logScan(
        scanType, 
        scannedById, 
        parsedData, 
        result.success, 
        {
          customerId: customerIdNum,
          programId: programIdNum,
          promoCodeId: promoCodeIdNum,
          pointsAwarded,
          errorMessage: result.success ? undefined : result.message
        }
      );
      
      // Commit the transaction
      await sql.query('COMMIT', []);
      
      return {
        ...result,
        pointsAwarded,
        scanLogId
      };
    } catch (error) {
      // Rollback the transaction on error
      await sql.query('ROLLBACK', []);
      console.error('Error processing QR code scan:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error processing QR code' 
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
      const customerIdNum = customerId ? (typeof customerId === 'string' ? parseInt(customerId) : customerId) : undefined;
      const programIdNum = programId ? (typeof programId === 'string' ? parseInt(programId) : programId) : undefined;
      const promoCodeIdNum = promoCodeId ? (typeof promoCodeId === 'string' ? parseInt(promoCodeId) : promoCodeId) : undefined;
      
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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT
        )
      `;
      
      // Ensure related tables exist
      await sql`
        CREATE TABLE IF NOT EXISTS customer_visits (
          id SERIAL PRIMARY KEY,
          business_id INTEGER NOT NULL,
          customer_id INTEGER NOT NULL,
          visit_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS promo_code_usages (
          id SERIAL PRIMARY KEY,
          promo_code_id INTEGER NOT NULL,
          business_id INTEGER NOT NULL,
          customer_id INTEGER,
          used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS loyalty_transactions (
          id SERIAL PRIMARY KEY,
          program_id INTEGER NOT NULL,
          customer_id INTEGER NOT NULL,
          business_id INTEGER NOT NULL,
          points INTEGER NOT NULL,
          transaction_type VARCHAR(20) NOT NULL,
          transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
          ${customerIdNum || null},
          ${programIdNum || null},
          ${promoCodeIdNum || null},
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
}

export default QrCodeService; 