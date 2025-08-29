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
import { PromoService } from '../services/promoService';
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
 * ADMIN: Aggregated businesses overview
 * Path: /api/businesses/admin/overview
 */
router.get('/admin/overview', auth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Base on users table to include ALL registered business accounts (even if no row in businesses table)
    const rows = await sql<any[]>`
      SELECT 
        u.id,
        COALESCE(b2.name, u.name) AS name,
        u.email,
        COALESCE(b2.type, NULL) AS type,
        COALESCE(b2.status, u.status) AS status,
        COALESCE(b2.address, u.address) AS address,
        COALESCE(b2.phone, u.phone) AS phone,
        COALESCE(b2.logo, NULL) AS logo,
        u.created_at as registered_at,
        COUNT(DISTINCT bt.id) as total_transactions,
        COALESCE(SUM(bt.amount), 0) as total_revenue,
        COUNT(DISTINCT bt.customer_id) as total_customers,
        MAX(bdl.login_time) as last_login_time,
        MAX(bs.currency) as currency
      FROM 
        users u
      LEFT JOIN businesses b2 ON b2.id = u.id
      LEFT JOIN business_transactions bt ON u.id = bt.business_id
      LEFT JOIN business_daily_logins bdl ON u.id = bdl.business_id
      LEFT JOIN business_settings bs ON u.id = bs.business_id
      WHERE u.user_type = 'business'
      GROUP BY u.id, u.name, u.email, u.status, u.address, u.phone, u.created_at
      ORDER BY u.created_at DESC
    `;

    const data = rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      type: r.type,
      status: r.status,
      address: r.address,
      phone: r.phone,
      logo: r.logo,
      registeredAt: r.registered_at,
      customerCount: Number(r.total_customers || 0),
      revenue: Number(r.total_revenue || 0),
      lastLogin: r.last_login_time,
      currency: r.currency || 'USD',
    }));

    res.json({ businesses: data });
  } catch (error) {
    console.error('Error fetching admin businesses overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ADMIN: Detailed business info, including programs and stats
 * Path: /api/businesses/admin/:id/details
 */
router.get('/admin/:id/details', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessId = req.params.id;

    // Base profile info from users (include all businesses), merging optional businesses/settings data
    const result = await sql<any[]>`
      SELECT 
        u.id,
        COALESCE(b2.name, u.name) AS name,
        u.email,
        COALESCE(b2.owner, NULL) AS owner,
        COALESCE(b2.phone, u.phone) AS phone,
        COALESCE(b2.type, NULL) AS type,
        COALESCE(b2.status, u.status) AS status,
        COALESCE(b2.address, u.address) AS address,
        COALESCE(b2.logo, NULL) AS logo,
        COALESCE(b2.description, NULL) AS description,
        u.created_at as registered_at,
        MAX(bdl.login_time) as last_login_time,
        COUNT(DISTINCT bt.customer_id) as total_customers,
        COALESCE(SUM(bt.amount), 0) as total_revenue,
        MAX(bs.currency) as currency
      FROM users u
      LEFT JOIN businesses b2 ON b2.id = u.id
      LEFT JOIN business_daily_logins bdl ON u.id = bdl.business_id
      LEFT JOIN business_transactions bt ON u.id = bt.business_id
      LEFT JOIN business_settings bs ON u.id = bs.business_id
      WHERE u.id = ${parseInt(businessId)} AND u.user_type = 'business'
      GROUP BY u.id, u.name, u.email, u.status, u.address, u.phone, u.created_at
    `;

    if (!result.length) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const base = result[0];

    // Programs list
    const programs = await LoyaltyProgramService.getBusinessPrograms(String(businessId));

    // Customers list
    const customers = await CustomerService.getBusinessCustomers(String(businessId));

    // Promotions list
    const promotions = await PromoService.getBusinessPromotions(String(businessId));

    // Analytics summary (total points and redemptions)
    const analytics = await BusinessAnalyticsService.getBusinessAnalytics(String(businessId), 'month');

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
        currency: base.currency || 'USD',
      },
      programs,
      customers,
      promotions,
      stats: {
        totalPoints: analytics.totalPoints,
        totalRedemptions: analytics.totalRedemptions,
        totalPrograms: analytics.totalPrograms,
      }
    });
  } catch (error) {
    console.error('Error fetching business details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ADMIN: Business timeline - programs created, customers added, promotions launched
 * Path: /api/businesses/admin/:id/timeline
 */
router.get('/admin/:id/timeline', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessId = parseInt(req.params.id);
    if (isNaN(businessId)) {
      return res.status(400).json({ error: 'Invalid business id' });
    }

    // Business registration event (prefer businesses, fallback to users)
    const regRows = await sql<any[]>`
      SELECT 
        u.id,
        COALESCE(b2.name, u.name) AS name,
        u.created_at
      FROM users u
      LEFT JOIN businesses b2 ON b2.id = u.id
      WHERE u.id = ${businessId} AND u.user_type = 'business'
    `;
    const registrationEvent = regRows.length ? [{
      type: 'business_registered' as const,
      title: `Business registered: ${regRows[0].name}`,
      referenceId: regRows[0].id,
      timestamp: regRows[0].created_at
    }] : [];

    // Programs created
    const programRows = await sql<any[]>`
      SELECT id, name, created_at FROM loyalty_programs WHERE business_id = ${businessId}
      ORDER BY created_at ASC
    `;
    const programEvents = programRows.map(p => ({
      type: 'program_created' as const,
      title: `Program created: ${p.name}`,
      referenceId: p.id,
      timestamp: p.created_at
    }));

    // Customers added (association and program joins)
    const customerInteractionRows = await sql<any[]>`
      SELECT id, customer_id, type, happened_at
      FROM customer_interactions
      WHERE business_id = ${businessId}
        AND type IN ('ASSOCIATION', 'PROGRAM_JOIN')
      ORDER BY happened_at ASC
    `;
    const customerEvents = customerInteractionRows.map(ci => ({
      type: 'customer_added' as const,
      title: ci.type === 'ASSOCIATION' ? `Customer associated (ID: ${ci.customer_id})` : `Customer joined program (ID: ${ci.customer_id})`,
      referenceId: ci.customer_id,
      timestamp: ci.happened_at
    }));

    // Promotions launched
    const promotionRows = await sql<any[]>`
      SELECT id, name, code, created_at FROM promotions WHERE business_id = ${businessId}
      ORDER BY created_at ASC
    `;
    const promotionEvents = promotionRows.map(pr => ({
      type: 'promotion_launched' as const,
      title: `Promotion launched: ${pr.name || pr.code}`,
      referenceId: pr.id,
      timestamp: pr.created_at
    }));

    const timeline = [...registrationEvent, ...programEvents, ...customerEvents, ...promotionEvents]
      .filter(e => e && e.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({ timeline });
  } catch (error) {
    console.error('Error fetching business timeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ADMIN: Recent activity (last N login events)
 * Path: /api/businesses/admin/:id/activity?limit=5
 */
router.get('/admin/:id/activity', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessId = parseInt(req.params.id);
    const limit = Math.min(parseInt(String(req.query.limit || '5')), 50);

    const rows = await sql<any[]>`
      SELECT id, user_id, login_time, ip_address, device
      FROM business_daily_logins
      WHERE business_id = ${businessId}
      ORDER BY login_time DESC
      LIMIT ${limit}
    `;

    res.json({ activity: rows });
  } catch (error) {
    console.error('Error fetching business activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ADMIN: Update business status (suspend, reactivate, restrict via status field)
 * Path: /api/businesses/admin/:id/status
 */
router.put('/admin/:id/status', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessId = parseInt(req.params.id);
    const { status } = req.body as { status?: string };
    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await sql<any[]>`
      UPDATE businesses SET status = ${status}, updated_at = NOW() WHERE id = ${businessId} RETURNING *
    `;
    if (!updated.length) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json({ success: true, business: updated[0] });
  } catch (error) {
    console.error('Error updating business status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * ADMIN: Delete business (hard delete with related cleanups where possible)
 * Path: /api/businesses/admin/:id
 */
router.delete('/admin/:id', auth, requireAdmin, async (req: Request, res: Response) => {
  const client = sql;
  try {
    const businessId = parseInt(req.params.id);

    // Best-effort cleanup. Some FKs are ON DELETE CASCADE, others may not be.
    await client`DELETE FROM business_transactions WHERE business_id = ${businessId}`;
    await client`DELETE FROM business_daily_logins WHERE business_id = ${businessId}`;
    await client`DELETE FROM loyalty_programs WHERE business_id = ${businessId}`;
    const deleted = await client`DELETE FROM businesses WHERE id = ${businessId} RETURNING id`;

    if (!deleted.length) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ error: 'Internal server error' });
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