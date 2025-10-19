import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest } from '../../_lib/auth';
import { getCardById, updateCardPoints } from '../../_services/loyaltyCardServerService';
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

  const cardId = parseInt(req.query.cardId as string);

  if (isNaN(cardId)) {
    return res.status(400).json(formatError('INVALID_CARD_ID', 'Invalid card ID'));
  }

  try {
    if (req.method === 'GET') {
      const card = await getCardById(cardId);
      
      if (!card) {
        return res.status(404).json(formatError('NOT_FOUND', 'Card not found'));
      }

      // Authorization: customers can access their own cards, businesses can access cards in their programs
      if (
        req.user!.id.toString() !== card.customerId && 
        req.user!.businessId?.toString() !== card.businessId && 
        req.user!.role !== 'admin'
      ) {
        return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
      }

      return res.status(200).json(formatSuccess(card));
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { points, operation = 'set' } = req.body;

      if (typeof points !== 'number' || points < 0) {
        return res.status(400).json(formatError('INVALID_POINTS', 'Invalid points value'));
      }

      // Check authorization
      const existingCard = await getCardById(cardId);
      
      if (!existingCard) {
        return res.status(404).json(formatError('NOT_FOUND', 'Card not found'));
      }

      // Only the business that owns the program can update card points
      if (req.user!.businessId?.toString() !== existingCard.businessId && req.user!.role !== 'admin') {
        return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
      }

      const updatedCard = await updateCardPoints(cardId, points, operation);
      
      return res.status(200).json(formatSuccess(updatedCard));
    }

    return res.status(405).json(formatError('METHOD_NOT_ALLOWED', 'Method not allowed'));
  } catch (error) {
    console.error('Error in card endpoint:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

