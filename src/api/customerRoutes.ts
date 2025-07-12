import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';

const router = Router();

// Basic customer routes - can be expanded later
router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Customer profile endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;