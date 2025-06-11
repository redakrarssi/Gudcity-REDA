import { Router, Request, Response } from 'express';
import sql, { SqlRow } from '../utils/db';
import { auth } from '../middleware/auth';
import { validateBusinessId, validateUserId } from '../utils/sqlSafety';
import { Business, BusinessListItem, BusinessWithoutSensitiveData, UserRole } from '../types/business';

const router = Router();

/**
 * Get business information by ID
 */
router.get('/businesses/:id', auth, async (req: Request, res: Response) => {
  try {
    // Validate and sanitize the business ID
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
    
    // Remove sensitive information
    const { password, ...businessWithoutPassword } = business;
    
    res.json(businessWithoutPassword as BusinessWithoutSensitiveData);
  } catch (error) {
    console.error('Error fetching business:', error);
    
    // Handle validation errors with a 400 response
    if (error instanceof Error && error.message.includes('Invalid business ID')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to fetch business information' });
  }
});

/**
 * Get default businesses for auto-enrollment in loyalty programs
 */
router.get('/businesses/default-for-enrollment', async (req: Request, res: Response) => {
  try {
    // Query for businesses with active loyalty programs
    interface BusinessEnrollmentResult {
      id: number | string;
      name: string;
      business_name?: string;
    }
    
    const businesses = await sql<BusinessEnrollmentResult[]>`
      SELECT DISTINCT u.id, u.name, u.business_name 
      FROM users u
      JOIN loyalty_programs lp ON u.id::text = lp.business_id
      WHERE u.user_type = 'business'
      AND u.status = 'active'
      AND lp.status = 'ACTIVE'
      LIMIT 5 -- Limit to 5 businesses for initial enrollment
    `;
    
    // Format the response
    const formattedBusinesses: BusinessListItem[] = businesses.map((business) => ({
      id: business.id.toString(),
      name: business.business_name || business.name || 'Unknown Business'
    }));
    
    res.json(formattedBusinesses);
  } catch (error) {
    console.error('Error fetching default businesses for enrollment:', error);
    res.status(500).json({ error: 'Failed to fetch default businesses' });
  }
});

/**
 * Get all businesses (admin only)
 */
router.get('/businesses', auth, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const userId = validateUserId(req.user?.id);
    
    const userCheck = await sql<UserRole[]>`
      SELECT role FROM users
      WHERE id = ${userId}
    `;
    
    if (!userCheck.length || userCheck[0].role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    const businesses = await sql<Business[]>`
      SELECT * FROM users
      WHERE user_type = 'business'
    `;
    
    // Remove sensitive information
    const sanitizedBusinesses: BusinessWithoutSensitiveData[] = businesses.map((business) => {
      const { password, ...rest } = business;
      return rest as BusinessWithoutSensitiveData;
    });
    
    res.json(sanitizedBusinesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    
    // Handle validation errors with a 400 response
    if (error instanceof Error && (error.message.includes('Invalid user ID') || error.message.includes('required'))) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

export default router; 