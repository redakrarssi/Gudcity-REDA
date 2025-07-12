import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { validateBusinessId, validateUserId } from '../utils/sqlSafety';
import { Business, BusinessListItem, BusinessWithoutSensitiveData, UserRole } from '../types/business';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { logger } from '../utils/logger';
import sql from '../utils/db';
import { CustomerService } from '../services/customerService';
import { v4 as uuidv4 } from 'uuid';
// Import our dedicated handler for award-points
import { handleAwardPoints } from './awardPointsHandler';

const router = Router();

// Middleware for all routes in this file
router.use((req: Request, res: Response, next: NextFunction) => {
  // Add any middleware specific to business routes here
  next();
});

// IMPORTANT: Explicitly declare that the router accepts POST requests for award-points
router.post('/award-points', auth, async (req: Request, res: Response, next: NextFunction) => {
  console.log('🔍 BUSINESS ROUTES: POST /award-points ACCESSED');
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request URL:', req.originalUrl);
  console.log('🔍 Request path:', req.path);
  console.log('🔍 Base URL:', req.baseUrl);
  
  // Forward to the dedicated handler
  return handleAwardPoints(req, res);
});

// Make sure there's a GET handler for award-points to avoid any method confusion
router.get('/award-points', (req: Request, res: Response) => {
  return res.status(405).json({
    error: 'Method Not Allowed',
    message: 'GET method is not allowed for award-points endpoint, use POST instead',
    allowedMethods: ['POST']
  });
});

// Make sure all requests to award-points are caught
router.all('/award-points', (req: Request, res: Response) => {
  if (req.method === 'POST') {
    // This shouldn't happen, but just in case, forward to the POST handler
    console.log('⚠️ POST request caught by catch-all handler, forwarding...');
    return handleAwardPoints(req, res);
  }
  
  return res.status(405).json({
    error: 'Method Not Allowed',
    message: `${req.method} method is not allowed for award-points endpoint, use POST instead`,
    allowedMethods: ['POST']
  });
});

/**
 * Get business information by ID
 */
router.get('/businesses/:id', auth, async (req: Request, res: Response) => {
  try {
    const businessId = validateBusinessId(req.params.id);
    
    const businessResult = await sql<Business[]>`
      SELECT * FROM users
      WHERE id = ${businessId}
      AND user_type = 'business'
    `;
    
    if (!businessResult.length) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const business = businessResult[0];
    const { password_hash, ...businessWithoutPassword } = business;
    
    res.json(businessWithoutPassword as BusinessWithoutSensitiveData);
  } catch (error) {
    console.error('Error fetching business:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get customers enrolled in a business's programs
 */
interface BusinessEnrollmentResult {
  id: string;
  name: string;
}
router.get('/businesses/:id/enrolled-customers', auth, async (req: Request, res: Response) => {
  try {
    const { id: businessId } = req.params;
    const { programId } = req.query;
    
    if (!businessId || !programId) {
      return res.status(400).json({ error: 'Missing businessId or programId' });
    }
    
    const results = await sql<BusinessEnrollmentResult[]>`
      SELECT u.id, u.name
      FROM users u
      JOIN customer_enrollments ce ON u.id = ce.customer_id
      JOIN loyalty_programs lp ON ce.program_id = lp.id
      WHERE lp.business_id = ${businessId}
      AND u.user_type = 'customer'
      AND ce.program_id = ${programId as string}
    `;
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching enrolled customers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Endpoint to get all business for admin dashboard
 */
router.get('/businesses', auth, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const businesses = await sql<BusinessListItem[]>`
      SELECT id, name, email, created_at 
      FROM users 
      WHERE user_type = 'business'
    `;
    
    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * Get user roles
 */
router.get('/config/roles', auth, async (req: Request, res: Response) => {
  try {
    const roles = await sql<UserRole[]>`SELECT DISTINCT user_type FROM users`;
    res.json(roles.map(r => r.user_type));
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all businesses for config
 */
router.get('/config/businesses', auth, async (req: Request, res: Response) => {
  try {
    const businesses = await sql<Business[]>`SELECT id, name FROM users WHERE user_type = 'business'`;
    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 