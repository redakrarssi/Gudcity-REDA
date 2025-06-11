import sql from '../utils/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for QR Code data stored in the database
 */
export interface CustomerQrCode {
  id: number;
  qr_unique_id: string;
  customer_id: number;
  business_id?: number;
  qr_data: any;
  qr_image_url?: string;
  qr_type: 'CUSTOMER_CARD' | 'LOYALTY_CARD' | 'PROMO_CODE' | 'MASTER_CARD';
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'REPLACED';
  verification_code: string;
  is_primary: boolean;
  uses_count: number;
  last_used_at?: Date;
  expiry_date?: Date;
  revoked_reason?: string;
  revoked_at?: Date;
  replaced_by?: number;
  digital_signature?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface for QR Code scan data
 */
export interface QrCodeScan {
  id: number;
  qrcode_id: number;
  scanned_by: number;
  scan_location?: any;
  scan_device_info?: any;
  status: 'VALID' | 'INVALID' | 'SUSPICIOUS';
  points_awarded?: number;
  scan_result?: any;
  created_at: Date;
}

/**
 * Interface for creating a new QR code
 */
export interface QrCodeCreationParams {
  customerId: number | string;
  businessId?: number | string;
  qrType: CustomerQrCode['qr_type'];
  data: any;
  imageUrl?: string;
  isPrimary?: boolean;
  expiryDate?: Date;
}

/**
 * Service for securely managing customer QR codes
 */
export class QrCodeStorageService {
  private static readonly SECRET_KEY = process.env.QR_SECRET_KEY || 'gudcity-qr-security-key-with-additional-entropy-for-hmac-generation';
  private static readonly SIGNATURE_EXPIRY_DAYS = 180; // Signatures are valid for 180 days by default

  /**
   * Create a new QR code in the database
   */
  static async createQrCode(params: QrCodeCreationParams): Promise<CustomerQrCode | null> {
    try {
      // Start a transaction
      await sql`BEGIN`;
      
      try {
        // Convert string IDs to numbers if needed
        const customerId = typeof params.customerId === 'string' ? parseInt(params.customerId) : params.customerId;
        const businessId = params.businessId ? (typeof params.businessId === 'string' ? parseInt(params.businessId) : params.businessId) : null;
        
        // Generate a unique QR code ID (UUID)
        const qrUniqueId = uuidv4();
        
        // Generate a verification code (6 characters)
        const verificationCode = this.generateVerificationCode();
        
        // Create a digital signature for added security
        const signature = this.createDigitalSignature(params.data);
        
        // Validate inputs before inserting
        if (!customerId || customerId <= 0) {
          throw new Error('Invalid customer ID');
        }
        
        if (params.businessId && (typeof businessId !== 'number' || businessId <= 0)) {
          throw new Error('Invalid business ID');
        }
        
        if (!params.qrType) {
          throw new Error('QR code type is required');
        }

        // Insert the new QR code into the database
        const result = await sql`
          INSERT INTO customer_qrcodes (
            qr_unique_id,
            customer_id,
            business_id,
            qr_data,
            qr_image_url,
            qr_type,
            status,
            verification_code,
            is_primary,
            expiry_date,
            digital_signature,
            created_at,
            updated_at
          ) VALUES (
            ${qrUniqueId},
            ${customerId},
            ${businessId},
            ${params.data},
            ${params.imageUrl || null},
            ${params.qrType},
            ${'ACTIVE'},
            ${verificationCode},
            ${params.isPrimary || false},
            ${params.expiryDate || null},
            ${signature},
            NOW(),
            NOW()
          )
          RETURNING *
        `;

        if (result && result.length > 0) {
          // If this is set as primary, unset any existing primary QR codes
          if (params.isPrimary) {
            await sql`
              UPDATE customer_qrcodes
              SET is_primary = FALSE
              WHERE customer_id = ${customerId}
              AND id != ${result[0].id}
              AND qr_type = ${params.qrType}
            `;
          }
          
          // Commit the transaction
          await sql`COMMIT`;
          
          return result[0] as CustomerQrCode;
        } else {
          // No result returned, roll back
          await sql`ROLLBACK`;
          console.error('Failed to create QR code: No result returned');
          return null;
        }
      } catch (innerError) {
        // Roll back on any error
        await sql`ROLLBACK`;
        throw innerError;
      }
    } catch (error) {
      console.error('Error creating QR code:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return null;
    }
  }

  /**
   * Get a QR code by its unique ID
   */
  static async getQrCodeByUniqueId(qrUniqueId: string): Promise<CustomerQrCode | null> {
    try {
      const result = await sql`
        SELECT * FROM customer_qrcodes
        WHERE qr_unique_id = ${qrUniqueId}
      `;

      return result.length > 0 ? result[0] as CustomerQrCode : null;
    } catch (error) {
      console.error('Error getting QR code by unique ID:', error);
      return null;
    }
  }

  /**
   * Generate a secure verification code
   */
  private static generateVerificationCode(): string {
    // Create a 6-character verification code
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusable characters
    let result = '';
    
    // Use crypto.getRandomValues if available (browser) or Math.random as fallback
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const randomValues = new Uint8Array(6);
      window.crypto.getRandomValues(randomValues);
      
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(randomValues[i] % characters.length);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    }
    
    return result;
  }

