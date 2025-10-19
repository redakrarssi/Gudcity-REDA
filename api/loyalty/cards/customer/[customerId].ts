import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest } from '../../../_lib/auth';
import { getCustomerCards } from '../../../_services/loyaltyCardServerService';
import { formatSuccess, formatError } from '../../../_services/responseFormatter';
import { authRateLimit } from '../../../_middleware/rateLimit';
import cors from '../../../_lib/cors';

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

  const customerId = parseInt(req.query.customerId as string);

  if (isNaN(customerId)) {
    return res.status(400).json(formatError('INVALID_CUSTOMER_ID', 'Invalid customer ID'));
  }

  // Authorization: customers can access their own cards
  if (req.user!.id !== customerId && req.user!.role !== 'admin') {
    return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
  }

  try {
    const cards = await getCustomerCards(customerId);
    return res.status(200).json(formatSuccess({ cards }));
  } catch (error) {
    console.error('Error fetching customer cards:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

