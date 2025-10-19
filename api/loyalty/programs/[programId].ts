import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authMiddleware, AuthenticatedRequest } from '../../_lib/auth';
import { getProgramById, updateProgram, deleteProgram } from '../../_services/loyaltyProgramServerService';
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

  const programId = req.query.programId as string;

  if (!programId) {
    return res.status(400).json(formatError('INVALID_PROGRAM_ID', 'Invalid program ID'));
  }

  try {
    if (req.method === 'GET') {
      const program = await getProgramById(programId);
      
      if (!program) {
        return res.status(404).json(formatError('NOT_FOUND', 'Program not found'));
      }

      // Authorization: check if user owns the business for this program
      if (req.user!.businessId?.toString() !== program.businessId && req.user!.role !== 'admin') {
        return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
      }

      return res.status(200).json(formatSuccess(program));
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      // First check if program exists and user has access
      const existingProgram = await getProgramById(programId);
      
      if (!existingProgram) {
        return res.status(404).json(formatError('NOT_FOUND', 'Program not found'));
      }

      if (req.user!.businessId?.toString() !== existingProgram.businessId && req.user!.role !== 'admin') {
        return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
      }

      const updates = req.body;
      const updatedProgram = await updateProgram(programId, updates);
      
      return res.status(200).json(formatSuccess(updatedProgram));
    }

    if (req.method === 'DELETE') {
      // First check if program exists and user has access
      const existingProgram = await getProgramById(programId);
      
      if (!existingProgram) {
        return res.status(404).json(formatError('NOT_FOUND', 'Program not found'));
      }

      if (req.user!.businessId?.toString() !== existingProgram.businessId && req.user!.role !== 'admin') {
        return res.status(403).json(formatError('FORBIDDEN', 'Access denied'));
      }

      const success = await deleteProgram(programId);
      
      if (!success) {
        return res.status(500).json(formatError('DELETE_FAILED', 'Failed to delete program'));
      }

      return res.status(200).json(formatSuccess({ deleted: true }));
    }

    return res.status(405).json(formatError('METHOD_NOT_ALLOWED', 'Method not allowed'));
  } catch (error) {
    console.error('Error in program endpoint:', error);
    return res.status(500).json(formatError('SERVER_ERROR', 'Internal server error'));
  }
}

