import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from './_lib/db.js';
import { cors, rateLimitFactory } from './_lib/auth.js';

const allow = rateLimitFactory(60, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = requireSql();

  try {
    const { businessId } = req.query;

    if (businessId) {
      // Get promotions for a specific business
      const promoCodesResult = await sql`
        SELECT pc.*, u.business_name, u.name as business_name
        FROM promo_codes pc
        JOIN users u ON pc.business_id = u.id
        WHERE pc.business_id = ${parseInt(String(businessId))}
          AND pc.status = 'ACTIVE'
          AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
        ORDER BY pc.created_at DESC
      `;

      const promotions = promoCodesResult.map((row: any) => ({
        id: String(row.id),
        businessId: String(row.business_id),
        businessName: row.business_name || row.name || 'Unknown Business',
        code: String(row.code),
        type: row.type,
        value: Number(row.value),
        currency: row.currency,
        maxUses: row.max_uses ? Number(row.max_uses) : null,
        usedCount: Number(row.used_count || 0),
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        status: row.status,
        name: String(row.name || ''),
        description: String(row.description || ''),
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }));

      return res.status(200).json({ promotions });
    }

    // Get all active promo codes (public)
    const promoCodesResult = await sql`
      SELECT pc.*, u.business_name, u.name as business_name
      FROM promo_codes pc
      JOIN users u ON pc.business_id = u.id
      WHERE pc.status = 'ACTIVE'
      AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
      AND (pc.max_uses IS NULL OR pc.used_count < pc.max_uses)
      ORDER BY pc.created_at DESC
    `;
    
    const promotions = promoCodesResult.map((row: any) => ({
      id: String(row.id),
      businessId: String(row.business_id),
      businessName: row.business_name || row.name || 'Unknown Business',
      code: String(row.code),
      type: row.type,
      value: Number(row.value),
      currency: row.currency,
      maxUses: row.max_uses ? Number(row.max_uses) : null,
      usedCount: Number(row.used_count || 0),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      status: row.status,
      name: String(row.name || ''),
      description: String(row.description || ''),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
    
    return res.status(200).json({ promotions });
  } catch (error) {
    console.error('Promotions API error:', error);
    return res.status(500).json({ 
      promotions: [], 
      error: 'Failed to fetch promotions' 
    });
  }
}
