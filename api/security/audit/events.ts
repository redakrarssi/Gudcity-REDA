import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';
import { SecurityAuditServerService } from '../../_services/securityAuditServerService';
import { formatSuccessResponse, formatErrorResponse } from '../../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate request - only admin can view audit logs
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    if (authResult.user.user_type !== 'admin') {
      return res.status(403).json(formatErrorResponse('Admin access required', 403));
    }

    const { userId, actionType, startDate, endDate, limit } = req.query;

    const filters = {
      userId: userId as string,
      actionType: actionType as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    };

    const events = await SecurityAuditServerService.getSecurityEvents(filters);

    return res.status(200).json(formatSuccessResponse({ events, count: events.length }));
  } catch (error) {
    console.error('Error in security audit events endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

