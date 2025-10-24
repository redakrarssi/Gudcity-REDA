/**
 * Customer Loyalty Cards API Endpoint
 * GET /api/loyalty/cards/customer/[id] - Get loyalty cards for a customer
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, verifyAuth } from '../../../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Log request for debugging
  console.log('🔍 [Customer Cards] Request received:', { 
    method: req.method,
    url: req.url,
    customerId: req.query.id
  });

  try {
    if (req.method === 'GET') {
      // Authentication check
      const user = await verifyAuth(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const customerId = req.query.id as string;
      
      // Authorization check - users can only access their own cards unless admin/business
      if (user.id !== Number(customerId) && user.role !== 'admin' && user.role !== 'business') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Return placeholder response for now
      return res.status(200).json({ 
        success: true,
        cards: [],
        customerId
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Customer Cards API] Error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An unexpected error occurred'
    });
  }
}
