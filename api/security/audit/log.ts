import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../../_lib/auth';
import { SecurityAuditServerService } from '../../_services/securityAuditServerService';
import { formatSuccessResponse, formatErrorResponse } from '../../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    const { eventType, resourceId, details } = req.body;

    if (!eventType || !resourceId) {
      return res.status(400).json(formatErrorResponse('Event type and resource ID required', 400));
    }

    // Get IP and user agent from request
    const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const result = await SecurityAuditServerService.logSecurityEvent(
      eventType,
      resourceId,
      authResult.user.id.toString(),
      details,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return res.status(500).json(formatErrorResponse(result.error || 'Failed to log event', 500));
    }

    return res.status(200).json(formatSuccessResponse({ message: 'Event logged successfully' }));
  } catch (error) {
    console.error('Error in security audit log endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

