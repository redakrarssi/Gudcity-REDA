import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { QrCodeServerService } from '../_services/qrCodeServerService';
import { formatSuccessResponse, formatErrorResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    const { qrCodeId } = req.query;

    // Validate required fields
    if (!qrCodeId) {
      return res.status(400).json(formatErrorResponse('QR code ID is required', 400));
    }

    const result = await QrCodeServerService.getQrCodeIntegrity(qrCodeId as string);

    return res.status(200).json(formatSuccessResponse(result));
  } catch (error) {
    console.error('Error in QR integrity check endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

