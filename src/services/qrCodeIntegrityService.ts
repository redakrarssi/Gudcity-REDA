/**
 * QR Code Integrity Service
 * 
 * Provides periodic integrity checks, database health monitoring,
 * and cleanup operations for QR codes in the Gudcity-REDA platform.
 */
import sql from '../utils/db';
import env from '../utils/env';
import { QrCodeDb } from '../utils/dbOperations';
import { withRetryableQuery, withRetryableTransaction } from '../utils/dbRetry';
import { logQrCodeError, QrDatabaseError } from '../utils/qrCodeErrorHandler';
import { QrCodeStorageService, CustomerQrCode } from './qrCodeStorageService';

/**
 * Results of integrity check operations
 */
export interface IntegrityCheckResult {
  checkType: string;
  total: number;
  passed: number;
  failed: number;
  orphaned: number;
  repaired: number;
  errors: Array<{
    qrCodeId: number | string;
    error: string;
    data?: any;
  }>;
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

/**
 * Service for maintaining QR code database integrity
 */
export class QrCodeIntegrityService {
  /**
   * Verify integrity of QR codes and their relationship to user accounts
   * 
   * @param options Configuration options for the integrity check
   * @returns Results of the integrity check
   */
  static async verifyQrCodeIntegrity(options: {
    batchSize?: number;
    repairMode?: boolean;
    logLevel?: 'minimal' | 'detailed' | 'verbose';
    qrType?: string;
    sinceDate?: Date;
  } = {}): Promise<IntegrityCheckResult> {
    const {
      batchSize = 100,
      repairMode = false,
      logLevel = 'detailed',
      qrType,
      sinceDate
    } = options;

    const startTime = new Date();
    const result: IntegrityCheckResult = {
      checkType: 'user-qrcode-relationship',
      total: 0,
      passed: 0,
      failed: 0,
      orphaned: 0,
      repaired: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      durationMs: 0
    };

    try {
      // Get total count of QR codes
      let totalQrCodesQuery;
      if (qrType && sinceDate) {
        totalQrCodesQuery = sql`
          SELECT COUNT(*) as count FROM customer_qrcodes
          WHERE qr_type = ${qrType} AND created_at >= ${sinceDate}
        `;
      } else if (qrType) {
        totalQrCodesQuery = sql`
          SELECT COUNT(*) as count FROM customer_qrcodes
          WHERE qr_type = ${qrType}
        `;
      } else if (sinceDate) {
        totalQrCodesQuery = sql`
          SELECT COUNT(*) as count FROM customer_qrcodes
          WHERE created_at >= ${sinceDate}
        `;
      } else {
        totalQrCodesQuery = sql`
          SELECT COUNT(*) as count FROM customer_qrcodes
        `;
      }
      
      const countResult = await withRetryableQuery(() => totalQrCodesQuery);
      const totalQrCodes = parseInt(countResult[0].count);
      result.total = totalQrCodes;
      
      // Process in batches to avoid memory issues
      let offset = 0;
      let processedCount = 0;
      
      while (offset < totalQrCodes) {
        // Get a batch of QR codes
        let qrCodesQuery;
        if (qrType && sinceDate) {
          qrCodesQuery = sql`
            SELECT id, qr_unique_id, customer_id, business_id, qr_type, status, qr_data, digital_signature
            FROM customer_qrcodes
            WHERE qr_type = ${qrType} AND created_at >= ${sinceDate}
            ORDER BY id
            LIMIT ${batchSize} OFFSET ${offset}
          `;
        } else if (qrType) {
          qrCodesQuery = sql`
            SELECT id, qr_unique_id, customer_id, business_id, qr_type, status, qr_data, digital_signature
            FROM customer_qrcodes
            WHERE qr_type = ${qrType}
            ORDER BY id
            LIMIT ${batchSize} OFFSET ${offset}
          `;
        } else if (sinceDate) {
          qrCodesQuery = sql`
            SELECT id, qr_unique_id, customer_id, business_id, qr_type, status, qr_data, digital_signature
            FROM customer_qrcodes
            WHERE created_at >= ${sinceDate}
            ORDER BY id
            LIMIT ${batchSize} OFFSET ${offset}
          `;
        } else {
          qrCodesQuery = sql`
            SELECT id, qr_unique_id, customer_id, business_id, qr_type, status, qr_data, digital_signature
            FROM customer_qrcodes
            ORDER BY id
            LIMIT ${batchSize} OFFSET ${offset}
          `;
        }
        
        const qrCodesResult = await withRetryableQuery(() => qrCodesQuery);
        
        // Process each QR code in the batch
        for (const qrCode of qrCodesResult) {
          processedCount++;
          
          try {
            // Check if customer exists
            const customerResult = await withRetryableQuery(() => sql`
              SELECT id, status FROM users 
              WHERE id = ${qrCode.customer_id} AND user_type = 'customer'
            `);
            
            if (customerResult.length === 0) {
              // Customer doesn't exist - orphaned QR code
              result.orphaned++;
              result.failed++;
              
              if (logLevel !== 'minimal') {
                result.errors.push({
                  qrCodeId: qrCode.id,
                  error: `Orphaned QR code: Customer ID ${qrCode.customer_id} not found`,
                  data: { qrCode }
                });
              }
              
              // Repair if in repair mode
              if (repairMode) {
                await this.handleOrphanedQrCode(qrCode.id);
                result.repaired++;
              }
            } else if (customerResult[0].status !== 'active') {
              // Customer exists but is not active
              result.failed++;
              
              if (logLevel !== 'minimal') {
                result.errors.push({
                  qrCodeId: qrCode.id,
                  error: `QR code linked to inactive customer: ${qrCode.customer_id}`,
                  data: { qrCode, customerStatus: customerResult[0].status }
                });
              }
              
              // Repair if in repair mode - expire QR codes for inactive customers
              if (repairMode && qrCode.status === 'ACTIVE') {
                await QrCodeStorageService.checkAndUpdateExpiry(qrCode.id);
                result.repaired++;
              }
            } else {
              // Customer exists and is active
              result.passed++;
            }
            
            // If a business ID is associated, verify it exists
            if (qrCode.business_id) {
              const businessResult = await withRetryableQuery(() => sql`
                SELECT id, status FROM users 
                WHERE id = ${qrCode.business_id} AND user_type = 'business'
              `);
              
              if (businessResult.length === 0) {
                // Business doesn't exist - data inconsistency
                result.failed++;
                
                if (logLevel !== 'minimal') {
                  result.errors.push({
                    qrCodeId: qrCode.id,
                    error: `QR code references non-existent business: ${qrCode.business_id}`,
                    data: { qrCode }
                  });
                }
                
                // Repair if in repair mode - clear invalid business ID
                if (repairMode) {
                  await this.clearInvalidBusinessId(qrCode.id);
                  result.repaired++;
                }
              }
            }
            
            // Check QR data integrity
            if (!qrCode.qr_data || typeof qrCode.qr_data !== 'object') {
              result.failed++;
              
              if (logLevel !== 'minimal') {
                result.errors.push({
                  qrCodeId: qrCode.id,
                  error: 'QR code has invalid data format',
                  data: { qrCode }
                });
              }
            }
            
            // Verify signature if present
            if (qrCode.qr_data && qrCode.digital_signature) {
              const isValid = QrCodeStorageService.validateQrCode(qrCode as CustomerQrCode);
              
              if (!isValid) {
                result.failed++;
                
                if (logLevel !== 'minimal') {
                  result.errors.push({
                    qrCodeId: qrCode.id,
                    error: 'QR code has invalid digital signature',
                    data: { qrCode }
                  });
                }
                
                // Repair if in repair mode - regenerate signature
                if (repairMode) {
                  await this.regenerateQrCodeSignature(qrCode.id, qrCode.qr_data);
                  result.repaired++;
                }
              }
            }
          } catch (error) {
            console.error(`Error checking QR code ${qrCode.id}:`, error);
            
            if (logLevel !== 'minimal') {
              result.errors.push({
                qrCodeId: qrCode.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                data: { qrCode }
              });
            }
            
            result.failed++;
          }
          
          // Log progress for long-running checks
          if (processedCount % 1000 === 0 || processedCount === totalQrCodes) {
            console.log(`QR code integrity check progress: ${processedCount}/${totalQrCodes}`);
          }
        }
        
        offset += batchSize;
      }
      
      // Record the results
      const endTime = new Date();
      result.endTime = endTime;
      result.durationMs = endTime.getTime() - startTime.getTime();
      
      // Log integrity check to database
      await this.logIntegrityCheck(result);
      
      return result;
    } catch (error) {
      console.error('Error during QR code integrity check:', error);
      
      const endTime = new Date();
      result.endTime = endTime;
      result.durationMs = endTime.getTime() - startTime.getTime();
      
      if (error instanceof Error) {
        result.errors.push({
          qrCodeId: 'system',
          error: `System error: ${error.message}`,
          data: { stack: error.stack }
        });
      }
      
      // Try to log the failed check
      try {
        await this.logIntegrityCheck(result);
      } catch (logError) {
        console.error('Failed to log integrity check result:', logError);
      }
      
      return result;
    }
  }

