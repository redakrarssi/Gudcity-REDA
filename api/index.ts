import { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors, withErrorHandler, sendSuccess } from './_middleware/index';

// Root API handler - provides basic API information
async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests for API root
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: 'Only GET requests are allowed for API root',
      code: 'METHOD_NOT_ALLOWED'
    });
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
      documentation: 'https://your-domain.com/docs',
      timestamp: new Date().toISOString()
    }, 'API is operational');

  } catch (error) {
    console.error('API root error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to load API information',
      code: 'INTERNAL_ERROR'
    });
  }
}

// Apply middleware following fun.md patterns
export default withCors(
  withErrorHandler(handler)
);

// Configure function for optimal performance
export const config = {
  maxDuration: 10,
  memory: 512,
};
