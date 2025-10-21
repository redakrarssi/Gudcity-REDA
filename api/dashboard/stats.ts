import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { DashboardServerService } from '../_services/dashboardServerService';
import { formatSuccessResponse, formatErrorResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    const { userType } = req.query;
    const actualUserType = userType || authResult.user.user_type;

    let stats;

    switch (actualUserType) {
      case 'admin':
        if (authResult.user.user_type !== 'admin') {
          return res.status(403).json(formatErrorResponse('Admin access required', 403));
        }
        stats = await DashboardServerService.getAdminDashboardStats();
        break;

      case 'customer':
        // Customers can only see their own stats
        if (authResult.user.user_type !== 'customer' && authResult.user.user_type !== 'admin') {
          return res.status(403).json(formatErrorResponse('Access denied', 403));
        }
        stats = await DashboardServerService.getCustomerDashboardStats(authResult.user.id.toString());
        break;

      case 'business':
        // Businesses can only see their own stats
        if (authResult.user.user_type !== 'business' && authResult.user.user_type !== 'admin') {
          return res.status(403).json(formatErrorResponse('Access denied', 403));
        }
        const businessId = authResult.user.user_type === 'business' ? authResult.user.id.toString() : req.query.businessId;
        if (!businessId) {
          return res.status(400).json(formatErrorResponse('Business ID required', 400));
        }
        stats = await DashboardServerService.getBusinessDashboardStats(businessId as string);
        break;

      default:
        return res.status(400).json(formatErrorResponse('Invalid user type', 400));
    }

    return res.status(200).json(formatSuccessResponse(stats));
  } catch (error) {
    console.error('Error in dashboard stats endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}

