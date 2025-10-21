import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';
import { AnalyticsServerService } from '../../_services/analyticsServerService';
import { formatSuccessResponse, formatErrorResponse } from '../../_services/responseFormatter';

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

    const { businessId } = req.query;
    const { startDate, endDate } = req.query;

    if (!businessId) {
      return res.status(400).json(formatErrorResponse('Business ID is required', 400));
    }

    // Authorization check - only the business owner or admin can view analytics
    if (
      authResult.user.user_type !== 'admin' &&
      authResult.user.id.toString() !== businessId
    ) {
      return res.status(403).json(formatErrorResponse('Access denied', 403));
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const analytics = await AnalyticsServerService.getBusinessAnalytics(
      businessId as string,
      start,
      end
    );

    return res.status(200).json(formatSuccessResponse(analytics));
  } catch (error) {
    console.error('Error in business analytics endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

