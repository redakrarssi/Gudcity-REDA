import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest } from '../../_lib/auth';
import { createProgram } from '../../_services/loyaltyProgramServerService';
import { formatSuccess, formatError } from '../../_services/responseFormatter';
import { sensitiveRateLimit } from '../../_middleware/rateLimit';
import { validationMiddleware } from '../../_middleware/validation';
import cors from '../../_lib/cors';

const createProgramSchema = {
  businessId: { type: 'string', required: true },
  name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
  description: { type: 'string', maxLength: 1000 },
  type: { type: 'string', enum: ['POINTS', 'STAMP', 'VISIT', 'CASHBACK'] },
  pointValue: { type: 'number', min: 0 },
  expirationDays: { type: 'number', min: 0, nullable: true },
  status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
  rewardTiers: { type: 'array' }
};

export default async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
) {
  // Handle CORS
  await cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Rate limiting
  const rateLimitResult = await sensitiveRateLimit(req, res);
  if (!rateLimitResult) return;

  // Authentication
  const isAuth = await authMiddleware(req, res);
  if (!isAuth) return;

  if (req.method !== 'POST') {
    return res.status(405).json(formatError('METHOD_NOT_ALLOWED', 'Method not allowed'));
  }

  // Validation
  const validationResult = await validationMiddleware(req, res, createProgramSchema);
  if (!validationResult) return;

  const programData = req.body;

  // Authorization: users can only create programs for their own business
  if (req.user!.businessId?.toString() !== programData.businessId && req.user!.role !== 'admin') {
    return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
  }

  try {
    const newProgram = await createProgram(programData);
    
    if (!newProgram) {
      return res.status(500).json(formatError('CREATE_FAILED', 'Failed to create program'));
    }

    return res.status(201).json(formatSuccess(newProgram));
  } catch (error) {
    console.error('Error creating program:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

