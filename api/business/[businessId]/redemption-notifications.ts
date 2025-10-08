import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../../_lib/db';
import { verifyAuth, verifyBusinessAccess, cors, rateLimitFactory } from '../../_lib/auth';

const allow = rateLimitFactory(180, 60_000);

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
    await sql`CREATE TABLE IF NOT EXISTS redemption_notifications (
      id SERIAL PRIMARY KEY,
      customer_id VARCHAR(255) NOT NULL,
      business_id VARCHAR(255) NOT NULL,
      program_id VARCHAR(255) NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      reward TEXT NOT NULL,
      reward_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'PENDING',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`;

    const rows = await sql`
      SELECT 
        rn.id,
        rn.customer_id,
        rn.business_id,
        rn.program_id,
        rn.points,
        rn.reward,
        rn.reward_id,
        rn.status,
        rn.is_read,
        rn.created_at AS timestamp
      FROM redemption_notifications rn
      WHERE rn.business_id = ${String(businessId)}
      ORDER BY rn.created_at DESC
      LIMIT 50
    `;

    res.status(200).json({ notifications: rows });
  } catch (e) {
    console.error('Redemption notifications error:', e);
    res.status(500).json({ error: 'Failed to fetch redemption notifications' });
  }
}

