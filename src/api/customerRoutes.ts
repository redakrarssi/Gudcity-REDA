import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import sql from '../utils/db';

const router = Router();

// Get customer profile
router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await sql<any[]>`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE id = ${req.user.id}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = rows[0];
    return res.json({
      id: Number(customer.id),
      name: String(customer.name || ''),
      email: String(customer.email || ''),
      role: String(customer.role || 'customer'),
      created_at: customer.created_at
    });
  } catch (error) {
    console.error('Error getting customer profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer loyalty cards
router.get('/loyalty-cards', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await sql<any[]>`
      SELECT lc.id, lc.card_number, lc.points, lc.enrolled_at,
             lp.name as program_name, lp.description as program_description,
             b.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN businesses b ON lc.business_id = b.id
      WHERE lc.customer_id = ${req.user.id}
      ORDER BY lc.enrolled_at DESC
    `;

    return res.json(rows.map(card => ({
      id: Number(card.id),
      card_number: String(card.card_number),
      points: Number(card.points || 0),
      enrolled_at: card.enrolled_at,
      program_name: String(card.program_name),
      program_description: String(card.program_description || ''),
      business_name: String(card.business_name)
    })));
  } catch (error) {
    console.error('Error getting loyalty cards:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;