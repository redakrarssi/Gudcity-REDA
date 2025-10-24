/**
 * Vercel Serverless API: User Operations by ID
 * GET /api/users/[id] - Get user by ID
 * PUT /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user (soft delete)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, canAccessResource } from '../_lib/auth.js';
import { getUserById, updateUser, deleteUser } from '../_services/userServerService.js';
import { successResponse, ErrorResponses } from '../_services/responseFormatter.js';
import { standardRateLimit } from '../_middleware/rateLimit.js';
import { validationMiddleware } from '../_middleware/validation.js';
import { cors } from '../_lib/auth.js';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[User API] Request received:', { method: req.method, url: req.url });
  
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

  const userId = req.query.id as string;

  try {
    if (req.method === 'GET') {
      // Authorization: users can only access their own data unless admin
      if (!canAccessResource(req, userId)) {
        return res.status(403).json(ErrorResponses.forbidden());
      }

      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json(ErrorResponses.notFound('User', userId));
      }

      return res.status(200).json(successResponse(user));
    }

    if (req.method === 'PUT') {
      // Authorization check
      if (!canAccessResource(req, userId)) {
        return res.status(403).json(ErrorResponses.forbidden());
      }

      // Validation schema for updates
      const updateSchema = {
        name: { type: 'string' as const, required: false, min: 2, max: 100, sanitize: true },
        phone: { type: 'string' as const, required: false, max: 20, sanitize: true },
        address: { type: 'string' as const, required: false, max: 255, sanitize: true },
        business_name: { type: 'string' as const, required: false, max: 200, sanitize: true },
        business_phone: { type: 'string' as const, required: false, max: 20, sanitize: true },
        avatar_url: { type: 'url' as const, required: false },
        tier: { type: 'string' as const, required: false, enum: ['STANDARD', 'SILVER', 'GOLD', 'PLATINUM'] },
      };

      if (!validationMiddleware(updateSchema)(req, res)) {
        return;
      }

      const updatedUser = await updateUser(userId, req.body);
      
      return res.status(200).json(successResponse(updatedUser));
    }

    if (req.method === 'DELETE') {
      // Only admins can delete users
      if (req.user!.role !== 'admin') {
        return res.status(403).json(ErrorResponses.forbidden('Only administrators can delete users'));
      }

      await deleteUser(userId);
      
      return res.status(200).json(successResponse({ message: 'User deleted successfully' }));
    }

    return res.status(405).json(ErrorResponses.methodNotAllowed(['GET', 'PUT', 'DELETE']));

  } catch (error) {
    console.error('═══════════════════════════════════════════════════');
    console.error('[User API] CRITICAL ERROR DETAILS:');
    console.error('═══════════════════════════════════════════════════');
    console.error('[User API] Error:', error);
    console.error('[User API] Error name:', (error as Error).name);
    console.error('[User API] Error message:', (error as Error).message);
    console.error('[User API] Error stack:', (error as Error).stack);
    console.error('[User API] Request details:', { 
      method: req.method, 
      userId, 
      userIdType: typeof userId,
      userIdValue: userId,
      authenticatedUserId: req.user?.id,
      authenticatedUserRole: req.user?.role,
      query: req.query,
      headers: {
        origin: req.headers.origin,
        authorization: req.headers.authorization ? 'present' : 'missing'
      }
    });
    console.error('[User API] Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasDATABASE_URL: !!process.env.DATABASE_URL,
      hasPOSTGRES_URL: !!process.env.POSTGRES_URL,
      hasVITE_DATABASE_URL: !!process.env.VITE_DATABASE_URL
    });
    console.error('═══════════════════════════════════════════════════');
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'User operation failed',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}
