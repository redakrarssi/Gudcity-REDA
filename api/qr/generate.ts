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

    const { customerId } = req.body;

    // If customerId is provided, verify authorization
    if (customerId) {
      // Customers can only generate their own QR codes
      if (authResult.user.user_type === 'customer' && authResult.user.id.toString() !== customerId) {
        return res.status(403).json(formatErrorResponse('Access denied', 403));
      }
    } else {
      // If no customerId provided, use the authenticated user's ID
      // Only customers can generate QR codes without specifying an ID
      if (authResult.user.user_type !== 'customer') {
        return res.status(400).json(formatErrorResponse('Customer ID is required', 400));
      }
    }

    const targetCustomerId = customerId || authResult.user.id.toString();

    const result = await QrCodeServerService.generateCustomerQrCode(targetCustomerId);

    if (!result.success) {
      return res.status(400).json(formatErrorResponse(result.error || 'Failed to generate QR code', 400));
    }

    return res.status(200).json(formatSuccessResponse(result.qrData, 'QR code generated successfully'));
  } catch (error) {
    console.error('Error in generate QR code endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

