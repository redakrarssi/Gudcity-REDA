import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { TransactionServerService } from '../_services/transactionServerService';
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

    // Only business users can award points
    if (authResult.user.user_type !== 'business') {
      return res.status(403).json(formatErrorResponse('Only businesses can award points', 403));
    }

    const { customerId, programId, points, description } = req.body;

    // Validate required fields
    if (!customerId || !programId || !points) {
      return res.status(400).json(formatErrorResponse('Missing required fields: customerId, programId, points', 400));
    }

    // Validate points
    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json(formatErrorResponse('Points must be a positive number', 400));
    }

    if (points > 10000) {
      return res.status(400).json(formatErrorResponse('Cannot award more than 10,000 points at once', 400));
    }

    // Award points using the business's ID
    const businessId = authResult.user.id.toString();
    const result = await TransactionServerService.awardPoints(
      customerId,
      businessId,
      programId,
      points,
      'MANUAL',
      description
    );

    if (!result.success) {
      return res.status(400).json(formatErrorResponse(result.error || 'Failed to award points', 400));
    }

    return res.status(200).json(formatSuccessResponse(result.transaction, 'Points awarded successfully'));
  } catch (error) {
    console.error('Error in award-points endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

