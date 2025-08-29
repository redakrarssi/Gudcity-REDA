import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import sql from '../utils/db';

const router = Router();

// Middleware to check if user is admin
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await sql<any[]>`
      SELECT role FROM users WHERE id = ${req.user.id} LIMIT 1
    `;

    if (!rows.length || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get system statistics
router.get('/stats', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [userCount, businessCount, programCount, cardCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM users`,
      sql`SELECT COUNT(*) as count FROM businesses`,
      sql`SELECT COUNT(*) as count FROM loyalty_programs`,
      sql`SELECT COUNT(*) as count FROM loyalty_cards`
    ]);

    return res.json({
      users: Number(userCount[0]?.count || 0),
      businesses: Number(businessCount[0]?.count || 0),
      programs: Number(programCount[0]?.count || 0),
      loyalty_cards: Number(cardCount[0]?.count || 0)
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin only)
router.get('/users', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await sql<any[]>`
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return res.json(rows.map(user => ({
      id: Number(user.id),
      name: String(user.name || ''),
      email: String(user.email || ''),
      role: String(user.role || 'user'),
      created_at: user.created_at,
      updated_at: user.updated_at
    })));
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all businesses (admin only)
router.get('/businesses', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await sql<any[]>`
      SELECT id, name, email, description, created_at, updated_at
      FROM businesses
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return res.json(rows.map(business => ({
      id: Number(business.id),
      name: String(business.name || ''),
      email: String(business.email || ''),
      description: String(business.description || ''),
      created_at: business.created_at,
      updated_at: business.updated_at
    })));
  } catch (error) {
    console.error('Error getting businesses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;