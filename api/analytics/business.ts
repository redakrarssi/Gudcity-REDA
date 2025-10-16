import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(60, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const sql = requireSql();

  try {
    const { businessId, metric, period = 'month' } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const bizId = parseInt(String(businessId));
    
    // Verify access
    if (user.role !== 'admin' && user.id !== bizId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Define date ranges based on period
    let dateFilter = '';
    switch (period) {
      case 'day':
        dateFilter = "AND created_at >= NOW() - INTERVAL '1 day'";
        break;
      case 'week':
        dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND created_at >= NOW() - INTERVAL '365 days'";
        break;
      default:
        dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
    }

    // Handle specific metrics
    if (metric === 'customers') {
      const result = await sql`
        SELECT COUNT(DISTINCT lc.customer_id) as count
        FROM loyalty_cards lc 
        WHERE lc.business_id = ${bizId} 
          AND lc.status = 'ACTIVE'
      `;
      return res.status(200).json({ count: parseInt(result[0]?.count || '0') });
    }

    if (metric === 'programs') {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM loyalty_programs 
        WHERE business_id = ${bizId} AND is_active = true
      `;
      return res.status(200).json({ count: parseInt(result[0]?.count || '0') });
    }

    if (metric === 'points') {
      const [totalPoints, recentPoints] = await Promise.all([
        sql`
          SELECT SUM(points) as total
          FROM loyalty_cards 
          WHERE business_id = ${bizId} AND status = 'ACTIVE'
        `,
        sql`
          SELECT SUM(points) as recent
          FROM point_transactions pt
          WHERE pt.business_id = ${bizId} ${sql.raw(dateFilter)}
        `
      ]);

      return res.status(200).json({
        total: parseInt(totalPoints[0]?.total || '0'),
        recent: parseInt(recentPoints[0]?.recent || '0')
      });
    }

    if (metric === 'redemptions') {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM redemptions r
        JOIN loyalty_cards lc ON r.card_id = lc.id
        WHERE lc.business_id = ${bizId} ${sql.raw(dateFilter)}
      `;
      return res.status(200).json({ count: parseInt(result[0]?.count || '0') });
    }

    if (metric === 'revenue') {
      const result = await sql`
        SELECT SUM(amount) as total
        FROM transactions t
        WHERE t.business_id = ${bizId} ${sql.raw(dateFilter)}
      `;
      return res.status(200).json({ total: parseFloat(result[0]?.total || '0') });
    }

    // Return comprehensive analytics
    const [
      customers,
      programs,
      totalPoints,
      redemptions,
      recentTransactions,
      topPrograms,
      customerGrowth
    ] = await Promise.all([
      sql`
        SELECT COUNT(DISTINCT lc.customer_id) as count
        FROM loyalty_cards lc 
        WHERE lc.business_id = ${bizId} AND lc.status = 'ACTIVE'
      `,
      sql`
        SELECT COUNT(*) as count
        FROM loyalty_programs 
        WHERE business_id = ${bizId} AND is_active = true
      `,
      sql`
        SELECT SUM(points) as total
        FROM loyalty_cards 
        WHERE business_id = ${bizId} AND status = 'ACTIVE'
      `,
      sql`
        SELECT COUNT(*) as count
        FROM redemptions r
        JOIN loyalty_cards lc ON r.card_id = lc.id
        WHERE lc.business_id = ${bizId}
      `,
      sql`
        SELECT pt.*, u.name as customer_name
        FROM point_transactions pt
        JOIN users u ON pt.customer_id = u.id
        WHERE pt.business_id = ${bizId}
        ORDER BY pt.created_at DESC
        LIMIT 10
      `,
      sql`
        SELECT 
          lp.id, lp.name, 
          COUNT(lc.id) as enrolled_customers,
          SUM(lc.points) as total_points
        FROM loyalty_programs lp
        LEFT JOIN loyalty_cards lc ON lp.id = lc.program_id AND lc.status = 'ACTIVE'
        WHERE lp.business_id = ${bizId} AND lp.is_active = true
        GROUP BY lp.id, lp.name
        ORDER BY enrolled_customers DESC
        LIMIT 5
      `,
      sql`
        SELECT 
          DATE(lc.created_at) as date,
          COUNT(*) as new_customers
        FROM loyalty_cards lc
        WHERE lc.business_id = ${bizId} 
          AND lc.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(lc.created_at)
        ORDER BY date DESC
      `
    ]);

    return res.status(200).json({
      totalCustomers: parseInt(customers[0]?.count || '0'),
      totalPrograms: parseInt(programs[0]?.count || '0'),
      totalPoints: parseInt(totalPoints[0]?.total || '0'),
      totalRedemptions: parseInt(redemptions[0]?.count || '0'),
      recentTransactions,
      topPrograms: topPrograms.map((p: any) => ({
        id: p.id,
        name: p.name,
        enrolledCustomers: parseInt(p.enrolled_customers || '0'),
        totalPoints: parseInt(p.total_points || '0')
      })),
      customerGrowth: customerGrowth.map((g: any) => ({
        date: g.date,
        newCustomers: parseInt(g.new_customers || '0')
      }))
    });

  } catch (error) {
    console.error('Business analytics API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
