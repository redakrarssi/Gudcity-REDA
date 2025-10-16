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
    const { customerId, businessId } = req.query;

    if (req.method === 'GET') {
      // Get cards for a customer or business
      if (customerId) {
        // Verify access
        if (user.role !== 'admin' && user.id !== parseInt(String(customerId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const cards = await sql`
          SELECT 
            lc.id,
            lc.customer_id,
            lc.business_id,
            lc.program_id,
            lc.card_number,
            lc.card_type,
            lc.tier,
            lc.points,
            lc.points_balance,
            lc.total_points_earned,
            lc.status,
            lc.created_at,
            lc.updated_at,
            lc.qr_code_url,
            lp.name AS program_name,
            lp.description AS program_description,
            u.name AS business_name,
            u.email AS business_email
          FROM loyalty_cards lc
          JOIN loyalty_programs lp ON lp.id = lc.program_id
          JOIN users u ON u.id = lc.business_id
          WHERE lc.customer_id = ${parseInt(String(customerId))}
            AND lc.status = 'ACTIVE'
          ORDER BY lc.created_at DESC
        `;

        return res.status(200).json({ cards });
      }

      if (businessId) {
        // Verify access to business data
        if (user.role !== 'admin' && user.id !== parseInt(String(businessId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const cards = await sql`
          SELECT 
            lc.*,
            u.name as customer_name,
            u.email as customer_email,
            lp.name as program_name
          FROM loyalty_cards lc
          JOIN users u ON u.id = lc.customer_id
          JOIN loyalty_programs lp ON lp.id = lc.program_id
          WHERE lc.business_id = ${parseInt(String(businessId))}
            AND lc.status = 'ACTIVE'
          ORDER BY lc.created_at DESC
        `;

        return res.status(200).json({ cards });
      }

      return res.status(400).json({ error: 'customerId or businessId required' });
    }

    if (req.method === 'POST') {
      // Award points to a card
      const { cardId, points, description, source } = req.body;

      if (!cardId || !points || points <= 0) {
        return res.status(400).json({ error: 'Valid cardId and positive points required' });
      }

      // Get card details and verify access
      const cardResult = await sql`
        SELECT lc.*, lp.business_id 
        FROM loyalty_cards lc 
        JOIN loyalty_programs lp ON lp.id = lc.program_id 
        WHERE lc.id = ${parseInt(cardId)}
      `;

      if (cardResult.length === 0) {
        return res.status(404).json({ error: 'Card not found' });
      }

      const card = cardResult[0];
      
      if (user.role !== 'admin' && user.id !== card.business_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Award points using database function
      const result = await sql`
        SELECT award_points_to_card(
          ${parseInt(cardId)},
          ${parseInt(points)},
          ${source || 'API'},
          ${description || 'Points awarded via API'},
          ${`api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
        ) as success
      `;

      if (result[0]?.success) {
        // Get updated card details
        const updatedCard = await sql`
          SELECT * FROM loyalty_cards WHERE id = ${parseInt(cardId)}
        `;

        // Log activity
        await sql`
          INSERT INTO card_activities (
            card_id, activity_type, points, description, created_at
          ) VALUES (
            ${parseInt(cardId)}, 'POINTS_AWARDED', ${parseInt(points)}, 
            ${description || 'Points awarded via API'}, NOW()
          )
        `;

        return res.status(200).json({ 
          success: true, 
          card: updatedCard[0],
          message: `${points} points awarded successfully` 
        });
      } else {
        return res.status(500).json({ error: 'Failed to award points' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Loyalty cards API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
