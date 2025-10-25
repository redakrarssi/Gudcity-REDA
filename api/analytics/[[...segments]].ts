import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const segments = (req.query.segments as string[] | undefined) || [];
  const feature = segments[0] || 'points';
  const { businessId, type, metric } = req.query as { businessId?: string; type?: string; metric?: string };
  if (!businessId || isNaN(Number(businessId))) return res.status(400).json({ error: 'businessId required' });

  try {
    const sql = requireSql();

    if (feature === 'points') {
      if (type === 'distribution') {
        const rows = await sql`SELECT 
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
        const rows = await sql`SELECT COALESCE(AVG(sub.total_pts),0) AS avg FROM (
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
    }

    if (feature === 'redemptions') {
      if (type === 'popular') {
        const rows = await sql`SELECT reward, COUNT(*)::int AS count FROM redemptions WHERE business_id = ${Number(businessId)} GROUP BY reward ORDER BY COUNT(*) DESC LIMIT 10`;
        return res.status(200).json({ popularRewards: rows });
      }
      if (metric === 'rate') {
        const [reds, customers] = await Promise.all([
          sql`SELECT COUNT(*)::int AS total FROM redemptions WHERE business_id = ${Number(businessId)} AND status IN ('COMPLETED','FULFILLED')`,
          sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)}`
        ]);
        const rc = Number(reds?.[0]?.total || 0);
        const cc = Number(customers?.[0]?.total || 0);
        const rate = cc > 0 ? Math.min(100, Math.round((rc / cc) * 100)) : 0;
        return res.status(200).json({ redemptionRate: rate });
      }
      const totalRows = await sql`SELECT COUNT(*)::int AS total FROM redemptions WHERE business_id = ${Number(businessId)} AND status IN ('COMPLETED','FULFILLED')`;
      return res.status(200).json({ totalRedemptions: Number(totalRows?.[0]?.total || 0) });
    }

    if (feature === 'customers') {
      if (type === 'active') {
        const rows = await sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)} AND updated_at >= NOW() - INTERVAL '30 days'`;
        return res.status(200).json({ activeCustomers: Number(rows?.[0]?.total || 0) });
      }
      const total = await sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)}`;
      return res.status(200).json({ customers: Number(total?.[0]?.total || 0) });
    }

    if (feature === 'retention') {
      const [activeNow, activePrev] = await Promise.all([
        sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)} AND updated_at >= NOW() - INTERVAL '30 days'`,
        sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)} AND updated_at >= NOW() - INTERVAL '60 days' AND updated_at < NOW() - INTERVAL '30 days'`
      ]);
      const current = Number(activeNow?.[0]?.total || 0);
      const previous = Number(activePrev?.[0]?.total || 0);
      const retentionRate = (current + previous) > 0 ? Math.round((current / (current + previous)) * 100) : 0;
      return res.status(200).json({ retentionRate });
    }

    if (feature === 'engagement') {
      const rows = await sql`SELECT TO_CHAR(DATE_TRUNC('day', ca.created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS value
        FROM card_activities ca
        JOIN loyalty_cards lc ON lc.id = ca.card_id
        WHERE lc.business_id = ${Number(businessId)}
        GROUP BY DATE_TRUNC('day', ca.created_at)
        ORDER BY DATE_TRUNC('day', ca.created_at) DESC
        LIMIT 30`;
      return res.status(200).json({ customerEngagement: rows.reverse() });
    }

    // Handle comprehensive business analytics overview
    if (feature === 'business') {
      try {
        console.log('[Analytics API] Fetching business analytics for businessId:', businessId);
        
        // Verify business exists first
        const businessCheck = await sql`
          SELECT id, business_name FROM users WHERE id = ${Number(businessId)} AND user_type IN ('business', 'owner')
          LIMIT 1
        `;
        
        if (businessCheck.length === 0) {
          console.warn('[Analytics API] Business not found:', businessId);
          return res.status(404).json({ error: 'Business not found' });
        }

        console.log('[Analytics API] Business found:', businessCheck[0].business_name);

        // Fetch comprehensive analytics in parallel for better performance
        const [
          totalCustomers,
          totalCards, 
          totalTransactions,
          totalPoints,
          totalRedemptions,
          activeCustomers,
          recentActivity
        ] = await Promise.all([
          // Total unique customers
          sql`
            SELECT COUNT(DISTINCT customer_id)::int as count 
            FROM loyalty_cards lc 
            WHERE lc.business_id = ${Number(businessId)}
          `,
          
          // Total loyalty cards issued  
          sql`
            SELECT COUNT(*)::int as count 
            FROM loyalty_cards 
            WHERE business_id = ${Number(businessId)}
          `,
          
          // Total transactions/activities
          sql`
            SELECT COUNT(ca.id)::int as count
            FROM card_activities ca
            JOIN loyalty_cards lc ON lc.id = ca.card_id
            WHERE lc.business_id = ${Number(businessId)}
          `,
          
          // Total points earned by all customers
          sql`
            SELECT COALESCE(SUM(ca.points), 0)::int as total
            FROM card_activities ca
            JOIN loyalty_cards lc ON lc.id = ca.card_id  
            WHERE lc.business_id = ${Number(businessId)} 
              AND ca.activity_type = 'EARN_POINTS'
          `,
          
          // Total redemptions completed
          sql`
            SELECT COUNT(*)::int as count
            FROM redemptions 
            WHERE business_id = ${Number(businessId)} 
              AND status IN ('COMPLETED', 'FULFILLED')
          `,
          
          // Active customers (activity in last 30 days)  
          sql`
            SELECT COUNT(DISTINCT lc.customer_id)::int as count
            FROM loyalty_cards lc
            JOIN card_activities ca ON ca.card_id = lc.id
            WHERE lc.business_id = ${Number(businessId)}
              AND ca.created_at >= NOW() - INTERVAL '30 days'
          `,
          
          // Recent activity (last 7 days)
          sql`
            SELECT 
              DATE(ca.created_at) as date,
              COUNT(*)::int as activities
            FROM card_activities ca
            JOIN loyalty_cards lc ON lc.id = ca.card_id
            WHERE lc.business_id = ${Number(businessId)}
              AND ca.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(ca.created_at)
            ORDER BY date DESC
            LIMIT 7
          `
        ]);

        const analytics = {
          businessId: Number(businessId),
          businessName: businessCheck[0].business_name,
          totals: {
            customers: Number(totalCustomers[0]?.count || 0),
            cards: Number(totalCards[0]?.count || 0), 
            transactions: Number(totalTransactions[0]?.count || 0),
            points: Number(totalPoints[0]?.total || 0),
            redemptions: Number(totalRedemptions[0]?.count || 0)
          },
          engagement: {
            activeCustomers: Number(activeCustomers[0]?.count || 0),
            recentActivity: recentActivity.map(row => ({
              date: row.date,
              activities: Number(row.activities)
            }))
          },
          // Calculate some derived metrics
          metrics: {
            avgPointsPerCustomer: totalCustomers[0]?.count > 0 ? 
              Math.round(Number(totalPoints[0]?.total || 0) / Number(totalCustomers[0].count)) : 0,
            redemptionRate: totalCustomers[0]?.count > 0 ?
              Math.round((Number(totalRedemptions[0]?.count || 0) / Number(totalCustomers[0].count)) * 100) : 0,
            customerRetention: totalCustomers[0]?.count > 0 ?
              Math.round((Number(activeCustomers[0]?.count || 0) / Number(totalCustomers[0].count)) * 100) : 0
          },
          timestamp: new Date().toISOString()
        };

        console.log('[Analytics API] Successfully fetched business analytics:', {
          businessId,
          totalCustomers: analytics.totals.customers,
          totalCards: analytics.totals.cards,
          totalTransactions: analytics.totals.transactions
        });

        return res.status(200).json(analytics);
        
      } catch (analyticsError) {
        console.error('[Analytics API] Error fetching business analytics:', analyticsError);
        
        // Return partial data on error instead of complete failure
        return res.status(200).json({
          businessId: Number(businessId),
          totals: {
            customers: 0,
            cards: 0,
            transactions: 0, 
            points: 0,
            redemptions: 0
          },
          engagement: {
            activeCustomers: 0,
            recentActivity: []
          },
          metrics: {
            avgPointsPerCustomer: 0,
            redemptionRate: 0,
            customerRetention: 0
          },
          error: 'Partial data - some analytics unavailable',
          timestamp: new Date().toISOString()
        });
      }
    }

    return res.status(400).json({ error: 'Unknown analytics feature' });
  } catch (e) {
    console.error('Analytics (catch-all) error:', e);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

