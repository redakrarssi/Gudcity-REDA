import { VercelRequest, VercelResponse } from '@vercel/node';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { 
  withCors, 
  withErrorHandler, 
  withAuth,
  withRateLimit,
  sendSuccess, 
  sendError,
  sendCreated,
  sql,
  sanitizeInput,
  AuthenticatedRequest
} from '../_middleware/index';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  const { action } = req.query;
  
  switch (action) {
    case 'generate':
      return handleGenerateQR(req, res);
    case 'validate':
      return handleValidateQR(req, res);
    case 'scan':
      return handleScanQR(req, res);
    case 'revoke':
      return handleRevokeQR(req, res);
    case 'status':
      return handleQRStatus(req, res);
    default:
      return sendError(res, 'Invalid action', 404);
  }
}

async function handleGenerateQR(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { customerId, businessId, programId, cardId, type = 'LOYALTY_CARD' } = sanitizeInput(req.body);
    
    if (!customerId || !businessId) {
      return sendError(res, 'Customer ID and Business ID are required', 400);
    }
    
    // Verify business access
    const businesses = await sql`
      SELECT * FROM businesses 
      WHERE id = ${businessId} AND status = 'ACTIVE'
    `;
    
    if (businesses.length === 0) {
      return sendError(res, 'Business not found', 404);
    }
    
    // Generate unique QR ID and verification code
    const qrUniqueId = uuidv4();
    const verificationCode = Math.random().toString(36).substr(2, 8).toUpperCase();
    
    // Create QR data
    const qrData = {
      id: qrUniqueId,
      customerId,
      businessId,
      programId,
      cardId,
      type,
      verificationCode,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // Generate QR code image
    const qrString = JSON.stringify(qrData);
    const qrImageUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    } as any);
    
    // Store QR code in database
    const qrCodes = await sql`
      INSERT INTO customer_qrcodes (
        qr_unique_id, customer_id, business_id, qr_data, qr_image_url,
        qr_type, status, verification_code, is_primary, created_at, updated_at
      )
      VALUES (
        ${qrUniqueId}, ${customerId}, ${businessId}, ${JSON.stringify(qrData)}, 
        ${qrImageUrl}, ${type}, 'ACTIVE', ${verificationCode}, true, NOW(), NOW()
      )
      RETURNING *
    `;
    
    return sendCreated(res, {
      qrCode: qrCodes[0],
      qrImage: qrImageUrl,
      qrData: qrData
    }, 'QR code generated successfully');
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    return sendError(res, 'Failed to generate QR code', 500);
  }
}

async function handleValidateQR(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { qrData, verificationCode } = sanitizeInput(req.body);
    
    if (!qrData) {
      return sendError(res, 'QR data is required', 400);
    }
    
    let parsedData;
    try {
      parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (error) {
      return sendError(res, 'Invalid QR data format', 400);
    }
    
    // Look up QR code in database
    const qrCodes = await sql`
      SELECT 
        cqr.*,
        c.name as customer_name,
        c.email as customer_email,
        b.name as business_name
      FROM customer_qrcodes cqr
      LEFT JOIN customers c ON cqr.customer_id = c.id
      LEFT JOIN businesses b ON cqr.business_id = b.id
      WHERE cqr.qr_unique_id = ${parsedData.id}
    `;
    
    if (qrCodes.length === 0) {
      return sendError(res, 'QR code not found', 404);
    }
    
    const qrCode = qrCodes[0];
    
    // Check QR code status
    if (qrCode.status !== 'ACTIVE') {
      return sendError(res, 'QR code is not active', 400);
    }
    
    // Check expiry if set
    if (qrCode.expiry_date && new Date(qrCode.expiry_date) < new Date()) {
      return sendError(res, 'QR code has expired', 400);
    }
    
    // Verify verification code if provided
    if (verificationCode && qrCode.verification_code !== verificationCode) {
      return sendError(res, 'Invalid verification code', 400);
    }
    
    return sendSuccess(res, {
      valid: true,
      qrCode: qrCode,
      customer: {
        id: qrCode.customer_id,
        name: qrCode.customer_name,
        email: qrCode.customer_email
      },
      business: {
        id: qrCode.business_id,
        name: qrCode.business_name
      }
    });
    
  } catch (error) {
    console.error('Error validating QR code:', error);
    return sendError(res, 'Failed to validate QR code', 500);
  }
}

