/**
 * Vercel Serverless API: Customer Programs
 * GET /api/customers/[customerId]/programs - Get customer's enrolled programs
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, canAccessResource } from '../../_lib/auth';
import { getCustomerPrograms } from '../../_services/customerServerService';
import { successResponse, ErrorResponses } from '../../_services/responseFormatter';
import { standardRateLimit } from '../../_middleware/rateLimit';
import { cors } from '../../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[CustomerPrograms API] Request received:', { method: req.method, url: req.url });
  
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

  const customerId = req.query.customerId as string;

  // Authorization: customers can see their own programs, businesses/admins can see any
  const isOwnData = req.user!.id === Number(customerId);
  const isAdmin = req.user!.role === 'admin';
  const isBusiness = req.user!.role === 'business';

  if (!isOwnData && !isAdmin && !isBusiness) {
    return res.status(403).json(ErrorResponses.forbidden());
  }

  try {
    const programs = await getCustomerPrograms(customerId);

    return res.status(200).json(
      successResponse({
        programs,
        count: programs.length,
      })
    );

  } catch (error) {
    console.error('[CustomerPrograms API] Error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Failed to get customer programs',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}

