/**
 * Promotions API Endpoint
 * GET /api/promotions/available
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(200, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  cors(res, (req.headers.origin as string) || undefined);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // Authentication (optional for public promotions)
  const user = await verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const sql = requireSql();
    
    // Get all active promo codes with business information
    const promoCodesResult = await sql`
      SELECT 
        pc.id,
        pc.business_id,
        pc.code,
        pc.type,
        pc.value,
        pc.currency,
        pc.status,
        pc.max_uses,
        pc.used_count,
        pc.expires_at,
        pc.name,
        pc.description,
        pc.created_at,
        u.business_name
      FROM promo_codes pc
      JOIN users u ON pc.business_id = u.id
      WHERE pc.status = 'ACTIVE'
      AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
      AND (pc.max_uses IS NULL OR pc.used_count < pc.max_uses)
      ORDER BY pc.created_at DESC
    `;
    
    // Format the results to match the expected interface
    const promotions = promoCodesResult.map((row: any) => ({
      id: row.id.toString(),
      code: row.code,
      type: row.type,
      value: Number(row.value),
      currency: row.currency || 'USD',
      businessId: row.business_id.toString(),
      businessName: row.business_name || 'Unknown Business',
      status: row.status,
      maxUses: row.max_uses ? Number(row.max_uses) : null,
      usedCount: Number(row.used_count || 0),
      expiresAt: row.expires_at,
      name: row.name || '',
      description: row.description || '',
      createdAt: row.created_at
    }));

    return res.status(200).json({ 
      promotions,
      total: promotions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Promotions API error:', error);
    
    // Return fallback data if database fails
    const fallbackPromotions = [
      {
        id: '1',
        code: 'WELCOME10',
        type: 'PERCENTAGE',
        value: 10,
        currency: 'USD',
        businessId: '1',
        businessName: 'Sample Business',
        status: 'ACTIVE',
        maxUses: 100,
        usedCount: 0,
        expiresAt: null,
        name: 'Welcome Discount',
        description: '10% off your first purchase',
        createdAt: new Date().toISOString()
      }
    ];
    
    return res.status(200).json({ 
      promotions: fallbackPromotions,
      total: fallbackPromotions.length,
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
}
