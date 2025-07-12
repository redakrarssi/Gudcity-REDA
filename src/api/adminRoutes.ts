import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';

const router = Router();

// Basic admin routes - can be expanded later
router.get('/dashboard', auth, async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Admin dashboard endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;