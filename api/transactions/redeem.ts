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

    const { customerId, programId, rewardId, pointsRequired } = req.body;

    // Validate required fields
    if (!customerId || !programId || !rewardId || !pointsRequired) {
      return res.status(400).json(
        formatErrorResponse('Missing required fields: customerId, programId, rewardId, pointsRequired', 400)
      );
    }

    // Authorization check - only the customer themselves or admin can redeem
    if (authResult.user.user_type === 'customer' && authResult.user.id.toString() !== customerId) {
      return res.status(403).json(formatErrorResponse('Access denied', 403));
    }

    // Validate points
    if (typeof pointsRequired !== 'number' || pointsRequired <= 0) {
      return res.status(400).json(formatErrorResponse('Points required must be a positive number', 400));
    }

    const result = await TransactionServerService.redeemReward(
      customerId,
      programId,
      rewardId,
      pointsRequired
    );

    if (!result.success) {
      return res.status(400).json(formatErrorResponse(result.error || 'Failed to redeem reward', 400));
    }

    return res.status(200).json(formatSuccessResponse(result.redemption, 'Reward redeemed successfully'));
  } catch (error) {
    console.error('Error in redeem endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

