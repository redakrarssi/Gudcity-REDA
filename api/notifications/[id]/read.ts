import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';
import { NotificationService } from '../../_services/notificationServerService';
import { formatSuccessResponse, formatErrorResponse } from '../../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow PUT or PATCH requests
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json(formatErrorResponse('Notification ID is required', 400));
    }

    // TODO: Add authorization check to ensure user owns this notification

    const result = await NotificationService.markAsRead(id as string);

    if (!result.success) {
      return res.status(400).json(formatErrorResponse(result.error || 'Failed to mark as read', 400));
    }

    return res.status(200).json(formatSuccessResponse(null, 'Notification marked as read'));
  } catch (error) {
    console.error('Error in mark notification as read endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

