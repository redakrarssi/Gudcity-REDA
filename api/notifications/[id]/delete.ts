import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';
import { NotificationService } from '../../_services/notificationServerService';
import { formatSuccessResponse, formatErrorResponse } from '../../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
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

    const result = await NotificationService.deleteNotification(id as string);

    if (!result.success) {
      return res.status(400).json(formatErrorResponse(result.error || 'Failed to delete notification', 400));
    }

    return res.status(200).json(formatSuccessResponse(null, 'Notification deleted'));
  } catch (error) {
    console.error('Error in delete notification endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

