import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../../../_lib/db';
import { verifyAuth, verifyBusinessAccess, cors, rateLimitFactory } from '../../../_lib/auth';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { businessId } = req.query as { businessId: string };
  if (!businessId || isNaN(Number(businessId))) return res.status(400).json({ error: 'Valid businessId required' });
  const canAccess = await verifyBusinessAccess(user.id, businessId);
  if (!canAccess) return res.status(403).json({ error: 'Forbidden' });

  try {
    const sql = requireSql();
    const rows = await sql`
      SELECT lp.name, COUNT(DISTINCT lc.customer_id)::int AS customers, COALESCE(SUM(ca.points),0)::int AS points
      FROM loyalty_programs lp
      LEFT JOIN loyalty_cards lc ON lc.program_id = lp.id
      LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
      WHERE lp.business_id = ${Number(businessId)}
      GROUP BY lp.id
      ORDER BY points DESC
      LIMIT 5
    `;
    res.status(200).json({ topPerformingPrograms: rows });
  } catch (e) {
    console.error('Top performing programs error:', e);
    res.status(500).json({ error: 'Failed to fetch top programs' });
  }
}

