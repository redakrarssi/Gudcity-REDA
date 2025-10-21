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

    const { qrData } = req.body;

    // Validate required fields
    if (!qrData) {
      return res.status(400).json(formatErrorResponse('QR data is required', 400));
    }

    const result = await QrCodeServerService.validateQrCode(qrData);

    return res.status(200).json(formatSuccessResponse(result));
  } catch (error) {
    console.error('Error in validate QR code endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

