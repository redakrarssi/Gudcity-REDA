import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { businessId, type, metric } = req.query as { businessId?: string; type?: string; metric?: string };
  if (!businessId || isNaN(Number(businessId))) return res.status(400).json({ error: 'businessId required' });

  try {
    const sql = requireSql();
    if (type === 'distribution') {
      const rows = await sql`
        SELECT 
          CASE 
            WHEN points <= 50 THEN '0-50'
            WHEN points <= 100 THEN '51-100'
            WHEN points <= 250 THEN '101-250'
            WHEN points <= 500 THEN '251-500'
            ELSE '500+'
          END AS category,
          COUNT(*)::int AS value
        FROM (
          SELECT COALESCE(SUM(ca.points),0) AS points
          FROM loyalty_cards lc
          LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
          WHERE lc.business_id = ${Number(businessId)}
          GROUP BY lc.customer_id
        ) t
        GROUP BY category
        ORDER BY category`;
      return res.status(200).json({ pointsDistribution: rows });
    }

    if (metric === 'average') {
      const rows = await sql`
        SELECT COALESCE(AVG(sub.total_pts),0) AS avg FROM (
          SELECT lc.customer_id, COALESCE(SUM(ca.points),0) AS total_pts
          FROM loyalty_cards lc
          LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
          WHERE lc.business_id = ${Number(businessId)}
          GROUP BY lc.customer_id
        ) sub`;
      return res.status(200).json({ averagePointsPerCustomer: Number(rows?.[0]?.avg || 0) });
    }

    const totalRows = await sql`SELECT COALESCE(SUM(points),0) AS total FROM card_activities ca JOIN loyalty_cards lc ON lc.id = ca.card_id WHERE lc.business_id = ${Number(businessId)} AND ca.activity_type = 'EARN_POINTS'`;
    return res.status(200).json({ totalPoints: Number(totalRows?.[0]?.total || 0) });
  } catch (e) {
    console.error('Points analytics error:', e);
    return res.status(500).json({ error: 'Failed to fetch points analytics' });
  }
}

