/**
 * Vercel Serverless API: User Logout
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware } from '../_lib/auth';
import { logoutUser } from '../_services/authServerService';
import { successResponse, ErrorResponses } from '../_services/responseFormatter';
import { standardRateLimit } from '../_middleware/rateLimit';
import { cors } from '../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[Logout API] Request received:', { method: req.method, url: req.url });
  
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
    const token = req.headers.authorization?.split(' ')[1] || '';

    // Logout user and revoke token via server service
    await logoutUser(userId, token);

    console.log('[Logout API] Logout successful:', { userId });

    return res.status(200).json(
      successResponse({
        message: 'Logged out successfully',
      })
    );

  } catch (error) {
    console.error('[Logout API] Logout error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Logout failed',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}

