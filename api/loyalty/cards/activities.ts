import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest } from '../../_lib/auth';
import { getCardActivities, getCardById } from '../../_services/loyaltyCardServerService';
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

  const cardId = parseInt(req.query.cardId as string);
  const limit = parseInt(req.query.limit as string) || 10;

  if (isNaN(cardId)) {
    return res.status(400).json(formatError('INVALID_CARD_ID', 'Invalid card ID'));
  }

  try {
    // Check if card exists and user has access
    const card = await getCardById(cardId);
    
    if (!card) {
      return res.status(404).json(formatError('NOT_FOUND', 'Card not found'));
    }

    // Authorization
    if (
      req.user!.id.toString() !== card.customerId && 
      req.user!.businessId?.toString() !== card.businessId && 
      req.user!.role !== 'admin'
    ) {
      return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
    }

    const activities = await getCardActivities(cardId, limit);
    return res.status(200).json(formatSuccess({ activities }));
  } catch (error) {
    console.error('Error fetching card activities:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

