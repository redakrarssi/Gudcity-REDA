/**
 * Vercel Serverless API: Get Business Customers
 * GET /api/customers/business/[businessId] - Get all customers for a business
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware } from '../../_lib/auth';
import { getBusinessCustomers } from '../../_services/customerServerService';
import { successResponse, ErrorResponses } from '../../_services/responseFormatter';
import { standardRateLimit } from '../../_middleware/rateLimit';
import { cors } from '../../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[BusinessCustomers API] Request received:', { method: req.method, url: req.url });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json(ErrorResponses.methodNotAllowed(['GET']));
  }

  // Rate limiting
  if (!standardRateLimit.check(req, res)) {
    return;
  }

  // Authentication required
  const isAuth = await authMiddleware(req, res);
  if (!isAuth) {
    return;
  }

  const businessId = req.query.businessId as string;

  // Authorization: business can see their own customers, admins can see any
  const isOwnBusiness = req.user!.id === Number(businessId) || req.user!.businessId === Number(businessId);
  const isAdmin = req.user!.role === 'admin';

  if (!isOwnBusiness && !isAdmin) {
    return res.status(403).json(ErrorResponses.forbidden('You can only access your own business customers'));
  }

  try {
    const customers = await getBusinessCustomers(businessId);

    return res.status(200).json(
      successResponse({
        customers,
        count: customers.length,
      })
    );

  } catch (error) {
    console.error('[BusinessCustomers API] Error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Failed to get business customers',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}

