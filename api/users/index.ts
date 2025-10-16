import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(120, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const sql = requireSql();

  try {
    if (req.method === 'GET') {
      // Get all users (admin only)
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const users = await sql`
        SELECT id, name, email, role, user_type, business_name, business_phone, 
               avatar_url, business_owner_id, permissions, created_by, created_at, 
               last_login, status 
        FROM users 
        WHERE status != 'deleted'
        ORDER BY created_at DESC
      `;

      return res.status(200).json({ users });
    }

    if (req.method === 'POST') {
      // Create new user (admin only)
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { name, email, role, user_type, business_name, permissions } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required' });
      }

      // Check if user already exists
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existing.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const newUser = await sql`
        INSERT INTO users (name, email, role, user_type, business_name, permissions, created_by, created_at, status)
        VALUES (${name}, ${email}, ${role}, ${user_type || 'customer'}, ${business_name || null}, 
                ${JSON.stringify(permissions || {})}, ${user.id}, NOW(), 'active')
        RETURNING *
      `;

      return res.status(201).json({ user: newUser[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
