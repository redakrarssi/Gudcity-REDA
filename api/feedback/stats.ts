import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { FeedbackServerService } from '../_services/feedbackServerService';
import { formatSuccessResponse, formatErrorResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate request - only admin can see stats
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    if (authResult.user.user_type !== 'admin') {
      return res.status(403).json(formatErrorResponse('Admin access required', 403));
    }

    const stats = await FeedbackServerService.getFeedbackStats();

    return res.status(200).json(formatSuccessResponse(stats));
  } catch (error) {
    console.error('Error in feedback stats endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

