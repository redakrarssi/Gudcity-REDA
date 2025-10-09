import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../../_lib/auth.js';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { customerId } = req.query as { customerId: string };
  if (!customerId || isNaN(Number(customerId))) {
    return res.status(400).json({ error: 'Valid customerId required' });
  }

  // Verify user can access this customer data (either same user or business owner)
  if (user.id !== Number(customerId) && user.role !== 'admin' && user.role !== 'business') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const sql = requireSql();

  try {
    if (req.method === 'GET') {
      // Get customer's loyalty cards
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
        WHERE lc.customer_id = ${Number(customerId)}
          AND lc.status = 'ACTIVE'
        ORDER BY lc.created_at DESC
      `;

      // Get recent activities for each card
      const cardActivities = await sql`
        SELECT 
          ca.card_id,
          ca.activity_type,
          ca.points,
          ca.description,
          ca.created_at
        FROM card_activities ca
        JOIN loyalty_cards lc ON lc.id = ca.card_id
        WHERE lc.customer_id = ${Number(customerId)}
        ORDER BY ca.created_at DESC
        LIMIT 50
      `;

      // Group activities by card
      const activitiesByCard = cardActivities.reduce((acc: any, activity: any) => {
        if (!acc[activity.card_id]) acc[activity.card_id] = [];
        acc[activity.card_id].push(activity);
        return acc;
      }, {});

      // Add activities to cards
      const cardsWithActivities = cards.map((card: any) => ({
        ...card,
        recentActivities: activitiesByCard[card.id] || []
      }));

      return res.status(200).json({ cards: cardsWithActivities });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Customer cards error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