async function handleScanQR(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { qrUniqueId, scanLocation, scanDevice } = sanitizeInput(req.body);
    
    if (!qrUniqueId) {
      return sendError(res, 'QR unique ID is required', 400);
    }
    
    // Update scan count and last used timestamp
    const qrCodes = await sql`
      UPDATE customer_qrcodes 
      SET 
        uses_count = uses_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
      WHERE qr_unique_id = ${qrUniqueId} AND status = 'ACTIVE'
      RETURNING *
    `;
    
    if (qrCodes.length === 0) {
      return sendError(res, 'QR code not found or inactive', 404);
    }
    
    // Log scan event
    await sql`
      INSERT INTO qr_scan_logs (
        qr_unique_id, customer_id, business_id, scanned_by,
        scan_location, scan_device, ip_address, created_at
      )
      VALUES (
        ${qrUniqueId}, ${qrCodes[0].customer_id}, ${qrCodes[0].business_id}, 
        ${req.user?.userId}, ${scanLocation}, ${scanDevice},
        ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}, 
        NOW()
      )
    `;
    
    return sendSuccess(res, {
      qrCode: qrCodes[0],
      scanCount: qrCodes[0].uses_count
    }, 'QR code scanned successfully');
    
  } catch (error) {
    console.error('Error scanning QR code:', error);
    return sendError(res, 'Failed to scan QR code', 500);
  }
}

async function handleRevokeQR(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { qrUniqueId, reason } = sanitizeInput(req.body);
    
    if (!qrUniqueId || !reason) {
      return sendError(res, 'QR unique ID and reason are required', 400);
    }
    
    const qrCodes = await sql`
      UPDATE customer_qrcodes 
      SET 
        status = 'REVOKED',
        revoked_reason = ${reason},
        revoked_at = NOW(),
        updated_at = NOW()
      WHERE qr_unique_id = ${qrUniqueId}
      RETURNING *
    `;
    
    if (qrCodes.length === 0) {
      return sendError(res, 'QR code not found', 404);
    }
    
    return sendSuccess(res, qrCodes[0], 'QR code revoked successfully');
    
  } catch (error) {
    console.error('Error revoking QR code:', error);
    return sendError(res, 'Failed to revoke QR code', 500);
  }
}

async function handleQRStatus(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { qrUniqueId } = req.query;
    
    if (!qrUniqueId) {
      return sendError(res, 'QR unique ID is required', 400);
    }
    
    const qrCodes = await sql`
      SELECT 
        cqr.*,
        c.name as customer_name,
        b.name as business_name
      FROM customer_qrcodes cqr
      LEFT JOIN customers c ON cqr.customer_id = c.id
      LEFT JOIN businesses b ON cqr.business_id = b.id
      WHERE cqr.qr_unique_id = ${qrUniqueId}
    `;
    
    if (qrCodes.length === 0) {
      return sendError(res, 'QR code not found', 404);
    }
    
    // Get recent scan logs
    const scanLogs = await sql`
      SELECT * FROM qr_scan_logs 
      WHERE qr_unique_id = ${qrUniqueId}
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    return sendSuccess(res, {
      qrCode: qrCodes[0],
      recentScans: scanLogs
    });
    
  } catch (error) {
    console.error('Error getting QR status:', error);
    return sendError(res, 'Failed to get QR status', 500);
  }
}

export default withCors(
  withErrorHandler(
    withAuth(
      withRateLimit()(handler)
    )
  )
);
