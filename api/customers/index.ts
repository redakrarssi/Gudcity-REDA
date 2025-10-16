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
    const { businessId, programId } = req.query;

    if (req.method === 'GET') {
      // Get customers for a business
      if (businessId) {
        if (user.role !== 'admin' && user.id !== parseInt(String(businessId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const customers = await sql`
          SELECT DISTINCT 
            u.id, u.name, u.email, u.phone, u.created_at,
            COUNT(lc.id) as total_cards,
            SUM(lc.points) as total_points,
            MAX(lc.created_at) as last_activity
          FROM users u
          JOIN loyalty_cards lc ON u.id = lc.customer_id
          WHERE lc.business_id = ${parseInt(String(businessId))} 
            AND lc.status = 'ACTIVE'
            AND u.user_type = 'customer'
          GROUP BY u.id, u.name, u.email, u.phone, u.created_at
          ORDER BY last_activity DESC
        `;

        return res.status(200).json({ customers });
      }

      // Get all customers (admin only)
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const customers = await sql`
        SELECT id, name, email, phone, created_at, last_login, status
        FROM users 
        WHERE user_type = 'customer' AND status != 'deleted'
        ORDER BY created_at DESC
      `;

      return res.status(200).json({ customers });
    }

    if (req.method === 'POST') {
      // Create new customer or enroll existing customer
      const { customerId, action } = req.body;

      if (action === 'enroll' && businessId && programId && customerId) {
        // Enroll customer in program
        if (user.role !== 'admin' && user.id !== parseInt(String(businessId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Check if customer already enrolled
        const existing = await sql`
          SELECT id FROM loyalty_cards 
          WHERE customer_id = ${parseInt(customerId)} 
            AND program_id = ${parseInt(String(programId))}
            AND business_id = ${parseInt(String(businessId))}
        `;

        if (existing.length > 0) {
          return res.status(400).json({ error: 'Customer already enrolled in this program' });
        }

        // Create loyalty card
        const cardNumber = `GC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const newCard = await sql`
          INSERT INTO loyalty_cards (
            customer_id, business_id, program_id, card_number,
            status, card_type, points, tier, points_multiplier, is_active, created_at, updated_at
          ) VALUES (
            ${parseInt(customerId)}, ${parseInt(String(businessId))}, ${parseInt(String(programId))},
            ${cardNumber}, 'ACTIVE', 'STANDARD', 0, 'STANDARD', 1.0, TRUE, NOW(), NOW()
          )
          RETURNING *
        `;

        // Also add to program_enrollments
        await sql`
          INSERT INTO program_enrollments (customer_id, program_id, status, current_points, enrolled_at)
          VALUES (${parseInt(customerId)}, ${parseInt(String(programId))}, 'ACTIVE', 0, NOW())
          ON CONFLICT (customer_id, program_id) 
          DO UPDATE SET status = 'ACTIVE', enrolled_at = NOW()
        `;

        return res.status(201).json({ card: newCard[0], message: 'Customer enrolled successfully' });
      }

      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Customers API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
