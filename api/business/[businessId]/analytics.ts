import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../../_lib/db';
import { verifyAuth, verifyBusinessAccess, cors, rateLimitFactory } from '../../_lib/auth';

const allow = rateLimitFactory(120, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
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

    // Parallel queries with safe parameterization
    const [
      totalPointsRows,
      totalRedRows,
      activeCustRows,
      totalProgramsRows,
      totalPromoRows,
      avgPtsRows,
      popularRewardsRows,
      engagementRows,
      pointsDistRows,
      topProgramsRows
    ] = await Promise.all([
      sql`SELECT COALESCE(SUM(points),0) AS total FROM card_activities ca JOIN loyalty_cards lc ON lc.id = ca.card_id WHERE lc.business_id = ${Number(businessId)} AND ca.activity_type = 'EARN_POINTS'`,
      sql`SELECT COUNT(*)::int AS total FROM redemptions WHERE business_id = ${Number(businessId)} AND status IN ('COMPLETED','FULFILLED')`,
      sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)} AND updated_at >= NOW() - INTERVAL '30 days'`,
      sql`SELECT COUNT(*)::int AS total FROM loyalty_programs WHERE business_id = ${Number(businessId)}`,
      sql`SELECT COUNT(*)::int AS total FROM promo_codes WHERE business_id = ${Number(businessId)}`,
      sql`SELECT COALESCE(AVG(sub.total_pts),0) AS avg FROM (
            SELECT lc.customer_id, COALESCE(SUM(ca.points),0) AS total_pts
            FROM loyalty_cards lc
            LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
            WHERE lc.business_id = ${Number(businessId)}
            GROUP BY lc.customer_id
          ) sub`,
      sql`SELECT reward AS name, COUNT(*)::int AS count
          FROM redemptions 
          WHERE business_id = ${Number(businessId)} 
          GROUP BY reward
          ORDER BY COUNT(*) DESC
          LIMIT 10`,
      sql`SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS value
          FROM card_activities ca
          JOIN loyalty_cards lc ON lc.id = ca.card_id
          WHERE lc.business_id = ${Number(businessId)}
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY DATE_TRUNC('day', created_at) DESC
          LIMIT 30`,
      sql`SELECT 
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
          ORDER BY category`,
      sql`SELECT lp.name, COUNT(DISTINCT lc.customer_id)::int AS customers, COALESCE(SUM(ca.points),0)::int AS points
          FROM loyalty_programs lp
          LEFT JOIN loyalty_cards lc ON lc.program_id = lp.id
          LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
          WHERE lp.business_id = ${Number(businessId)}
          GROUP BY lp.id
          ORDER BY points DESC
          LIMIT 5`
    ]);

    // Simple rate calculations
    const totalCustomers = Number(activeCustRows?.[0]?.total || 0);
    const totalRedemptions = Number(totalRedRows?.[0]?.total || 0);
    const totalPoints = Number(totalPointsRows?.[0]?.total || 0);
    const retentionRate = totalCustomers; // Placeholder: client may compute percentage from cohorts
    const redemptionRate = totalCustomers > 0 ? Math.min(100, Math.round((totalRedemptions / totalCustomers) * 100)) : 0;

    res.status(200).json({
      totalPoints,
      totalRedemptions,
      activeCustomers: totalCustomers,
      retentionRate,
      redemptionRate,
      popularRewards: (popularRewardsRows || []).map((r: any) => ({ reward: r.name, count: Number(r.count) })),
      customerEngagement: (engagementRows || []).reverse(),
      pointsDistribution: (pointsDistRows || []),
      totalPrograms: Number(totalProgramsRows?.[0]?.total || 0),
      totalPromoCodes: Number(totalPromoRows?.[0]?.total || 0),
      averagePointsPerCustomer: Number(avgPtsRows?.[0]?.avg || 0),
      topPerformingPrograms: (topProgramsRows || []).map((r: any) => ({ name: r.name, customers: Number(r.customers), points: Number(r.points) }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

