/**
 * Security Audit API Endpoint
 * GET /api/security/audit - Get security audit logs
 * POST /api/security/audit - Log security event
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, verifyAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Log request for debugging
  console.log('🔍 [Security Audit] Request received:', { 
    method: req.method,
    url: req.url,
    query: req.query
  });

  try {
    if (req.method === 'GET') {
      // Authentication check
      const user = await verifyAuth(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Return placeholder response for now
      return res.status(200).json({ 
        success: true,
        logs: [],
        message: 'Security audit endpoint ready'
      });
    }

    if (req.method === 'POST') {
      // Authentication check
      const user = await verifyAuth(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { event, metadata, ipAddress, userAgent } = (req.body || {}) as any;

      if (!event) {
        return res.status(400).json({ error: 'event is required' });
      }

      // Log the event (placeholder for now)
      console.log('📝 [Security Audit] Event logged:', {
        userId: user.id,
        event,
        ipAddress: ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: userAgent || req.headers['user-agent'],
        metadata
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Security Audit API] Error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An unexpected error occurred'
    });
  }
}
