import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../../_lib/auth.js';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { customerId } = req.query as { customerId: string };
  if (!customerId || isNaN(Number(customerId))) {
    return res.status(400).json({ error: 'Valid customerId required' });
  }

  // Verify user can access this customer data
  if (user.id !== Number(customerId) && user.role !== 'admin' && user.role !== 'business') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const sql = requireSql();

  try {
    if (req.method === 'GET') {
      // Get customer's enrolled programs
      const programs = await sql`
        SELECT DISTINCT
          lp.id,
          lp.name,
          lp.description,
          lp.business_id,
          lp.points_per_dollar,
          lp.is_active,
          lp.created_at,
          u.name AS business_name,
          u.email AS business_email,
          lc.id AS card_id,
          lc.points,
          lc.points_balance,
          lc.total_points_earned,
          lc.card_number,
          lc.card_type,
          lc.tier,
          lc.status AS card_status,
          lc.created_at AS enrollment_date
        FROM loyalty_programs lp
        JOIN loyalty_cards lc ON lc.program_id = lp.id
        JOIN users u ON u.id = lp.business_id
        WHERE lc.customer_id = ${Number(customerId)}
          AND lc.status = 'ACTIVE'
        ORDER BY lc.created_at DESC
      `;

      return res.status(200).json({ programs });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Customer programs error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
