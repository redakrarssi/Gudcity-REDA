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
      // First check if the table exists
      const tableExists = await sql.tableExists('customer_qrcodes');
      if (!tableExists) {
        console.error('customer_qrcodes table does not exist in the database');
        return null;
      }

      // Start a transaction
      await sql.begin();
      
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
          await sql.rollback();
          throw new Error('Invalid customer ID');
        }
        
        if (params.businessId && (typeof businessId !== 'number' || businessId <= 0)) {
          await sql.rollback();
          throw new Error('Invalid business ID');
        }
        
        if (!params.qrType) {
          await sql.rollback();
          throw new Error('QR code type is required');
        }

        // Insert the new QR code into the database
        const result = await sql.query(`
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
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
          )
          RETURNING *
        `, [
          qrUniqueId,
          customerId,
          businessId,
          params.data,
          params.imageUrl || null,
          params.qrType,
          'ACTIVE',
          verificationCode,
          params.isPrimary || false,
          params.expiryDate || null,
          signature
        ]);

        if (result && result.length > 0) {
          // If this is set as primary, unset any existing primary QR codes
          if (params.isPrimary) {
            await sql.query(`
              UPDATE customer_qrcodes
              SET is_primary = FALSE
              WHERE customer_id = $1
              AND id != $2
              AND qr_type = $3
            `, [customerId, result[0].id, params.qrType]);
          }
          
          // Commit the transaction
          await sql.commit();
          
          console.log(`Successfully created QR code for customer ${customerId}, QR ID: ${qrUniqueId}`);
          return result[0] as unknown as CustomerQrCode;
        } else {
          // No result returned, roll back
          await sql.rollback();
          console.error('Failed to create QR code: No result returned');
          return null;
        }
      } catch (innerError) {
        // Roll back on any error
        await sql.rollback();
        console.error('Inner transaction error:', innerError);
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
      const result = await sql.query(`
        SELECT * FROM customer_qrcodes
        WHERE qr_unique_id = $1
      `, [qrUniqueId]);

      return result.length > 0 ? result[0] as unknown as CustomerQrCode : null;
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
   * Get all QR codes for a specific customer
   */
  static async getCustomerQrCodes(customerId: number | string, qrType?: CustomerQrCode['qr_type']): Promise<CustomerQrCode[]> {
    try {
      // Convert customer ID to number if needed
      const custId = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      
      let result;
      if (qrType) {
        // Filter by QR code type
        result = await sql.query(`
          SELECT * FROM customer_qrcodes
          WHERE customer_id = $1
          AND qr_type = $2
          ORDER BY created_at DESC
        `, [custId, qrType]);
      } else {
        // Get all QR codes for the customer
        result = await sql.query(`
          SELECT * FROM customer_qrcodes
          WHERE customer_id = $1
          ORDER BY created_at DESC
        `, [custId]);
      }

      return result.map(row => row as unknown as CustomerQrCode);
    } catch (error) {
      console.error('Error getting customer QR codes:', error);
      return [];
    }
  }

  /**
   * Get a customer's primary QR code
   */
  static async getCustomerPrimaryQrCode(customerId: number | string, qrType: CustomerQrCode['qr_type']): Promise<CustomerQrCode | null> {
    try {
      // First check if the table exists
      const tableExists = await sql.tableExists('customer_qrcodes');
      if (!tableExists) {
        console.error('customer_qrcodes table does not exist');
        return null;
      }

      // Convert string ID to number if needed
      const custId = typeof customerId === 'string' ? parseInt(customerId) : customerId;

      // Get the primary QR code for this customer and type
      const result = await sql`
        SELECT * FROM customer_qrcodes
        WHERE customer_id = ${custId} AND qr_type = ${qrType} AND is_primary = TRUE AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      // If no primary QR code exists, look for any active QR code
      if (result.length === 0) {
        const fallbackResult = await sql`
          SELECT * FROM customer_qrcodes
          WHERE customer_id = ${custId} AND qr_type = ${qrType} AND status = 'ACTIVE'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        return fallbackResult.length > 0 ? fallbackResult[0] as unknown as CustomerQrCode : null;
      }

      return result[0] as unknown as CustomerQrCode;
    } catch (error) {
      console.error('Error getting customer primary QR code:', error);
      return null;
    }
  }

  /**
   * Record a QR code scan and validate it
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
      // First check if the table exists
      const tableExists = await sql.tableExists('qr_code_scans');
      if (!tableExists) {
        // Create the table if it doesn't exist
        await sql`
          CREATE TABLE IF NOT EXISTS qr_code_scans (
            id SERIAL PRIMARY KEY,
            qrcode_id INTEGER NOT NULL,
            scanned_by INTEGER NOT NULL,
            scan_location JSONB,
            scan_device_info JSONB,
            status TEXT NOT NULL,
            points_awarded INTEGER,
            scan_result JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `;
      }

      // Convert string IDs to numbers if needed
      const codeId = typeof qrCodeId === 'string' ? parseInt(qrCodeId) : qrCodeId;
      const scannerId = typeof scannedBy === 'string' ? parseInt(scannedBy) : scannedBy;

      // Record the scan
      const scanLocation = details.location ? JSON.stringify(details.location) : null;
      const deviceInfo = details.deviceInfo ? JSON.stringify(details.deviceInfo) : JSON.stringify({
        ip: details.ipAddress || null,
        userAgent: details.userAgent || null
      });
      const status = isValid ? 'VALID' : 'INVALID';
      const pointsAwarded = details.pointsAwarded || 0;
      const scanResult = details.scanResult ? JSON.stringify(details.scanResult) : null;
      
      const result = await sql`
        INSERT INTO qr_code_scans (
          qrcode_id,
          scanned_by,
          scan_location,
          scan_device_info,
          status,
          points_awarded,
          scan_result,
          created_at
        ) VALUES (
          ${codeId}, ${scannerId}, ${scanLocation}, ${deviceInfo}, 
          ${status}, ${pointsAwarded}, ${scanResult}, NOW()
        )
        RETURNING *
      `;

      if (result.length === 0) {
        return null;
      }

      // If the scan is valid, update the QR code usage count and last used date
      if (isValid) {
        await sql`
          UPDATE customer_qrcodes
          SET uses_count = uses_count + 1, last_used_at = NOW(), updated_at = NOW()
          WHERE id = ${codeId}
        `;
      }

      return result[0] as unknown as QrCodeScan;
    } catch (error) {
      console.error('Error recording QR code scan:', error);
      return null;
    }
  }

  /**
   * Create or update a customer's primary QR code
   */
  static async ensureCustomerQrCode(
    customerId: number | string,
    qrData: any,
    qrImageUrl?: string
  ): Promise<CustomerQrCode | null> {
    try {
      // Convert string ID to number if needed
      const custId = typeof customerId === 'string' ? parseInt(customerId) : customerId;

      // Check if a QR code already exists for this customer
      const existingCode = await this.getCustomerPrimaryQrCode(custId, 'CUSTOMER_CARD');

      if (existingCode) {
        // Update the existing QR code with new data if needed
        const formattedQrData = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);
        const imageUrl = qrImageUrl || existingCode.qr_image_url;
        
        await sql`
          UPDATE customer_qrcodes
          SET qr_data = ${formattedQrData}, qr_image_url = ${imageUrl}, updated_at = NOW()
          WHERE id = ${existingCode.id}
        `;

        // Return the updated record
        return {
          ...existingCode,
          qr_data: qrData,
          qr_image_url: qrImageUrl || existingCode.qr_image_url,
          updated_at: new Date()
        };
      } else {
        // Create a new QR code as primary
        return await this.createQrCode({
          customerId: custId,
          qrType: 'CUSTOMER_CARD',
          data: typeof qrData === 'string' ? qrData : JSON.stringify(qrData),
          imageUrl: qrImageUrl,
          isPrimary: true,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }
    } catch (error) {
      console.error('Error ensuring customer QR code:', error);
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
      await sql.begin();
      
      try {
        // First check if the QR code exists and is active
        const qrCodeCheck = await sql`
          SELECT id, status FROM customer_qrcodes
          WHERE id = ${qrCodeIdNum}
        `;
        
        if (!qrCodeCheck.length) {
          console.error(`QR code not found: ${qrCodeIdNum}`);
          await sql.rollback();
          return false;
        }
        
        if (qrCodeCheck[0].status !== 'ACTIVE') {
          console.error(`Cannot revoke QR code that is not active. Current status: ${qrCodeCheck[0].status}`);
          await sql.rollback();
          return false;
        }
      
        // Update the QR code status
        const result = await sql.query(`
          UPDATE customer_qrcodes
          SET status = 'REVOKED',
              revoked_reason = $2,
              revoked_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `, [qrCodeIdNum, reason || 'Manually revoked']);
        
        if (result && result.length > 0) {
          // Log the revocation action
          await sql.query(`
            INSERT INTO customer_qrcode_events (
              qrcode_id,
              event_type,
              event_data,
              created_at
            ) VALUES (
              $1,
              'REVOKED',
              $2,
              NOW()
            )
          `, [qrCodeIdNum, JSON.stringify({ reason: reason || 'Manually revoked' })]);
          
          // Commit the transaction
          await sql.commit();
          return true;
        } else {
          await sql.rollback();
          console.error('Failed to revoke QR code');
          return false;
        }
      } catch (innerError) {
        await sql.rollback();
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
      await sql.begin();
      
      try {
        // Get the old QR code details
        const oldQrCode = await sql.query(`
          SELECT * FROM customer_qrcodes
          WHERE id = $1
        `, [oldQrCodeId]);
        
        if (!oldQrCode || oldQrCode.length === 0) {
          console.error('Old QR code not found');
          await sql.rollback();
          return null;
        }
        
        // Check if the QR code is in a replaceable state
        if (oldQrCode[0].status !== 'ACTIVE') {
          console.error(`Cannot replace QR code with status: ${oldQrCode[0].status}`);
          await sql.rollback();
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
        const newQrCodeResult = await sql.query(`
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
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
          )
          RETURNING *
        `, [
          newQrUniqueId,
          customerId,
          businessId,
          newQrCodeParams.data,
          newQrCodeParams.imageUrl || null,
          newQrCodeParams.qrType,
          'ACTIVE',
          verificationCode,
          oldQrCode[0].is_primary,
          newQrCodeParams.expiryDate || null,
          signature
        ]);

        if (!newQrCodeResult || newQrCodeResult.length === 0) {
          console.error('Failed to create new QR code');
          await sql.rollback();
          return null;
        }

        // Update the old QR code's status and set the replacement reference
        await sql.query(`
          UPDATE customer_qrcodes
          SET status = 'REPLACED',
              replaced_by = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [newQrCodeResult[0].id, oldQrCodeIdNum]);

        // Log the replacement event
        await sql.query(`
          INSERT INTO customer_qrcode_events (
            qrcode_id,
            event_type,
            event_data,
            created_at
          ) VALUES (
            $1,
            'REPLACED',
            $2,
            NOW()
          )
        `, [oldQrCodeIdNum, JSON.stringify({ new_qrcode_id: newQrCodeResult[0].id })]);

        // Commit the transaction
        await sql.commit();
        
        return newQrCodeResult[0] as CustomerQrCode;
      } catch (innerError) {
        await sql.rollback();
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
      await sql.begin();
      
      try {
        // First check if the QR code exists and has an expiry date
        const qrCode = await sql.query(`
          SELECT id, qr_unique_id, status, expiry_date 
          FROM customer_qrcodes
          WHERE id = $1
        `, [qrCodeIdNum]);
        
        if (!qrCode.length) {
          console.error(`QR code not found: ${qrCodeIdNum}`);
          await sql.rollback();
          return false;
        }
        
        // If it's already expired or doesn't have an expiry date, just return
        if (qrCode[0].status === 'EXPIRED') {
          console.log(`QR code ${qrCodeIdNum} is already marked as expired`);
          await sql.rollback();
          return true;
        }
        
        if (!qrCode[0].expiry_date) {
          console.log(`QR code ${qrCodeIdNum} has no expiry date`);
          await sql.rollback();
          return false;
        }
        
        // Check if expired
        const now = new Date();
        const expiryDate = new Date(qrCode[0].expiry_date);
        
        if (expiryDate > now) {
          console.log(`QR code ${qrCodeIdNum} is not expired yet. Expires: ${expiryDate.toISOString()}`);
          await sql.rollback();
          return false;
        }
        
        // Update the status to expired
        const result = await sql.query(`
          UPDATE customer_qrcodes
          SET status = 'EXPIRED',
              updated_at = NOW()
          WHERE id = $1
          RETURNING id
        `, [qrCodeIdNum]);
        
        if (result && result.length > 0) {
          // Log the expiration event
          await sql.query(`
            INSERT INTO customer_qrcode_events (
              qrcode_id,
              event_type,
              event_data,
              created_at
            ) VALUES (
              $1,
              'EXPIRED',
              $2,
              NOW()
            )
          `, [qrCodeIdNum, JSON.stringify({ expiry_date: expiryDate.toISOString() })]);
          
          // Commit the transaction
          await sql.commit();
          
          console.log(`QR code ${qrCodeIdNum} marked as expired`);
          return true;
        } else {
          await sql.rollback();
          console.error(`Failed to update status for QR code ${qrCodeIdNum}`);
          return false;
        }
      } catch (innerError) {
        await sql.rollback();
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
      const result = await sql.query(`
        UPDATE customer_qrcodes
        SET status = 'EXPIRED',
            updated_at = NOW()
        WHERE status = 'ACTIVE'
        AND expiry_date IS NOT NULL
        AND expiry_date < NOW()
        RETURNING id
      `);

      return result ? result.length : 0;
    } catch (error) {
      console.error('Error cleaning up expired QR codes:', error);
      return 0;
    }
  }
}