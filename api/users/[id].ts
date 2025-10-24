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
  console.log('[User API] Request received:', { method: req.method, url: req.url, query: req.query });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate userId parameter first
  const userId = req.query.id as string;
  if (!userId || isNaN(Number(userId))) {
    console.error('[User API] Invalid userId parameter:', userId);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Valid user ID is required',
      code: 'INVALID_USER_ID'
    });
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
      console.log('[User API] GET request for userId:', userId, 'by user:', req.user?.id);
      
      // Authorization: users can only access their own data unless admin
      if (!canAccessResource(req, userId)) {
        console.warn('[User API] Access denied for user:', req.user?.id, 'requesting:', userId);
        return res.status(403).json(ErrorResponses.forbidden());
      }

      console.log('[User API] Fetching user from database...');
      const user = await getUserById(userId);
      
      if (!user) {
        console.log('[User API] User not found in database:', userId);
        return res.status(404).json({
          error: 'Not Found',
          message: `User with ID ${userId} not found`,
          code: 'USER_NOT_FOUND'
        });
      }

      console.log('[User API] User found successfully:', { id: user.id, email: user.email });
      return res.status(200).json({
        success: true,
        data: user
      });
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
    console.error('[User API] CRITICAL ERROR:', error);
    console.error('[User API] Error stack:', (error as Error).stack);
    console.error('[User API] Request details:', { 
      method: req.method, 
      userId, 
      user: req.user?.id,
      query: req.query,
      headers: {
        authorization: req.headers.authorization ? 'Bearer ***' : 'None',
        origin: req.headers.origin
      }
    });

    // Determine if this is a database connection error
    const errorMessage = (error as Error).message;
    let errorResponse;
    
    if (errorMessage.includes('Database not configured') || errorMessage.includes('DATABASE_URL')) {
      errorResponse = {
        error: 'Service Unavailable',
        message: 'Database connection is not available',
        code: 'DATABASE_CONNECTION_ERROR',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      };
    } else if (errorMessage.includes('User not found')) {
      // Handle as 404 instead of 500
      return res.status(404).json({
        error: 'Not Found',
        message: `User with ID ${userId} not found`,
        code: 'USER_NOT_FOUND'
      });
    } else {
      errorResponse = {
        error: 'Internal Server Error',
        message: 'User operation failed',
        code: 'USER_OPERATION_FAILED',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      };
    }
    
    return res.status(500).json(errorResponse);
  }
}
