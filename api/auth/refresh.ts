/**
 * Vercel Serverless API: Token Refresh
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware } from '../_lib/auth';
import { refreshAuthToken } from '../_services/authServerService';
import { successResponse, ErrorResponses } from '../_services/responseFormatter';
import { standardRateLimit } from '../_middleware/rateLimit';
import { cors } from '../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[Refresh API] Request received:', { method: req.method, url: req.url });
  
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

  try {
    const userId = req.user!.id;

    // Refresh token via server service
    const newToken = await refreshAuthToken(userId);

    console.log('[Refresh API] Token refreshed successfully:', { userId });

    return res.status(200).json(
      successResponse({
        token: newToken,
      })
    );

  } catch (error) {
    console.error('[Refresh API] Token refresh error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Token refresh failed',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}

