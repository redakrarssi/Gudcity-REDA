/**
 * Vercel Serverless API: Security Audit Logs
 * GET /api/security/audit - Get security audit logs
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticatedRequest, authMiddleware, cors } from '../_lib/auth.js';
import { getSecurityAuditLogs } from '../_services/securityAuditServerService.js';
import { successResponse, ErrorResponses } from '../_services/responseFormatter.js';
import { standardRateLimit } from '../_middleware/rateLimit.js';

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  console.log('[Security Audit API] Request received:', { method: req.method, url: req.url });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  if (!standardRateLimit.check(req, res)) {
    return;
  }

  // Authentication required - admin only
  const isAuth = await authMiddleware(req, res);
  if (!isAuth) {
    return;
  }

  // Only admins can access audit logs
  if (req.user!.role !== 'admin') {
    return res.status(403).json(ErrorResponses.forbidden('Only administrators can access audit logs'));
  }

  try {
    if (req.method === 'GET') {
      const { limit = '100', offset = '0' } = req.query;
      
      const logs = await getSecurityAuditLogs({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      return res.status(200).json(successResponse({ 
        logs,
        total: logs.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }));
    }

    return res.status(405).json(ErrorResponses.methodNotAllowed(['GET']));

  } catch (error) {
    console.error('[Security Audit API] Error:', error);
    console.error('[Security Audit API] Error stack:', (error as Error).stack);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Failed to retrieve audit logs',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}
