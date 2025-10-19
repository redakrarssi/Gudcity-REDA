import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest, canAccessResource } from '../../_lib/auth';
import { getBusinessAnalytics } from '../../_services/businessServerService';
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

  if (req.method !== 'GET') {
    return res.status(405).json(formatError('METHOD_NOT_ALLOWED', 'Method not allowed'));
  }

  const businessId = parseInt(req.query.businessId as string);
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  if (isNaN(businessId)) {
    return res.status(400).json(formatError('INVALID_BUSINESS_ID', 'Invalid business ID'));
  }

  // Authorization
  if (!canAccessResource(req.user!, businessId, req.user!.role!)) {
    return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
  }

  // Default to last 30 days if dates not provided
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const analytics = await getBusinessAnalytics(businessId, start, end);
    return res.status(200).json(formatSuccess({ analytics, startDate: start, endDate: end }));
  } catch (error) {
    console.error('Error fetching business analytics:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

