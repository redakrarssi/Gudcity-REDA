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
    const rows = await sql`
      SELECT TO_CHAR(DATE_TRUNC('day', ca.created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS value
      FROM card_activities ca
      JOIN loyalty_cards lc ON lc.id = ca.card_id
      WHERE lc.business_id = ${Number(businessId)}
      GROUP BY DATE_TRUNC('day', ca.created_at)
      ORDER BY DATE_TRUNC('day', ca.created_at) DESC
      LIMIT 30
    `;
    return res.status(200).json({ customerEngagement: rows.reverse() });
  } catch (e) {
    console.error('Engagement analytics error:', e);
    return res.status(500).json({ error: 'Failed to fetch engagement analytics' });
  }
}

