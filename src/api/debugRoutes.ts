import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { getRecentEnrollmentErrors, clearEnrollmentErrors } from '../utils/enrollmentErrorReporter';

const router = Router();

/**
 * Get recent enrollment errors for debugging
 * Protected by admin auth
 */
router.get('/debug/enrollment-errors', auth, (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    const errors = getRecentEnrollmentErrors();
    res.json({ errors });
  } catch (error) {
    console.error('Error fetching enrollment errors:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment errors' });
  }
});

/**
 * Clear enrollment errors
 * Protected by admin auth
 */
router.post('/debug/clear-enrollment-errors', auth, (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    clearEnrollmentErrors();
    res.json({ success: true, message: 'Enrollment errors cleared' });
  } catch (error) {
    console.error('Error clearing enrollment errors:', error);
    res.status(500).json({ error: 'Failed to clear enrollment errors' });
  }
});

export default router; 