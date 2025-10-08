import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(300, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(200).json({ ok: true, skipped: true });

  try {
    const sql = requireSql();
    const { event, resourceId, metadata } = req.body || {};
    await sql`
      INSERT INTO security_audit_logs (action_type, resource_id, user_id, details, timestamp)
      VALUES (${String(event || 'UNKNOWN')}, ${String(resourceId || 'client')}, ${String(user.id)}, ${JSON.stringify(metadata || {})}, NOW())
    `;
    res.status(200).json({ ok: true });
  } catch (e) {
    console.warn('Security audit log failed (non-blocking):', e);
    res.status(200).json({ ok: true, logged: false });
  }
}

