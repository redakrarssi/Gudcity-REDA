import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HealthServerService } from '../_services/healthServerService';
import { formatSuccessResponse, formatErrorResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    const health = await HealthServerService.checkHealth();

    // Set appropriate status code based on health status
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    if (req.method === 'HEAD') {
      return res.status(statusCode).end();
    }

    return res.status(statusCode).json(formatSuccessResponse(health));
  } catch (error) {
    console.error('Error in health check endpoint:', error);
    return res.status(503).json(formatErrorResponse('Service unavailable', 503));
  }
}

