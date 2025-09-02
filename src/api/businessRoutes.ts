import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { validateBusinessId, validateUserId } from '../utils/sqlSafety';
import { Business, BusinessListItem, BusinessWithoutSensitiveData, UserRole } from '../types/business';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { logger } from '../utils/logger';
import sql from '../utils/db';
import { CustomerService } from '../services/customerService';
import { LoyaltyProgramService } from '../services/loyaltyProgramService';
import { BusinessAnalyticsService } from '../services/businessAnalyticsService';
import { v4 as uuidv4 } from 'uuid';
// Import our dedicated handler for award-points
import { handleAwardPoints } from './awardPointsHandler';
// Import security utilities
import { filterBusinessData, createFilterOptionsFromRequest } from '../utils/dataFilter';
import { createSecureErrorResponse, isDevelopmentEnvironment } from '../utils/secureErrorResponse';

const router = Router();

// Middleware for all routes in this file
router.use((req: Request, res: Response, next: NextFunction) => {
  // Add any middleware specific to business routes here
  next();
});

// Admin-only guard for sensitive endpoints
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

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
    
    // Select only necessary fields, avoiding SELECT *
    const businessResult = await sql<Business[]>`
      SELECT id, name, email, business_name, business_phone, 
             user_type, status, created_at, updated_at, 
             avatar_url, description, address, phone, website
      FROM users
      WHERE id = ${businessId}
      AND user_type = 'business'
    `;
    
    if (!businessResult.length) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const business = businessResult[0];
    
    // Filter business data based on access permissions
    const filterOptions = createFilterOptionsFromRequest(req);
    const filteredBusiness = filterBusinessData(business, filterOptions);
    
    res.json(filteredBusiness);
  } catch (error) {
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    return res.status(statusCode).json(response);
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
    const { id: businessIdParam } = req.params;
    const { programId: programIdParam } = req.query;
    
    // SECURITY: Validate input parameters before using in SQL
    if (!businessIdParam || !programIdParam) {
      return res.status(400).json({ error: 'Missing businessId or programId' });
    }
    
    // SECURITY: Use proper validation instead of type assertion
    const businessId = validateBusinessId(businessIdParam);
    const programId = validateUserId(String(programIdParam)); // Validate program ID format
    
    const results = await sql<BusinessEnrollmentResult[]>`
      SELECT u.id, u.name
      FROM users u
      JOIN customer_enrollments ce ON u.id = ce.customer_id
      JOIN loyalty_programs lp ON ce.program_id = lp.id
      WHERE lp.business_id = ${businessId}
      AND u.user_type = 'customer'
      AND ce.program_id = ${programId}
    `;
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching enrolled customers:', error);
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    return res.status(statusCode).json(response);
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
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    return res.status(statusCode).json(response);
  }
});

/**
 * ADMIN: Aggregated businesses overview
 * Path: /api/businesses/admin/overview
 */
