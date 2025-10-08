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
    // Enrollment-related notifications delivered to business
    const rows = await sql`
      SELECT 
        cn.id,
        cn.type,
        cn.title,
        cn.message,
        cn.customer_id,
        cn.business_id,
        cn.reference_id,
        cn.data,
        cn.created_at
      FROM customer_notifications cn
      WHERE cn.business_id = ${Number(businessId)}
        AND cn.type IN ('ENROLLMENT_ACCEPTED','ENROLLMENT_REJECTED','NEW_ENROLLMENT','ENROLLMENT_REQUEST')
      ORDER BY cn.created_at DESC
      LIMIT 50
    `;
    res.status(200).json({ notifications: rows });
  } catch (e) {
    console.error('Business notifications error:', e);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

