import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../../../_lib/db.js';
import { verifyAuth, verifyBusinessAccess, cors, rateLimitFactory } from '../../../_lib/auth.js';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { businessId } = req.query as { businessId: string };
  if (!businessId || isNaN(Number(businessId))) {
    return res.status(400).json({ error: 'Valid businessId required' });
  }

  const canAccess = await verifyBusinessAccess(user.id, businessId);
  if (!canAccess) return res.status(403).json({ error: 'Forbidden' });

  const sql = requireSql();

  try {
    if (req.method === 'GET') {
      // Get business programs
      const programs = await sql`
        SELECT 
          lp.id,
          lp.name,
          lp.description,
          lp.is_active,
          lp.points_per_dollar,
          lp.created_at,
          lp.updated_at,
          COUNT(DISTINCT lc.customer_id)::int AS enrolled_customers,
          COALESCE(SUM(ca.points), 0)::int AS total_points_awarded
        FROM loyalty_programs lp
        LEFT JOIN loyalty_cards lc ON lc.program_id = lp.id
        LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
        WHERE lp.business_id = ${Number(businessId)}
        GROUP BY lp.id
        ORDER BY lp.created_at DESC
      `;

      return res.status(200).json({ programs });
    }

    if (req.method === 'POST') {
      // Create new program
      const { name, description, points_per_dollar, is_active } = req.body || {};
      
      if (!name) {
        return res.status(400).json({ error: 'Program name is required' });
      }

      const result = await sql`
        INSERT INTO loyalty_programs (business_id, name, description, points_per_dollar, is_active)
        VALUES (
          ${Number(businessId)},
          ${name},
          ${description || ''},
          ${points_per_dollar || 10},
          ${is_active !== false}
        )
        RETURNING *
      `;

      return res.status(201).json({ program: result[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Business programs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
