/**
 * Vercel Serverless API: Promotions
 * GET /api/promotions - Get active promotions
 * POST /api/promotions - Create promotion (business/admin)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, cors } from './_lib/auth.js';
import { getActivePromotions, createPromotion } from './_services/promoServerService.js';
import { successResponse, ErrorResponses } from './_services/responseFormatter.js';
import { standardRateLimit } from './_middleware/rateLimit.js';
import { validationMiddleware } from './_middleware/validation.js';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[Promotions API] Request received:', { method: req.method, url: req.url });
  
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

  try {
    if (req.method === 'GET') {
      const { businessId } = req.query;
      
      const promotions = await getActivePromotions(businessId as string);
      
      return res.status(200).json(successResponse({ 
        promotions,
        count: promotions.length
      }));
    }

    if (req.method === 'POST') {
      // Only businesses and admins can create promotions
      if (req.user!.role !== 'business' && req.user!.role !== 'admin') {
        return res.status(403).json(ErrorResponses.forbidden('Only businesses can create promotions'));
      }

      const createSchema = {
        businessId: { type: 'string' as const, required: true },
        title: { type: 'string' as const, required: true, min: 1, max: 255 },
        description: { type: 'string' as const, required: true, min: 1, max: 1000 },
        discountType: { type: 'string' as const, required: true, enum: ['percentage', 'fixed'] },
        discountValue: { type: 'number' as const, required: true, min: 0 },
        startDate: { type: 'string' as const, required: true },
        endDate: { type: 'string' as const, required: true }
      };

      if (!validationMiddleware(createSchema)(req, res)) {
        return;
      }

      const promotion = await createPromotion(req.body);
      
      return res.status(201).json(successResponse(promotion));
    }

    return res.status(405).json(ErrorResponses.methodNotAllowed(['GET', 'POST']));

  } catch (error) {
    console.error('[Promotions API] Error:', error);
    console.error('[Promotions API] Error stack:', (error as Error).stack);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Promotion operation failed',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}
