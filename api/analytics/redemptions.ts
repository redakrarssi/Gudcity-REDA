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
  } catch (e) {
    console.error('Redemptions analytics error:', e);
    return res.status(500).json({ error: 'Failed to fetch redemptions analytics' });
  }
}

