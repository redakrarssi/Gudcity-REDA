/**
 * Vercel Serverless API: List Users by Type
 * GET /api/users/list?type=customer&status=active&limit=100&offset=0
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, requireRole } from '../_lib/auth';
import { getUsersByType, getUserCountByType } from '../_services/userServerService';
import { successResponse, ErrorResponses } from '../_services/responseFormatter';
import { standardRateLimit } from '../_middleware/rateLimit';
import { cors } from '../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[UserList API] Request received:', { method: req.method, url: req.url });
  
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

  // Only admins can list users
  const hasAccess = requireRole(['admin'])(req, res);
  if (!hasAccess) {
    return;
  }

  try {
    const userType = req.query.type as string;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    if (!userType) {
      return res.status(400).json(
        ErrorResponses.badRequest('User type is required')
      );
    }

    if (!['customer', 'business', 'staff', 'admin'].includes(userType)) {
      return res.status(400).json(
        ErrorResponses.badRequest('Invalid user type')
      );
    }

    const users = await getUsersByType(userType, {
      status,
      limit,
      offset,
    });

    const totalCount = await getUserCountByType(userType);

    return res.status(200).json(
      successResponse({
        users,
        count: users.length,
        total: totalCount,
        limit,
        offset,
      })
    );

  } catch (error) {
    console.error('[UserList API] Error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Failed to list users',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}

