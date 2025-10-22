/**
 * Vercel Serverless API: Get User by Email
 * POST /api/users/by-email
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware } from '../_lib/auth.js';
import { getUserByEmail } from '../_services/userServerService.js';
import { successResponse, ErrorResponses } from '../_services/responseFormatter.js';
import { standardRateLimit } from '../_middleware/rateLimit.js';
import { validationMiddleware } from '../_middleware/validation.js';
import { cors } from '../_lib/auth.js';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[UserByEmail API] Request received:', { method: req.method, url: req.url });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json(ErrorResponses.methodNotAllowed(['POST']));
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

  // Input validation
  const schema = {
    email: {
      type: 'email' as const,
      required: true,
      max: 255,
      sanitize: true,
    },
  };

  if (!validationMiddleware(schema)(req, res)) {
    return;
  }

  try {
    const { email } = req.body;

    const user = await getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json(ErrorResponses.notFound('User'));
    }

    // Only allow users to see their own data or admins to see any
    if (req.user!.email !== email && req.user!.role !== 'admin') {
      return res.status(403).json(ErrorResponses.forbidden());
    }

    return res.status(200).json(successResponse(user));

  } catch (error) {
    console.error('[UserByEmail API] Error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Failed to get user',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}
