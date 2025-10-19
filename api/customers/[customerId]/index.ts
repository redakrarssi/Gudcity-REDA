/**
 * Vercel Serverless API: Customer Operations by ID
 * GET /api/customers/[customerId] - Get customer by ID
 * PUT /api/customers/[customerId] - Update customer
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, canAccessResource } from '../../_lib/auth';
import { getCustomerById, updateCustomer } from '../../_services/customerServerService';
import { successResponse, ErrorResponses } from '../../_services/responseFormatter';
import { standardRateLimit } from '../../_middleware/rateLimit';
import { validationMiddleware } from '../../_middleware/validation';
import { cors } from '../../_lib/auth';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[Customer API] Request received:', { method: req.method, url: req.url });
  
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

  const customerId = req.query.customerId as string;

  try {
    if (req.method === 'GET') {
      // Authorization: customers can access their own data, businesses/admins can see their customers
      const isOwnData = req.user!.id === Number(customerId);
      const isAdmin = req.user!.role === 'admin';
      
      if (!isOwnData && !isAdmin && req.user!.role !== 'business') {
        return res.status(403).json(ErrorResponses.forbidden());
      }

      const customer = await getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json(ErrorResponses.notFound('Customer', customerId));
      }

      return res.status(200).json(successResponse(customer));
    }

    if (req.method === 'PUT') {
      // Only customer themselves or admin can update
      if (!canAccessResource(req, customerId)) {
        return res.status(403).json(ErrorResponses.forbidden());
      }

      // Validation schema for updates
      const updateSchema = {
        name: { type: 'string' as const, required: false, min: 2, max: 100, sanitize: true },
        phone: { type: 'string' as const, required: false, max: 20, sanitize: true },
        tier: { type: 'string' as const, required: false, enum: ['STANDARD', 'SILVER', 'GOLD', 'PLATINUM'] },
      };

      if (!validationMiddleware(updateSchema)(req, res)) {
        return;
      }

      const updatedCustomer = await updateCustomer(customerId, req.body);
      
      return res.status(200).json(successResponse(updatedCustomer));
    }

    return res.status(405).json(ErrorResponses.methodNotAllowed(['GET', 'PUT']));

  } catch (error) {
    console.error('[Customer API] Error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Customer operation failed',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}

