/**
 * Vercel Serverless API: Get User by ID
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(300, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const sql = requireSql();

  try {
    const { id } = req.query;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    // Get user from database (without password)
    const users = await sql`
      SELECT 
        id, email, name, user_type, role, status,
        created_at, last_login, phone, address,
        business_name, business_address, business_phone,
        tier, loyalty_points, total_spent
      FROM users 
      WHERE id = ${Number(id)}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data (password is not selected)
    return res.status(200).json({ user: users[0] });

  } catch (error) {
    console.error('Get user by ID error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }

  // Update (optional)
  try {
    if (req.method === 'PUT') {
      const { name, email, phone } = req.body || {};
      const { id } = req.query;
      if (!id || isNaN(Number(id))) return res.status(400).json({ error: 'Valid user ID is required' });
      await sql`UPDATE users SET 
        name = COALESCE(${name}, name),
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        updated_at = NOW()
        WHERE id = ${Number(id)}
      `;
      const rows = await sql`SELECT id, email, name, user_type, role, status, created_at, last_login, phone, address, business_name, business_address, business_phone, tier, loyalty_points, total_spent FROM users WHERE id = ${Number(id)} LIMIT 1`;
      return res.status(200).json({ user: rows?.[0] || null });
    }

  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}
