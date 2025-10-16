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
    const { type, businessId, customerId } = req.query;

    if (type === 'admin' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Admin Dashboard Stats
    if (type === 'admin') {
      const [
        totalUsers,
        totalBusinesses,
        totalCustomers,
        totalPrograms,
        totalTransactions,
        recentActivity
      ] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM users WHERE status = 'active'`,
        sql`SELECT COUNT(*) as count FROM users WHERE user_type = 'business' AND status = 'active'`,
        sql`SELECT COUNT(*) as count FROM users WHERE user_type = 'customer' AND status = 'active'`,
        sql`SELECT COUNT(*) as count FROM loyalty_programs WHERE is_active = true`,
        sql`SELECT COUNT(*) as count FROM point_transactions WHERE created_at >= NOW() - INTERVAL '30 days'`,
        sql`
          SELECT u.name, u.email, u.created_at, u.user_type 
          FROM users u 
          WHERE u.created_at >= NOW() - INTERVAL '7 days' 
          ORDER BY u.created_at DESC 
          LIMIT 10
        `
      ]);

      return res.status(200).json({
        totalUsers: parseInt(totalUsers[0]?.count || '0'),
        totalBusinesses: parseInt(totalBusinesses[0]?.count || '0'),
        totalCustomers: parseInt(totalCustomers[0]?.count || '0'),
        totalPrograms: parseInt(totalPrograms[0]?.count || '0'),
        totalTransactions: parseInt(totalTransactions[0]?.count || '0'),
        recentActivity: recentActivity
      });
    }

    // Business Dashboard Stats
    if (type === 'business') {
      const bizId = businessId || user.id;
      
      if (user.role !== 'admin' && user.id !== parseInt(String(bizId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const [
        totalCustomers,
        totalPrograms,
        totalPoints,
        totalRedemptions,
        recentTransactions
      ] = await Promise.all([
        sql`
          SELECT COUNT(DISTINCT lc.customer_id) as count 
          FROM loyalty_cards lc 
          WHERE lc.business_id = ${parseInt(String(bizId))} AND lc.status = 'ACTIVE'
        `,
        sql`SELECT COUNT(*) as count FROM loyalty_programs WHERE business_id = ${parseInt(String(bizId))} AND is_active = true`,
        sql`SELECT SUM(points) as total FROM loyalty_cards WHERE business_id = ${parseInt(String(bizId))} AND status = 'ACTIVE'`,
        sql`SELECT COUNT(*) as count FROM redemptions r JOIN loyalty_cards lc ON r.card_id = lc.id WHERE lc.business_id = ${parseInt(String(bizId))}`,
        sql`
          SELECT pt.*, u.name as customer_name 
          FROM point_transactions pt 
          JOIN users u ON pt.customer_id = u.id 
          WHERE pt.business_id = ${parseInt(String(bizId))} 
          ORDER BY pt.created_at DESC 
          LIMIT 10
        `
      ]);

      return res.status(200).json({
        totalCustomers: parseInt(totalCustomers[0]?.count || '0'),
        totalPrograms: parseInt(totalPrograms[0]?.count || '0'),
        totalPointsAwarded: parseInt(totalPoints[0]?.total || '0'),
        totalRedemptions: parseInt(totalRedemptions[0]?.count || '0'),
        recentTransactions: recentTransactions
      });
    }

    // Customer Dashboard Stats
    if (type === 'customer') {
      const custId = customerId || user.id;
      
      if (user.role !== 'admin' && user.id !== parseInt(String(custId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const [
        totalCards,
        totalPoints,
        totalRedemptions,
        enrolledPrograms,
        recentActivity
      ] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM loyalty_cards WHERE customer_id = ${parseInt(String(custId))} AND status = 'ACTIVE'`,
        sql`SELECT SUM(points) as total FROM loyalty_cards WHERE customer_id = ${parseInt(String(custId))} AND status = 'ACTIVE'`,
        sql`SELECT COUNT(*) as count FROM redemptions r JOIN loyalty_cards lc ON r.card_id = lc.id WHERE lc.customer_id = ${parseInt(String(custId))}`,
        sql`
          SELECT lp.name as program_name, u.name as business_name, lc.points, lc.tier 
          FROM loyalty_cards lc 
          JOIN loyalty_programs lp ON lc.program_id = lp.id 
          JOIN users u ON lp.business_id = u.id 
          WHERE lc.customer_id = ${parseInt(String(custId))} AND lc.status = 'ACTIVE'
        `,
        sql`
          SELECT ca.*, lp.name as program_name, u.name as business_name 
          FROM card_activities ca 
          JOIN loyalty_cards lc ON ca.card_id = lc.id 
          JOIN loyalty_programs lp ON lc.program_id = lp.id 
          JOIN users u ON lp.business_id = u.id 
          WHERE lc.customer_id = ${parseInt(String(custId))} 
          ORDER BY ca.created_at DESC 
          LIMIT 10
        `
      ]);

      return res.status(200).json({
        totalCards: parseInt(totalCards[0]?.count || '0'),
        totalPoints: parseInt(totalPoints[0]?.total || '0'),
        totalRedemptions: parseInt(totalRedemptions[0]?.count || '0'),
        enrolledPrograms: enrolledPrograms,
        recentActivity: recentActivity
      });
    }

    return res.status(400).json({ error: 'Invalid dashboard type. Must be admin, business, or customer' });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