  /**
   * Clean up expired and revoked QR codes
   * 
   * @param options Configuration options for the cleanup process
   * @returns Number of QR codes processed and results
   */
  static async cleanupQrCodes(options: {
    olderThan?: number; // Days
    statuses?: Array<'EXPIRED' | 'REVOKED' | 'REPLACED'>;
    archiveMode?: boolean;
    limit?: number;
  } = {}): Promise<{
    archived: number;
    deleted: number;
    errors: Array<{
      qrCodeId: number | string;
      error: string;
    }>;
  }> {
    const {
      olderThan = 90, // Default to 90 days
      statuses = ['EXPIRED', 'REVOKED', 'REPLACED'],
      archiveMode = true, // Default to archive rather than delete
      limit = 1000 // Limit per batch
    } = options;

    const result = {
      archived: 0,
      deleted: 0,
      errors: [] as Array<{
        qrCodeId: number | string;
        error: string;
      }>
    };

    try {
      // Find QR codes to clean up
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThan);
      
      const qrCodesResult = await withRetryableQuery(() => sql`
        SELECT id, qr_unique_id, customer_id, qr_type, status, updated_at
        FROM customer_qrcodes
        WHERE status = ANY(${statuses})
        AND updated_at < ${cutoffDate}
        LIMIT ${limit}
      `);
      
      if (qrCodesResult.length === 0) {
        return result; // No QR codes to clean up
      }
      
      // Process each QR code
      for (const qrCode of qrCodesResult) {
        try {
          if (archiveMode) {
            // Archive the QR code data before removal
            await withRetryableTransaction(async () => {
              // Get full QR code data
              const fullQrCodeResult = await sql`
                SELECT qr_data, created_at
                FROM customer_qrcodes
                WHERE id = ${qrCode.id}
              `;
              
              if (fullQrCodeResult.length === 0) {
                throw new Error(`QR code ${qrCode.id} not found during cleanup archival`);
              }
              
              // Insert into archive table
              await sql`
                INSERT INTO qr_codes_archive (
                  original_id,
                  qr_unique_id,
                  customer_id,
                  qr_type,
                  status,
                  qr_data,
                  created_at,
                  last_updated,
                  archived_at
                ) VALUES (
                  ${qrCode.id},
                  ${qrCode.qr_unique_id},
                  ${qrCode.customer_id},
                  ${qrCode.qr_type},
                  ${qrCode.status},
                  ${fullQrCodeResult[0].qr_data},
                  ${fullQrCodeResult[0].created_at},
                  ${qrCode.updated_at},
                  NOW()
                )
              `;
              
              // Delete the original QR code
              await sql`
                DELETE FROM customer_qrcodes
                WHERE id = ${qrCode.id}
              `;
            });
            
            result.archived++;
          } else {
            // Direct deletion without archiving
            await withRetryableQuery(() => sql`
              DELETE FROM customer_qrcodes
              WHERE id = ${qrCode.id}
            `);
            
            result.deleted++;
          }
        } catch (error) {
          console.error(`Error cleaning up QR code ${qrCode.id}:`, error);
          result.errors.push({
            qrCodeId: qrCode.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error during QR code cleanup:', error);
      
      if (error instanceof Error) {
        result.errors.push({
          qrCodeId: 'system',
          error: `System error: ${error.message}`
        });
      }
      
      return result;
    }
  }

  /**
   * Create archive table if it doesn't exist
   */
  static async ensureArchiveTableExists(): Promise<void> {
    try {
      await withRetryableQuery(() => sql`
        CREATE TABLE IF NOT EXISTS qr_codes_archive (
          id SERIAL PRIMARY KEY,
          original_id INTEGER NOT NULL,
          qr_unique_id VARCHAR(36) NOT NULL,
          customer_id INTEGER NOT NULL,
          qr_type VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          qr_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
          archived_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
      `);
      
      // Create indexes
      await withRetryableQuery(() => sql`
        CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_original_id ON qr_codes_archive(original_id)
      `);
      
      await withRetryableQuery(() => sql`
        CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_qr_unique_id ON qr_codes_archive(qr_unique_id)
      `);
      
      await withRetryableQuery(() => sql`
        CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_customer_id ON qr_codes_archive(customer_id)
      `);
      
      await withRetryableQuery(() => sql`
        CREATE INDEX IF NOT EXISTS idx_qr_codes_archive_archived_at ON qr_codes_archive(archived_at)
      `);
    } catch (error) {
      console.error('Error ensuring archive table exists:', error);
      throw new QrDatabaseError('Failed to create QR code archive table', { error });
    }
  }

  /**
   * Create integrity check log table if it doesn't exist
   */
  static async ensureIntegrityLogTableExists(): Promise<void> {
    try {
      await withRetryableQuery(() => sql`
        CREATE TABLE IF NOT EXISTS qr_code_integrity_logs (
          id SERIAL PRIMARY KEY,
          check_type VARCHAR(50) NOT NULL,
          total_checked INTEGER NOT NULL,
          passed INTEGER NOT NULL,
          failed INTEGER NOT NULL,
          orphaned INTEGER NOT NULL,
          repaired INTEGER NOT NULL,
          error_details JSONB,
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE NOT NULL,
          duration_ms INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await withRetryableQuery(() => sql`
        CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_logs_check_type 
        ON qr_code_integrity_logs(check_type)
      `);
      
      await withRetryableQuery(() => sql`
        CREATE INDEX IF NOT EXISTS idx_qr_code_integrity_logs_created_at 
        ON qr_code_integrity_logs(created_at)
      `);
    } catch (error) {
      console.error('Error ensuring integrity log table exists:', error);
      throw new QrDatabaseError('Failed to create QR code integrity logs table', { error });
    }
  }

  /**
   * Log integrity check results to database
   */
  private static async logIntegrityCheck(result: IntegrityCheckResult): Promise<void> {
    try {
      // Ensure log table exists
      await this.ensureIntegrityLogTableExists();
      
      // Insert log record
      await withRetryableQuery(() => sql`
        INSERT INTO qr_code_integrity_logs (
          check_type,
          total_checked,
          passed,
          failed,
          orphaned,
          repaired,
          error_details,
          start_time,
          end_time,
          duration_ms
        ) VALUES (
          ${result.checkType},
          ${result.total},
          ${result.passed},
          ${result.failed},
          ${result.orphaned},
          ${result.repaired},
          ${JSON.stringify(result.errors)},
          ${result.startTime},
          ${result.endTime},
          ${result.durationMs}
        )
      `);
    } catch (error) {
      console.error('Error logging integrity check:', error);
      // Don't throw, just log the error
    }
  }

  /**
   * Get a QR code by its database ID
   */
  private static async getQrCodeById(id: number | string): Promise<CustomerQrCode | null> {
    try {
      // Query the database directly
      const result = await withRetryableQuery(() => sql`
        SELECT * FROM customer_qrcodes
        WHERE id = ${id}
        LIMIT 1
      `);
      
      return result.length > 0 ? result[0] as CustomerQrCode : null;
    } catch (error) {
      console.error(`Error getting QR code by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Handle orphaned QR codes (customer doesn't exist)
   */
  private static async handleOrphanedQrCode(qrCodeId: number | string): Promise<void> {
    try {
      // Get QR code details
      const qrCode = await this.getQrCodeById(qrCodeId);
      
      if (!qrCode) {
        console.error(`QR code ${qrCodeId} not found during orphaned handling`);
        return;
      }
      
      // Archive the QR code data
      await this.ensureArchiveTableExists();
      
      await withRetryableTransaction(async () => {
        // Insert into archive table
        await sql`
          INSERT INTO qr_codes_archive (
            original_id,
            qr_unique_id,
            customer_id,
            qr_type,
            status,
            qr_data,
            created_at,
            last_updated,
            archived_at
          ) VALUES (
            ${qrCode.id},
            ${qrCode.qr_unique_id},
            ${qrCode.customer_id},
            ${qrCode.qr_type},
            ${'ORPHANED'}, 
            ${JSON.stringify(qrCode.qr_data)},
            ${qrCode.created_at},
            ${qrCode.updated_at},
            NOW()
          )
        `;
        
        // Update the QR code status to expired
        await sql`
          UPDATE customer_qrcodes
          SET status = 'EXPIRED', updated_at = NOW()
          WHERE id = ${qrCodeId}
        `;
      });
    } catch (error) {
      console.error(`Error handling orphaned QR code ${qrCodeId}:`, error);
      throw new QrDatabaseError('Failed to handle orphaned QR code', { qrCodeId, error });
    }
  }

  /**
   * Clear invalid business ID from QR code
   */
  private static async clearInvalidBusinessId(qrCodeId: number | string): Promise<void> {
    try {
      await withRetryableQuery(() => sql`
        UPDATE customer_qrcodes
        SET business_id = NULL, updated_at = NOW()
        WHERE id = ${qrCodeId}
      `);
    } catch (error) {
      console.error(`Error clearing invalid business ID for QR code ${qrCodeId}:`, error);
      throw new QrDatabaseError('Failed to clear invalid business ID', { qrCodeId, error });
    }
  }

  /**
   * Create a simple digital signature for data verification
   */
  private static createDigitalSignature(data: any): string {
    try {
      // Convert data to string if it's not already
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Get the secret key from environment or use a default
      const secretKey = env.QR_SECRET_KEY || 'gudcity-qr-security-key-with-additional-entropy-for-hmac-generation';
      
      // Combine with secret key and current timestamp
      const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
      const signaturePayload = `${dataString}|${secretKey}|${timestamp}`;
      
      // Use a simple hash for browser compatibility
      let hash = 0;
      for (let i = 0; i < signaturePayload.length; i++) {
        const char = signaturePayload.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Create a signature with the hash and timestamp for validation
      return `${hash.toString(16)}.${timestamp}`;
    } catch (error) {
      console.error('Error creating digital signature:', error);
      return '';
    }
  }

  /**
   * Regenerate digital signature for a QR code
   */
  private static async regenerateQrCodeSignature(qrCodeId: number | string, qrData: any): Promise<void> {
    try {
      // Create a new signature
      const signature = this.createDigitalSignature(qrData);
      
      // Update the QR code
      await withRetryableQuery(() => sql`
        UPDATE customer_qrcodes
        SET digital_signature = ${signature}, updated_at = NOW()
        WHERE id = ${qrCodeId}
      `);
    } catch (error) {
      console.error(`Error regenerating signature for QR code ${qrCodeId}:`, error);
      throw new QrDatabaseError('Failed to regenerate QR code signature', { qrCodeId, error });
    }
  }
}
