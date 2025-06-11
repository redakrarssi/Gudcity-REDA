/**
 * Database Operations Utility
 * 
 * Provides standardized database operations with error handling and retry support.
 * All operations use the retry mechanism and provide consistent error handling.
 */
import sql from './db';
import { withRetryableQuery, withRetryableTransaction } from './dbRetry';
import { QrDatabaseError, logQrCodeError } from './qrCodeErrorHandler';

/**
 * QR Code database operations with error handling and retry support
 */
export const QrCodeDb = {
  /**
   * Get a QR code by its unique ID
   */
  async getQrCodeByUniqueId(qrUniqueId: string, context?: Record<string, any>) {
    try {
      return await withRetryableQuery(
        () => sql`
          SELECT * FROM qr_codes
          WHERE qr_unique_id = ${qrUniqueId}
          LIMIT 1
        `,
        { operation: 'getQrCodeByUniqueId', qrUniqueId, ...context }
      ).then(result => result[0] || null);
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'getQrCodeByUniqueId', 
        qrUniqueId, 
        ...context 
      });
      throw new QrDatabaseError(
        `Failed to retrieve QR code with ID ${qrUniqueId}`, 
        { qrUniqueId, ...context }
      );
    }
  },
  
  /**
   * Get a QR code by its database ID
   */
  async getQrCodeById(id: number, context?: Record<string, any>) {
    try {
      return await withRetryableQuery(
        () => sql`
          SELECT * FROM qr_codes
          WHERE id = ${id}
          LIMIT 1
        `,
        { operation: 'getQrCodeById', id, ...context }
      ).then(result => result[0] || null);
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'getQrCodeById', 
        id, 
        ...context 
      });
      throw new QrDatabaseError(
        `Failed to retrieve QR code with database ID ${id}`, 
        { id, ...context }
      );
    }
  },
  
  /**
   * Update a QR code's status
   */
  async updateQrCodeStatus(id: number, status: string, context?: Record<string, any>) {
    try {
      return await withRetryableQuery(
        () => sql`
          UPDATE qr_codes
          SET status = ${status}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, status
        `,
        { operation: 'updateQrCodeStatus', id, status, ...context }
      ).then(result => result[0] || null);
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'updateQrCodeStatus', 
        id,
        status,
        ...context 
      });
      throw new QrDatabaseError(
        `Failed to update QR code status for ID ${id}`, 
        { id, status, ...context }
      );
    }
  },
  
  /**
   * Update a QR code's expiry date
   */
  async updateQrCodeExpiry(id: number, expiryDate: Date, context?: Record<string, any>) {
    try {
      return await withRetryableQuery(
        () => sql`
          UPDATE qr_codes
          SET expiry_date = ${expiryDate}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, expiry_date
        `,
        { operation: 'updateQrCodeExpiry', id, expiryDate, ...context }
      ).then(result => result[0] || null);
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'updateQrCodeExpiry', 
        id,
        expiryDate,
        ...context 
      });
      throw new QrDatabaseError(
        `Failed to update QR code expiry for ID ${id}`, 
        { id, expiryDate, ...context }
      );
    }
  },
  
  /**
   * Create a new QR code
   */
  async createQrCode(params: {
    qrUniqueId: string;
    qrType: string;
    qrData: any;
    customerId?: number;
    businessId?: number;
    status?: string;
    expiryDate?: Date;
    signature?: string;
  }, context?: Record<string, any>) {
    const {
      qrUniqueId,
      qrType,
      qrData,
      customerId,
      businessId,
      status = 'ACTIVE',
      expiryDate,
      signature
    } = params;
    
    try {
      return await withRetryableQuery(
        () => sql`
          INSERT INTO qr_codes (
            qr_unique_id,
            qr_type,
            qr_data,
            customer_id,
            business_id,
            status,
            expiry_date,
            digital_signature,
            created_at,
            updated_at
          ) VALUES (
            ${qrUniqueId},
            ${qrType},
            ${JSON.stringify(qrData)},
            ${customerId || null},
            ${businessId || null},
            ${status},
            ${expiryDate || null},
            ${signature || null},
            NOW(),
            NOW()
          )
          RETURNING *
        `,
        { operation: 'createQrCode', qrUniqueId, qrType, ...context }
      ).then(result => result[0] || null);
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'createQrCode', 
        qrUniqueId,
        qrType,
        customerId,
        businessId,
        ...context 
      });
      throw new QrDatabaseError(
        `Failed to create QR code with ID ${qrUniqueId}`, 
        { qrUniqueId, qrType, ...context }
      );
    }
  },
  
  /**
   * Log a QR code scan
   */
  async logQrCodeScan(params: {
    scanType: string;
    scannedBy: number;
    scannedData: any;
    success: boolean;
    customerId?: number;
    programId?: number;
    promoCodeId?: number;
    pointsAwarded?: number;
    errorMessage?: string;
  }, context?: Record<string, any>) {
    const {
      scanType,
      scannedBy,
      scannedData,
      success,
      customerId,
      programId,
      promoCodeId,
      pointsAwarded,
      errorMessage
    } = params;
    
    try {
      return await withRetryableQuery(
        () => sql`
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
            ${scannedBy},
            ${typeof scannedData === 'string' ? scannedData : JSON.stringify(scannedData)},
            ${customerId || null},
            ${programId || null},
            ${promoCodeId || null},
            ${pointsAwarded || null},
            ${success},
            ${errorMessage || null},
            NOW()
          )
          RETURNING id
        `,
        { operation: 'logQrCodeScan', scanType, scannedBy, ...context }
      ).then(result => result[0]?.id || null);
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'logQrCodeScan', 
        scanType,
        scannedBy,
        ...context 
      });
      // Don't throw here - log scan failures should not stop processing
      console.error('Failed to log QR code scan:', error);
      return null;
    }
  },
  
  /**
   * Check if a customer is rate limited
   */
  async isRateLimited(key: string, context?: Record<string, any>): Promise<boolean> {
    try {
      const result = await withRetryableQuery(
        () => sql`
          SELECT * FROM rate_limits
          WHERE key = ${key}
          AND expires_at > NOW()
        `,
        { operation: 'isRateLimited', key, ...context }
      );
      
      return result.length > 0 && result[0].attempts >= result[0].max_attempts;
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'isRateLimited', 
        key,
        ...context 
      });
      // Default to not rate limited on error to prevent blocking legitimate users
      console.error('Failed to check rate limit:', error);
      return false;
    }
  },
  
  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(key: string, maxAttempts = 5, expirySeconds = 60, context?: Record<string, any>): Promise<void> {
    try {
      await withRetryableTransaction(async () => {
        // Try to update existing rate limit
        const updateResult = await sql`
          UPDATE rate_limits
          SET attempts = attempts + 1,
              updated_at = NOW()
          WHERE key = ${key}
          AND expires_at > NOW()
          RETURNING id
        `;
        
        // If no existing rate limit, create new one
        if (!updateResult.length) {
          await sql`
            INSERT INTO rate_limits (
              key,
              attempts,
              max_attempts,
              expires_at,
              created_at,
              updated_at
            ) VALUES (
              ${key},
              1,
              ${maxAttempts},
              NOW() + INTERVAL '${expirySeconds} seconds',
              NOW(),
              NOW()
            )
          `;
        }
      }, { operation: 'incrementRateLimit', key, ...context });
    } catch (error) {
      logQrCodeError(error as Error, { 
        operation: 'incrementRateLimit', 
        key,
        ...context 
      });
      // Don't throw - rate limit failures should not stop processing
      console.error('Failed to increment rate limit:', error);
    }
  }
};

export default QrCodeDb; 