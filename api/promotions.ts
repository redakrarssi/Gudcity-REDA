/**
 * Promotions API Endpoint
 * GET /api/promotions - Get available promotions
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Log request for debugging
  console.log('🔍 [Promotions] Request received:', { 
    method: req.method,
    url: req.url,
    query: req.query
  });

  try {
    if (req.method === 'GET') {
      // This is a public route, no auth required
      const { businessId } = req.query;

      // Return placeholder response for now
      return res.status(200).json({ 
        success: true,
        promotions: [],
        businessId: businessId ? Number(businessId) : null
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Promotions API] Error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An unexpected error occurred'
    });
  }
}
