import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  withCors, 
  withErrorHandler, 
  sendSuccess, 
  sendError 
} from './_middleware/index';

// Root API handler - provides basic API information
async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for API root
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed. Use GET.', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    // Return API information and available endpoints
    return sendSuccess(res, {
      name: 'GudCity Loyalty Platform API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        auth: '/api/auth/{action}',
        businesses: '/api/businesses',
        customers: '/api/customers',
        points: '/api/points/{action}',
        qr: '/api/qr/{action}',
        notifications: '/api/notifications',
        health: '/api/health'
      },
      timestamp: new Date().toISOString()
    }, 'API is operational');

  } catch (error) {
    console.error('API root error:', error);
    return sendError(res, 'Failed to load API information', 500, 'INTERNAL_ERROR');
  }
}

// Apply middleware following fun.md patterns
export default withCors(
  withErrorHandler(handler)
);
