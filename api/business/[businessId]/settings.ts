import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest, canAccessResource } from '../../_lib/auth';
import { getBusinessSettings, updateBusinessSettings } from '../../_services/businessServerService';
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

  // Authorization
  if (!canAccessResource(req.user!, businessId, req.user!.role!)) {
    return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
  }

  try {
    if (req.method === 'GET') {
      const settings = await getBusinessSettings(businessId);
      return res.status(200).json(formatSuccess(settings));
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const updates = req.body;
      const updatedSettings = await updateBusinessSettings(businessId, updates);
      return res.status(200).json(formatSuccess(updatedSettings));
    }

    return res.status(405).json(formatError('METHOD_NOT_ALLOWED', 'Method not allowed'));
  } catch (error) {
    console.error('Error in business settings endpoint:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

