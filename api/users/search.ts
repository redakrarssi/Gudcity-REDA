/**
 * Vercel Serverless API: Search Users
 * POST /api/users/search
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, requireRole } from '../_lib/auth';
import { searchUsers } from '../_services/userServerService';
import { successResponse, ErrorResponses } from '../_services/responseFormatter';
import { standardRateLimit } from '../_middleware/rateLimit';
import { validationMiddleware } from '../_middleware/validation';
import { cors } from '../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[UserSearch API] Request received:', { method: req.method, url: req.url });
  
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

  // Only admins and businesses can search users
  const hasAccess = requireRole(['admin', 'business', 'owner'])(req, res);
  if (!hasAccess) {
    return;
  }

  // Input validation
  const schema = {
    query: {
      type: 'string' as const,
      required: true,
      min: 1,
      max: 100,
      sanitize: true,
    },
    userType: {
      type: 'string' as const,
      required: false,
      enum: ['customer', 'business', 'staff', 'admin'],
    },
    status: {
      type: 'string' as const,
      required: false,
      enum: ['active', 'inactive', 'suspended', 'banned'],
    },
    limit: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 100,
    },
    offset: {
      type: 'number' as const,
      required: false,
      min: 0,
    },
  };

  if (!validationMiddleware(schema)(req, res)) {
    return;
  }

  try {
    const { query, userType, status, limit, offset } = req.body;

    const users = await searchUsers(query, {
      userType,
      status,
      limit,
      offset,
    });

    return res.status(200).json(
      successResponse({
        users,
        count: users.length,
        limit: limit || 50,
        offset: offset || 0,
      })
    );

  } catch (error) {
    console.error('[UserSearch API] Error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Search failed',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}

