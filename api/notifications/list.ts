import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { NotificationService } from '../_services/notificationServerService';
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

    const { userId, unreadOnly, limit } = req.query;

    // If userId is provided, verify authorization
    const targetUserId = userId || authResult.user.id.toString();

    // Users can only see their own notifications unless they're admin
    if (authResult.user.user_type !== 'admin' && authResult.user.id.toString() !== targetUserId) {
      return res.status(403).json(formatErrorResponse('Access denied', 403));
    }

    const filters = {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit as string) : undefined
    };

    const notifications = await NotificationService.getUserNotifications(targetUserId, filters);

    return res.status(200).json(formatSuccessResponse({
      notifications,
      count: notifications.length
    }));
  } catch (error) {
    console.error('Error in notifications list endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

