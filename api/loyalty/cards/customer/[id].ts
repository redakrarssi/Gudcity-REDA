/**
 * Vercel Serverless API: Customer Loyalty Cards
 * GET /api/loyalty/cards/customer/[id] - Get all loyalty cards for a customer
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, canAccessResource, cors } from '../../../_lib/auth.js';
import { getCustomerLoyaltyCards } from '../../../_services/loyaltyCardServerService.js';
import { successResponse, ErrorResponses } from '../../../_services/responseFormatter.js';
import { standardRateLimit } from '../../../_middleware/rateLimit.js';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[Customer Cards API] Request received:', { method: req.method, url: req.url });
  
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
      // Authorization: users can only access their own cards unless admin
      if (!canAccessResource(req, customerId)) {
        return res.status(403).json(ErrorResponses.forbidden());
      }

      const cards = await getCustomerLoyaltyCards(customerId);
      
      return res.status(200).json(successResponse({ 
        cards,
        count: cards.length,
        customerId
      }));
    }

    return res.status(405).json(ErrorResponses.methodNotAllowed(['GET']));

  } catch (error) {
    console.error('[Customer Cards API] Error:', error);
    console.error('[Customer Cards API] Error stack:', (error as Error).stack);
    console.error('[Customer Cards API] Request details:', { 
      method: req.method, 
      customerId, 
      user: req.user?.id
    });
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Failed to retrieve customer cards',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}
