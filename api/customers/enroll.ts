/**
 * Vercel Serverless API: Customer Program Enrollment
 * POST /api/customers/enroll - Enroll customer in a program
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware } from '../_lib/auth';
import { enrollCustomerInProgram } from '../_services/customerServerService';
import { successResponse, ErrorResponses } from '../_services/responseFormatter';
import { sensitiveRateLimit } from '../_middleware/rateLimit';
import { validationMiddleware } from '../_middleware/validation';
import { cors } from '../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[CustomerEnroll API] Request received:', { method: req.method, url: req.url });
  
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
  const schema = {
    customerId: {
      type: 'string' as const,
      required: true,
      min: 1,
    },
    programId: {
      type: 'string' as const,
      required: true,
      min: 1,
    },
  };

  if (!validationMiddleware(schema)(req, res)) {
    return;
  }

  try {
    const { customerId, programId } = req.body;

    // Authorization: customer can enroll themselves, businesses can enroll their customers, admins can enroll any
    const isOwnEnrollment = req.user!.id === Number(customerId);
    const isAdmin = req.user!.role === 'admin';
    const isBusiness = req.user!.role === 'business';

    if (!isOwnEnrollment && !isAdmin && !isBusiness) {
      return res.status(403).json(
        ErrorResponses.forbidden('You can only enroll yourself or your customers')
      );
    }

    await enrollCustomerInProgram(customerId, programId);

    return res.status(200).json(
      successResponse({
        message: 'Customer enrolled successfully',
        customerId,
        programId,
      })
    );

  } catch (error) {
    console.error('[CustomerEnroll API] Error:', error);
    
    const errorMessage = (error as Error).message;
    
    // Handle specific error cases
    if (errorMessage.includes('already enrolled')) {
      return res.status(409).json(
        ErrorResponses.conflict('Customer is already enrolled in this program')
      );
    }
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Enrollment failed',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      )
    );
  }
}

