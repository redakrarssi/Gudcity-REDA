import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth';

const allow = rateLimitFactory(180, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { businessId } = req.query as { businessId?: string };
  if (!businessId || isNaN(Number(businessId))) return res.status(400).json({ error: 'businessId required' });

  try {
    const sql = requireSql();
    const [activeNow, activePrev] = await Promise.all([
      sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)} AND updated_at >= NOW() - INTERVAL '30 days'`,
      sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)} AND updated_at >= NOW() - INTERVAL '60 days' AND updated_at < NOW() - INTERVAL '30 days'`
    ]);
    const current = Number(activeNow?.[0]?.total || 0);
    const previous = Number(activePrev?.[0]?.total || 0);
    // Simple retention approximation
    const retentionRate = (current + previous) > 0 ? Math.round((current / (current + previous)) * 100) : 0;
    return res.status(200).json({ retentionRate });
  } catch (e) {
    console.error('Retention analytics error:', e);
    return res.status(500).json({ error: 'Failed to fetch retention analytics' });
  }
}

