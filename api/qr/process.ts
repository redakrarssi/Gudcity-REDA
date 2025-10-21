import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { QrCodeServerService } from '../_services/qrCodeServerService';
import { formatSuccessResponse, formatErrorResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    // Only business users can process QR codes
    if (authResult.user.user_type !== 'business') {
      return res.status(403).json(formatErrorResponse('Only businesses can scan QR codes', 403));
    }

    const { qrData, pointsToAward } = req.body;

    // Validate required fields
    if (!qrData) {
      return res.status(400).json(formatErrorResponse('QR data is required', 400));
    }

    // Validate QR data structure
    if (!qrData.type) {
      return res.status(400).json(formatErrorResponse('Invalid QR code: missing type', 400));
    }

    const businessId = authResult.user.id.toString();
    const points = pointsToAward || 10;

    // Validate points
    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json(formatErrorResponse('Points must be a positive number', 400));
    }

    if (points > 10000) {
      return res.status(400).json(formatErrorResponse('Cannot award more than 10,000 points at once', 400));
    }

    let result;

    // Process based on QR code type
    if (qrData.type === 'customer') {
      result = await QrCodeServerService.processCustomerQrCode(qrData, businessId, points);
    } else if (qrData.type === 'loyaltyCard') {
      result = await QrCodeServerService.processLoyaltyCardQrCode(qrData, businessId, points);
    } else {
      return res.status(400).json(formatErrorResponse(`Unsupported QR code type: ${qrData.type}`, 400));
    }

    if (!result.success) {
      return res.status(400).json(formatErrorResponse(result.error || result.message, 400));
    }

    return res.status(200).json(formatSuccessResponse(result));
  } catch (error) {
    console.error('Error in process QR code endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

