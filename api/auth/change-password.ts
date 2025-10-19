/**
 * Vercel Serverless API: Change Password
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware } from '../_lib/auth';
import { changePassword } from '../_services/authServerService';
import { successResponse, ErrorResponses } from '../_services/responseFormatter';
import { validationMiddleware } from '../_middleware/validation';
import { sensitiveRateLimit } from '../_middleware/rateLimit';
import { cors } from '../_lib/auth';

// Validation schema for password change
const passwordChangeSchema = {
  oldPassword: {
    type: 'string' as const,
    required: true,
    min: 1,
    max: 128,
  },
  newPassword: {
    type: 'string' as const,
    required: true,
    min: 8,
    max: 128,
  },
};

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[ChangePassword API] Request received:', { method: req.method, url: req.url });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json(ErrorResponses.methodNotAllowed(['POST']));
  }

  // Rate limiting (sensitive operation)
  if (!sensitiveRateLimit.check(req, res)) {
    return;
  }

  // Authentication required
  const isAuth = await authMiddleware(req, res);
  if (!isAuth) {
    return;
  }

  // Input validation
  if (!validationMiddleware(passwordChangeSchema)(req, res)) {
    return;
  }

  try {
    const userId = req.user!.id;
    const { oldPassword, newPassword } = req.body;

    // Change password via server service
    await changePassword(userId, oldPassword, newPassword);

    console.log('[ChangePassword API] Password changed successfully:', { userId });

    return res.status(200).json(
      successResponse({
        message: 'Password changed successfully. Please login again with your new password.',
      })
    );

  } catch (error) {
    console.error('[ChangePassword API] Password change error:', error);
    
    const errorMessage = (error as Error).message;
    
    // Handle specific error cases
    if (errorMessage.includes('incorrect')) {
      return res.status(400).json(
        ErrorResponses.badRequest('Current password is incorrect')
      );
    }
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Password change failed',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      )
    );
  }
}

