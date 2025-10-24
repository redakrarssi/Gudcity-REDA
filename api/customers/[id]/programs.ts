/**
 * Vercel Serverless API: Customer Programs
 * GET /api/customers/[id]/programs - Get all programs a customer is enrolled in
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, canAccessResource, cors } from '../../_lib/auth.js';
import { getCustomerEnrolledPrograms } from '../../_services/customerServerService.js';
import { successResponse, ErrorResponses } from '../../_services/responseFormatter.js';
import { standardRateLimit } from '../../_middleware/rateLimit.js';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[Customer Programs API] Request received:', { method: req.method, url: req.url });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

  const customerId = req.query.id as string;

  try {
    if (req.method === 'GET') {
      // Authorization: users can only access their own programs unless admin/business
      if (!canAccessResource(req, customerId)) {
        return res.status(403).json(ErrorResponses.forbidden());
      }

      const programs = await getCustomerEnrolledPrograms(customerId);
      
      return res.status(200).json(successResponse({ 
        programs,
        count: programs.length,
        customerId
      }));
    }

    return res.status(405).json(ErrorResponses.methodNotAllowed(['GET']));

  } catch (error) {
    console.error('[Customer Programs API] Error:', error);
    console.error('[Customer Programs API] Error stack:', (error as Error).stack);
    console.error('[Customer Programs API] Request details:', { 
      method: req.method, 
      customerId, 
      user: req.user?.id
    });
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Failed to retrieve customer programs',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}