router.get('/admin/overview', auth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Build overview from users (business owners) merged with optional businesses table + analytics
    const rows = await sql<any[]>`
      SELECT 
        u.id                           AS user_id,
        u.name                         AS user_name,
        u.email                        AS user_email,
        u.created_at                   AS user_created_at,
        u.business_name                AS user_business_name,
        u.business_phone               AS user_business_phone,
        u.avatar_url                   AS user_avatar_url,
        b.id                           AS business_id,
        COALESCE(b.name, u.business_name, u.name)                         AS name,
        COALESCE(b.owner, u.name)                                         AS owner,
        b.type                                                             AS type,
        COALESCE(b.status, 'active')                                      AS status,
        COALESCE(b.address, bp.address, bs.address)                       AS address,
        COALESCE(bp.phone, bs.phone, u.business_phone)                    AS phone,
        b.logo                                                            AS logo,
        MAX(bdl.login_time)                                               AS last_login_time,
        COUNT(DISTINCT bt.id)                                             AS total_transactions,
        COALESCE(SUM(bt.amount), 0)                                       AS total_revenue,
        COUNT(DISTINCT bt.customer_id)                                     AS total_customers
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      LEFT JOIN business_profile bp ON bp.business_id = u.id
      LEFT JOIN business_settings bs ON bs.business_id = u.id
      LEFT JOIN business_transactions bt ON bt.business_id = b.id
      LEFT JOIN business_daily_logins bdl ON bdl.business_id = b.id
      WHERE u.user_type = 'business'
      GROUP BY 
        u.id, u.name, u.email, u.created_at, u.business_name, u.business_phone, u.avatar_url,
        b.id, b.name, b.owner, b.type, b.status, b.address, b.logo,
        bp.address, bs.address, bp.phone, bs.phone
      ORDER BY u.created_at DESC
    `;

    const data = rows.map(r => ({
      // Prefer businesses.id when present; fall back to users.id so UI can still open basic details
      id: r.business_id || r.user_id,
      name: r.name,
      email: r.user_email,
      type: r.type,
      status: r.status,
      address: r.address,
      logo: r.logo,
      registeredAt: r.user_created_at,
      customerCount: Number(r.total_customers || 0),
      revenue: Number(r.total_revenue || 0),
      lastLogin: r.last_login_time,
      phone: r.phone,
      owner: r.owner,
      userId: r.user_id,
    }));

    res.json({ businesses: data });
  } catch (error) {
    console.error('Error fetching admin businesses overview:', error);
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

/**
 * ADMIN: Detailed business info, including programs and stats
 * Path: /api/businesses/admin/:id/details
 */
router.get('/admin/:id/details', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessIdParam = req.params.id;

    // SECURITY: Validate and sanitize business ID input
    if (!businessIdParam) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const businessIdNumber = parseInt(businessIdParam);
    if (isNaN(businessIdNumber) || businessIdNumber <= 0) {
      return res.status(400).json({ error: 'Invalid business ID format' });
    }

    // Base profile info from businesses table
    const result = await sql<any[]>`
      SELECT 
        b.*,
        MAX(bdl.login_time) as last_login_time,
        COUNT(DISTINCT bt.customer_id) as total_customers,
        COALESCE(SUM(bt.amount), 0) as total_revenue
      FROM businesses b
      LEFT JOIN business_daily_logins bdl ON b.id = bdl.business_id
      LEFT JOIN business_transactions bt ON b.id = bt.business_id
      WHERE b.id = ${businessIdNumber}
      GROUP BY b.id
    `;

    if (!result.length) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const base = result[0];

    // Programs list
    const programs = await LoyaltyProgramService.getBusinessPrograms(String(businessIdNumber));

    // Analytics summary (total points and redemptions)
    const analytics = await BusinessAnalyticsService.getBusinessAnalytics(String(businessIdNumber), 'month');

    res.json({
      profile: {
        id: base.id,
        name: base.name,
        email: base.email,
        owner: base.owner,
        phone: base.phone,
        type: base.type,
        status: base.status,
        address: base.address,
        logo: base.logo,
        description: base.description,
        registeredAt: base.registered_at,
        lastLogin: base.last_login_time,
        customerCount: Number(base.total_customers || 0),
        revenue: Number(base.total_revenue || 0),
      },
      programs,
      stats: {
        totalPoints: analytics.totalPoints,
        totalRedemptions: analytics.totalRedemptions,
        totalPrograms: analytics.totalPrograms,
      }
    });
  } catch (error) {
    console.error('Error fetching business details:', error);
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

/**
 * ADMIN: Recent activity (last N login events)
 * Path: /api/businesses/admin/:id/activity?limit=5
 */
router.get('/admin/:id/activity', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessIdParam = req.params.id;
    const limitParam = req.query.limit;

    // SECURITY: Validate business ID input
    if (!businessIdParam) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const businessIdNumber = parseInt(businessIdParam);
    if (isNaN(businessIdNumber) || businessIdNumber <= 0) {
      return res.status(400).json({ error: 'Invalid business ID format' });
    }

    // SECURITY: Validate and sanitize limit parameter
    let limitNumber = 5; // Default value
    if (limitParam) {
      const parsedLimit = parseInt(String(limitParam));
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 50) {
        limitNumber = parsedLimit;
      }
    }

    const rows = await sql<any[]>`
      SELECT id, user_id, login_time, ip_address, device
      FROM business_daily_logins
      WHERE business_id = ${businessIdNumber}
      ORDER BY login_time DESC
      LIMIT ${limitNumber}
    `;

    res.json({ activity: rows });
  } catch (error) {
    console.error('Error fetching business activity:', error);
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

/**
 * ADMIN: Update business status (suspend, reactivate, restrict via status field)
 * Path: /api/businesses/admin/:id/status
 */
router.put('/admin/:id/status', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessIdParam = req.params.id;
    const { status } = req.body as { status?: string };

    // SECURITY: Validate business ID input
    if (!businessIdParam) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const businessIdNumber = parseInt(businessIdParam);
    if (isNaN(businessIdNumber) || businessIdNumber <= 0) {
      return res.status(400).json({ error: 'Invalid business ID format' });
    }

    // SECURITY: Validate status parameter with whitelist
    const validStatuses = ['active', 'inactive', 'suspended'] as const;
    if (!status || !validStatuses.includes(status as any)) {
      return res.status(400).json({ 
        error: 'Invalid status', 
        validStatuses 
      });
    }

    const updated = await sql<any[]>`
      UPDATE businesses SET status = ${status}, updated_at = NOW() WHERE id = ${businessIdNumber} RETURNING *
    `;
    if (!updated.length) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json({ success: true, business: updated[0] });
  } catch (error) {
    console.error('Error updating business status:', error);
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

/**
 * ADMIN: Delete business (hard delete with related cleanups where possible)
 * Path: /api/businesses/admin/:id
 */
router.delete('/admin/:id', auth, requireAdmin, async (req: Request, res: Response) => {
  const client = sql;
  try {
    const businessIdParam = req.params.id;

    // SECURITY: Validate business ID input
    if (!businessIdParam) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    const businessIdNumber = parseInt(businessIdParam);
    if (isNaN(businessIdNumber) || businessIdNumber <= 0) {
      return res.status(400).json({ error: 'Invalid business ID format' });
    }

    // Best-effort cleanup. Some FKs are ON DELETE CASCADE, others may not be.
    await client`DELETE FROM business_transactions WHERE business_id = ${businessIdNumber}`;
    await client`DELETE FROM business_daily_logins WHERE business_id = ${businessIdNumber}`;
    await client`DELETE FROM loyalty_programs WHERE business_id = ${businessIdNumber}`;
    const deleted = await client`DELETE FROM businesses WHERE id = ${businessIdNumber} RETURNING id`;

    if (!deleted.length) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting business:', error);
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
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
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

/**
 * Get all businesses for config
 */
router.get('/config/businesses', auth, async (req: Request, res: Response) => {
  try {
    // Select only public business information
    const businesses = await sql<Business[]>`
      SELECT id, name, business_name, status, created_at 
      FROM users 
      WHERE user_type = 'business' AND status = 'active'
    `;
    
    // Filter data for each business
    const filterOptions = createFilterOptionsFromRequest(req);
    const filteredBusinesses = businesses.map(business => 
      filterBusinessData(business, filterOptions)
    );
    
    res.json(filteredBusinesses);
  } catch (error) {
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

export default router; 