import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest } from '../../_lib/auth';
import { getBusinessPrograms } from '../../_services/loyaltyProgramServerService';
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

  const businessId = req.query.businessId as string;

  if (!businessId) {
    return res.status(400).json(formatError('INVALID_BUSINESS_ID', 'Business ID required'));
  }

  // Authorization: users can only access their own business programs
  if (req.user!.businessId?.toString() !== businessId && req.user!.role !== 'admin') {
    return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
  }

  try {
    const programs = await getBusinessPrograms(parseInt(businessId));
    return res.status(200).json(formatSuccess({ programs }));
  } catch (error) {
    console.error('Error fetching programs:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