  /**
   * Create a digital signature for QR code data validation
   */
  private static createDigitalSignature(data: any): string {
    try {
      // Convert data to string if it's not already
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Combine with secret key and current timestamp
      const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
      const signaturePayload = `${dataString}|${this.SECRET_KEY}|${timestamp}`;
      
      // Use a simpler hash for browser compatibility
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
   * Validate QR code data using its digital signature
   */
  static validateQrCode(qrCode: CustomerQrCode): boolean {
    if (!qrCode || !qrCode.qr_data || !qrCode.digital_signature) {
      return false;
    }
    
    try {
      // Extract timestamp from signature
      const parts = qrCode.digital_signature.split('.');
      if (parts.length !== 2) {
        return false;
      }
      
      const timestamp = parseInt(parts[1]);
      if (isNaN(timestamp)) {
        return false;
      }
      
      // Check if signature has expired
      const now = Math.floor(Date.now() / 1000);
      const expirySeconds = this.SIGNATURE_EXPIRY_DAYS * 24 * 60 * 60;
      if (now - timestamp > expirySeconds) {
        console.log('QR code signature has expired');
        return false;
      }
      
      // Recreate the signature for comparison
      const dataString = typeof qrCode.qr_data === 'string' ? qrCode.qr_data : JSON.stringify(qrCode.qr_data);
      const signaturePayload = `${dataString}|${this.SECRET_KEY}|${timestamp}`;
      
      let hash = 0;
      for (let i = 0; i < signaturePayload.length; i++) {
        const char = signaturePayload.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      const expectedSignature = `${hash.toString(16)}.${timestamp}`;
      
      return expectedSignature === qrCode.digital_signature;
    } catch (error) {
      console.error('Error validating QR code signature:', error);
      return false;
    }
  }

  /**
   * Get all active QR codes for a customer
   */
  static async getCustomerQrCodes(customerId: number | string, qrType?: CustomerQrCode['qr_type']): Promise<CustomerQrCode[]> {
    try {
      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      
      let query = sql`
        SELECT * FROM customer_qrcodes
        WHERE customer_id = ${customerIdNum}
        AND status = 'ACTIVE'
      `;
      
      if (qrType) {
        query = sql`
          SELECT * FROM customer_qrcodes
          WHERE customer_id = ${customerIdNum}
          AND status = 'ACTIVE'
          AND qr_type = ${qrType}
        `;
      }
      
      const result = await query;
      return result as CustomerQrCode[];
    } catch (error) {
      console.error('Error getting customer QR codes:', error);
      return [];
    }
  }

  /**
   * Get the primary QR code for a customer
   */
  static async getCustomerPrimaryQrCode(customerId: number | string, qrType: CustomerQrCode['qr_type']): Promise<CustomerQrCode | null> {
    try {
      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      
      const result = await sql`
        SELECT * FROM customer_qrcodes
        WHERE customer_id = ${customerIdNum}
        AND qr_type = ${qrType}
        AND is_primary = TRUE
        AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      return result.length > 0 ? result[0] as CustomerQrCode : null;
    } catch (error) {
      console.error('Error getting primary QR code:', error);
      return null;
    }
  }

  /**
   * Record a QR code scan
   */
  static async recordQrCodeScan(
    qrCodeId: number | string,
    scannedBy: number | string,
    isValid: boolean,
    details: {
      location?: any;
      deviceInfo?: any;
      pointsAwarded?: number;
      scanResult?: any;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<QrCodeScan | null> {
    try {
      const qrCodeIdNum = typeof qrCodeId === 'string' ? parseInt(qrCodeId) : qrCodeId;
      const scannedByNum = typeof scannedBy === 'string' ? parseInt(scannedBy) : scannedBy;
      
      // Validate inputs
      if (!qrCodeIdNum || qrCodeIdNum <= 0) {
        throw new Error('Invalid QR code ID');
      }
      
      if (!scannedByNum || scannedByNum <= 0) {
        throw new Error('Invalid scanner ID');
      }
      
      // Begin transaction
      await sql`BEGIN`;
      
      try {
        // Check if QR code exists
        const qrCodeCheck = await sql`
          SELECT id FROM customer_qrcodes
          WHERE id = ${qrCodeIdNum}
        `;
        
        if (!qrCodeCheck.length) {
          console.error(`QR code not found: ${qrCodeIdNum}`);
          await sql`ROLLBACK`;
          return null;
        }
        
        // Insert the scan record
        const result = await sql`
          INSERT INTO customer_qrcode_scans (
            qrcode_id,
            scanned_by,
            scan_location,
            scan_device_info,
            status,
            points_awarded,
            scan_result,
            ip_address,
            user_agent,
            created_at
          ) VALUES (
            ${qrCodeIdNum},
            ${scannedByNum},
            ${details.location || null},
            ${details.deviceInfo || null},
            ${isValid ? 'VALID' : 'INVALID'},
            ${details.pointsAwarded || null},
            ${details.scanResult || null},
            ${details.ipAddress || null},
            ${details.userAgent || null},
            NOW()
          )
          RETURNING *
        `;

        if (result && result.length > 0) {
          // Update the QR code's use count and last used timestamp
          await sql`
            UPDATE customer_qrcodes
            SET uses_count = uses_count + 1,
                last_used_at = NOW()
            WHERE id = ${qrCodeIdNum}
          `;
          
          // Check for suspicious activity (too many scans in a short period)
          const recentScansCount = await sql`
            SELECT COUNT(*) as count
            FROM customer_qrcode_scans
            WHERE qrcode_id = ${qrCodeIdNum}
            AND created_at > NOW() - INTERVAL '1 hour'
          `;
          
          // If there are too many scans, log a security event
          if (recentScansCount[0].count > 10) {
            await sql`
              INSERT INTO customer_qrcode_events (
                qrcode_id,
                event_type,
                event_data,
                created_at
              ) VALUES (
                ${qrCodeIdNum},
                'SECURITY_ALERT',
                ${JSON.stringify({ alert: 'High scan frequency', count: recentScansCount[0].count })},
                NOW()
              )
            `;
            
            console.warn(`Security alert: High scan frequency detected for QR code ${qrCodeIdNum}`);
          }
          
          // Commit the transaction
          await sql`COMMIT`;
          
          return result[0] as QrCodeScan;
        } else {
          // No scan record inserted
          await sql`ROLLBACK`;
          console.error('Failed to record QR code scan');
          return null;
        }
      } catch (innerError) {
        await sql`ROLLBACK`;
        throw innerError;
      }
    } catch (error) {
      console.error('Error recording QR code scan:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }

  /**
   * Revoke a QR code
   */
  static async revokeQrCode(qrCodeId: number | string, reason?: string): Promise<boolean> {
    try {
      const qrCodeIdNum = typeof qrCodeId === 'string' ? parseInt(qrCodeId) : qrCodeId;
      
      if (!qrCodeIdNum || qrCodeIdNum <= 0) {
        console.error('Invalid QR code ID for revocation');
        return false;
      }
      
      // Begin transaction
      await sql`BEGIN`;
      
      try {
        // First check if the QR code exists and is active
        const qrCodeCheck = await sql`
          SELECT id, status FROM customer_qrcodes
          WHERE id = ${qrCodeIdNum}
        `;
        
        if (!qrCodeCheck.length) {
          console.error(`QR code not found: ${qrCodeIdNum}`);
          await sql`ROLLBACK`;
          return false;
        }
        
        if (qrCodeCheck[0].status !== 'ACTIVE') {
          console.error(`Cannot revoke QR code that is not active. Current status: ${qrCodeCheck[0].status}`);
          await sql`ROLLBACK`;
          return false;
        }
      
        // Update the QR code status
        const result = await sql`
          UPDATE customer_qrcodes
          SET status = 'REVOKED',
              revoked_reason = ${reason || 'Manually revoked'},
              revoked_at = NOW(),
              updated_at = NOW()
          WHERE id = ${qrCodeIdNum}
          RETURNING id
        `;
        
        if (result && result.length > 0) {
          // Log the revocation action
          await sql`
            INSERT INTO customer_qrcode_events (
              qrcode_id,
              event_type,
              event_data,
              created_at
            ) VALUES (
              ${qrCodeIdNum},
              'REVOKED',
              ${JSON.stringify({ reason: reason || 'Manually revoked' })},
              NOW()
            )
          `;
          
          // Commit the transaction
          await sql`COMMIT`;
          return true;
        } else {
          await sql`ROLLBACK`;
          console.error('Failed to revoke QR code');
          return false;
        }
      } catch (innerError) {
        await sql`ROLLBACK`;
        throw innerError;
      }
    } catch (error) {
      console.error('Error revoking QR code:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return false;
    }
  }

  /**
   * Replace an existing QR code with a new one
   */
  static async replaceQrCode(oldQrCodeId: number | string, newQrCodeParams: QrCodeCreationParams): Promise<CustomerQrCode | null> {
    try {
      const oldQrCodeIdNum = typeof oldQrCodeId === 'string' ? parseInt(oldQrCodeId) : oldQrCodeId;
      
      if (!oldQrCodeIdNum || oldQrCodeIdNum <= 0) {
        console.error('Invalid QR code ID for replacement');
        return null;
      }
      
      // Begin transaction
      await sql`BEGIN`;
      
      try {
        // Get the old QR code details
        const oldQrCode = await sql`
          SELECT * FROM customer_qrcodes
          WHERE id = ${oldQrCodeIdNum}
        `;
        
        if (!oldQrCode || oldQrCode.length === 0) {
          console.error('Old QR code not found');
          await sql`ROLLBACK`;
          return null;
        }
        
        // Check if the QR code is in a replaceable state
        if (oldQrCode[0].status !== 'ACTIVE') {
          console.error(`Cannot replace QR code with status: ${oldQrCode[0].status}`);
          await sql`ROLLBACK`;
          return null;
        }

        // Create the new QR code with the transaction already started
        const newQrUniqueId = uuidv4();
        const verificationCode = this.generateVerificationCode();
        const signature = this.createDigitalSignature(newQrCodeParams.data);
        
        // Convert IDs for the new QR code
        const customerId = typeof newQrCodeParams.customerId === 'string' 
          ? parseInt(newQrCodeParams.customerId) 
          : newQrCodeParams.customerId;
          
        const businessId = newQrCodeParams.businessId 
          ? (typeof newQrCodeParams.businessId === 'string' 
            ? parseInt(newQrCodeParams.businessId) 
            : newQrCodeParams.businessId) 
          : null;
        
        // Insert new QR code
        const newQrCodeResult = await sql`
          INSERT INTO customer_qrcodes (
            qr_unique_id,
            customer_id,
            business_id,
            qr_data,
            qr_image_url,
            qr_type,
            status,
            verification_code,
            is_primary,
            expiry_date,
            digital_signature,
            created_at,
            updated_at
          ) VALUES (
            ${newQrUniqueId},
            ${customerId},
            ${businessId},
            ${newQrCodeParams.data},
            ${newQrCodeParams.imageUrl || null},
            ${newQrCodeParams.qrType},
            ${'ACTIVE'},
            ${verificationCode},
            ${oldQrCode[0].is_primary},
            ${newQrCodeParams.expiryDate || null},
            ${signature},
            NOW(),
            NOW()
          )
          RETURNING *
        `;

        if (!newQrCodeResult || newQrCodeResult.length === 0) {
          console.error('Failed to create new QR code');
          await sql`ROLLBACK`;
          return null;
        }

        // Update the old QR code's status and set the replacement reference
        await sql`
          UPDATE customer_qrcodes
          SET status = 'REPLACED',
              replaced_by = ${newQrCodeResult[0].id},
              updated_at = NOW()
          WHERE id = ${oldQrCodeIdNum}
        `;

        // Log the replacement event
        await sql`
          INSERT INTO customer_qrcode_events (
            qrcode_id,
            event_type,
            event_data,
            created_at
          ) VALUES (
            ${oldQrCodeIdNum},
            'REPLACED',
            ${JSON.stringify({ new_qrcode_id: newQrCodeResult[0].id })},
            NOW()
          )
        `;

        // Commit the transaction
        await sql`COMMIT`;
        
        return newQrCodeResult[0] as CustomerQrCode;
      } catch (innerError) {
        await sql`ROLLBACK`;
        throw innerError;
      }
    } catch (error) {
      console.error('Error replacing QR code:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }

  /**
   * Check if a QR code is expired and update its status accordingly
   */
  static async checkAndUpdateExpiry(qrCodeId: number | string): Promise<boolean> {
    try {
      const qrCodeIdNum = typeof qrCodeId === 'string' ? parseInt(qrCodeId) : qrCodeId;
      
      if (!qrCodeIdNum || qrCodeIdNum <= 0) {
        console.error('Invalid QR code ID for expiry check');
        return false;
      }
      
      // Begin transaction
      await sql`BEGIN`;
      
      try {
        // First check if the QR code exists and has an expiry date
        const qrCode = await sql`
          SELECT id, qr_unique_id, status, expiry_date 
          FROM customer_qrcodes
          WHERE id = ${qrCodeIdNum}
        `;
        
        if (!qrCode.length) {
          console.error(`QR code not found: ${qrCodeIdNum}`);
          await sql`ROLLBACK`;
          return false;
        }
        
        // If it's already expired or doesn't have an expiry date, just return
        if (qrCode[0].status === 'EXPIRED') {
          console.log(`QR code ${qrCodeIdNum} is already marked as expired`);
          await sql`ROLLBACK`;
          return true;
        }
        
        if (!qrCode[0].expiry_date) {
          console.log(`QR code ${qrCodeIdNum} has no expiry date`);
          await sql`ROLLBACK`;
          return false;
        }
        
        // Check if expired
        const now = new Date();
        const expiryDate = new Date(qrCode[0].expiry_date);
        
        if (expiryDate > now) {
          console.log(`QR code ${qrCodeIdNum} is not expired yet. Expires: ${expiryDate.toISOString()}`);
          await sql`ROLLBACK`;
          return false;
        }
        
        // Update the status to expired
        const result = await sql`
          UPDATE customer_qrcodes
          SET status = 'EXPIRED',
              updated_at = NOW()
          WHERE id = ${qrCodeIdNum}
          RETURNING id
        `;
        
        if (result && result.length > 0) {
          // Log the expiration event
          await sql`
            INSERT INTO customer_qrcode_events (
              qrcode_id,
              event_type,
              event_data,
              created_at
            ) VALUES (
              ${qrCodeIdNum},
              'EXPIRED',
              ${JSON.stringify({ expiry_date: expiryDate.toISOString() })},
              NOW()
            )
          `;
          
          // Commit the transaction
          await sql`COMMIT`;
          
          console.log(`QR code ${qrCodeIdNum} marked as expired`);
          return true;
        } else {
          await sql`ROLLBACK`;
          console.error(`Failed to update status for QR code ${qrCodeIdNum}`);
          return false;
        }
      } catch (innerError) {
        await sql`ROLLBACK`;
        throw innerError;
      }
    } catch (error) {
      console.error('Error checking QR code expiry:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return false;
    }
  }

  /**
   * Clean up expired QR codes
   */
  static async cleanupExpiredQrCodes(): Promise<number> {
    try {
      const result = await sql`
        UPDATE customer_qrcodes
        SET status = 'EXPIRED',
            updated_at = NOW()
        WHERE status = 'ACTIVE'
        AND expiry_date IS NOT NULL
        AND expiry_date < NOW()
        RETURNING id
      `;

      return result ? result.length : 0;
    } catch (error) {
      console.error('Error cleaning up expired QR codes:', error);
      return 0;
    }
  }
}