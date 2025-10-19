import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest, canAccessResource } from '../../_lib/auth';
import { getBusinessById, updateBusiness } from '../../_services/businessServerService';
import { formatSuccess, formatError } from '../../_services/responseFormatter';
import { authRateLimit } from '../../_middleware/rateLimit';
import cors from '../../_lib/cors';

export default async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Handle CORS
  await cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Rate limiting
  const rateLimitResult = await authRateLimit(req, res);
  if (!rateLimitResult) return;

  // Authentication
  const isAuth = await authMiddleware(req, res);
  if (!isAuth) return;

  const businessId = parseInt(req.query.businessId as string);

  if (isNaN(businessId)) {
    return res.status(400).json(formatError('INVALID_BUSINESS_ID', 'Invalid business ID'));
  }

  try {
    if (req.method === 'GET') {
      // Authorization: users can access their own business or admins can access any
      if (!canAccessResource(req.user!, businessId, req.user!.role!)) {
        return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
      }

      const business = await getBusinessById(businessId);
      
      if (!business) {
        return res.status(404).json(formatError('NOT_FOUND', 'Business not found'));
      }

      return res.status(200).json(formatSuccess(business));
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Authorization: only the business owner or admin can update
      if (!canAccessResource(req.user!, businessId, req.user!.role!)) {
        return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
      }

      const updates = req.body;
      const updatedBusiness = await updateBusiness(businessId, updates);
      
      if (!updatedBusiness) {
        return res.status(404).json(formatError('NOT_FOUND', 'Business not found'));
      }

      return res.status(200).json(formatSuccess(updatedBusiness));
    }

    return res.status(405).json(formatError('METHOD_NOT_ALLOWED', 'Method not allowed'));
  } catch (error) {
    console.error('Error in business endpoint:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

