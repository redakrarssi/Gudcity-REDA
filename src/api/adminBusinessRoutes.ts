import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import sql from '../utils/db';
import { LoyaltyProgramService } from '../services/loyaltyProgramService';
import { BusinessAnalyticsService } from '../services/businessAnalyticsService';

const router = Router();

// Admin-only guard for sensitive endpoints
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

/**
 * Get comprehensive business data for admin panel
 * Path: /api/admin/businesses
 */
router.get('/businesses', auth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Build comprehensive business overview with all required fields
    const rows = await sql<any[]>`
      WITH business_programs AS (
        SELECT 
          lp.business_id,
          COUNT(DISTINCT lp.id) as program_count,
          json_agg(json_build_object(
            'id', lp.id,
            'name', lp.name,
            'status', lp.status,
            'created_at', lp.created_at
          )) as programs
        FROM loyalty_programs lp
        GROUP BY lp.business_id
      ),
      business_customers AS (
        SELECT 
          cpe.business_id,
          COUNT(DISTINCT cpe.customer_id) as customer_count,
          COUNT(DISTINCT cpe.program_id) as enrolled_program_count
        FROM customer_program_enrollments cpe
        GROUP BY cpe.business_id
      ),
      business_promotions AS (
        SELECT 
          pc.business_id,
          COUNT(DISTINCT pc.id) as promotion_count,
          json_agg(json_build_object(
            'id', pc.id,
            'code', pc.code,
            'description', pc.description,
            'start_date', pc.start_date,
            'end_date', pc.end_date,
            'status', pc.status
          )) as promotions
        FROM promo_codes pc
        GROUP BY pc.business_id
      )
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.created_at AS user_created_at,
        u.business_name AS user_business_name,
        u.business_phone AS user_business_phone,
        u.avatar_url AS user_avatar_url,
        u.status AS user_status,
        b.id AS business_id,
        COALESCE(b.name, u.business_name, u.name) AS name,
        COALESCE(b.owner, u.name) AS owner,
        b.type,
        COALESCE(b.status, u.status, 'active') AS status,
        COALESCE(b.address, bp.address, bs.address) AS address,
        COALESCE(bp.phone, bs.phone, u.business_phone) AS phone,
        b.logo,
        COALESCE(bp.currency, 'USD') AS currency,
        MAX(bdl.login_time) AS last_login_time,
        
        -- Business metrics
        COALESCE(bprogs.program_count, 0) AS program_count,
        COALESCE(bcust.customer_count, 0) AS customer_count,
        COALESCE(bpromo.promotion_count, 0) AS promotion_count,
        COUNT(DISTINCT bt.id) AS total_transactions,
        COALESCE(SUM(bt.amount), 0) AS total_revenue,
        
        -- Programs and promotions
        bprogs.programs AS programs_data,
        bpromo.promotions AS promotions_data,
        
        -- Recent activity
        (SELECT json_agg(json_build_object(
          'id', bd.id,
          'login_time', bd.login_time,
          'ip_address', bd.ip_address,
          'device', bd.device
        ))
        FROM business_daily_logins bd
        WHERE bd.business_id = b.id
        ORDER BY bd.login_time DESC
        LIMIT 5) AS recent_logins
        
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      LEFT JOIN business_profile bp ON bp.business_id = u.id
      LEFT JOIN business_settings bs ON bs.business_id = u.id
      LEFT JOIN business_transactions bt ON bt.business_id = b.id
      LEFT JOIN business_daily_logins bdl ON bdl.business_id = b.id
      LEFT JOIN business_programs bprogs ON bprogs.business_id = b.id
      LEFT JOIN business_customers bcust ON bcust.business_id = b.id
      LEFT JOIN business_promotions bpromo ON bpromo.business_id = b.id
      WHERE u.user_type = 'business'
      GROUP BY 
        u.id, u.name, u.email, u.created_at, u.business_name, u.business_phone, u.avatar_url, u.status,
        b.id, b.name, b.owner, b.type, b.status, b.address, b.logo, bp.address, bs.address, 
        bp.phone, bs.phone, bp.currency, bprogs.program_count, bcust.customer_count, 
        bpromo.promotion_count, bprogs.programs, bpromo.promotions
      ORDER BY COALESCE(u.created_at, NOW()) DESC
    `;

    // Transform data for client consumption
    const data = rows.map(r => ({
      id: r.business_id || r.user_id,
      userId: r.user_id,
      name: r.name,
      owner: r.owner,
      email: r.user_email,
      type: r.type || 'General',
      status: r.status,
      address: r.address || 'No address provided',
      phone: r.phone || 'No phone provided',
      logo: r.logo,
      currency: r.currency,
      registeredAt: r.user_created_at,
      lastLogin: r.last_login_time,
      
      // Metrics
      programCount: Number(r.program_count || 0),
      customerCount: Number(r.customer_count || 0), 
      promotionCount: Number(r.promotion_count || 0),
      transactionCount: Number(r.total_transactions || 0),
      revenue: Number(r.total_revenue || 0),
      
      // Nested data
      programs: r.programs_data || [],
      promotions: r.promotions_data || [],
      recentLogins: r.recent_logins || [],
      
      // Calculate time registered in a client-friendly format
      // (This will be formatted on the client for more accurate display)
      registrationDuration: {
        timestamp: r.user_created_at,
        // Client will calculate days, months, years from this timestamp
      }
    }));

    res.setHeader('Access-Control-Allow-Origin', _req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.json({ businesses: data });
  } catch (error) {
    console.error('Error fetching admin businesses comprehensive data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get detailed business timeline events
 * Path: /api/admin/businesses/:id/timeline
 */
router.get('/businesses/:id/timeline', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessId = req.params.id;
    
    // Get base business info
    const businessResult = await sql<any[]>`
      SELECT 
        COALESCE(b.id, u.id) as id,
        COALESCE(b.name, u.business_name, u.name) as name,
        u.created_at as registered_at
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE (u.id = ${businessId} OR b.id = ${businessId}) AND u.user_type = 'business'
      LIMIT 1
    `;

    if (!businessResult.length) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessResult[0];
    
    // Gather timeline events from multiple sources and combine them
    const [programEvents, transactionEvents, loginEvents, promotionEvents] = await Promise.all([
      // Program creation events
      sql<any[]>`
        SELECT
          id,
          'PROGRAM_CREATED' as event_type,
          name as title,
          'New loyalty program created' as description,
          created_at as event_date
        FROM loyalty_programs
        WHERE business_id = ${businessId}
        ORDER BY created_at DESC
      `,
      
      // Transaction events (grouped by day for simplicity)
      sql<any[]>`
        SELECT
          DATE(transaction_date) as id,
          'TRANSACTIONS' as event_type,
          CONCAT('Processed ', COUNT(*), ' transactions') as title,
          CONCAT('Total revenue: ', SUM(amount), ' ', 'USD') as description,
          DATE(transaction_date) as event_date,
          COUNT(*) as transaction_count,
          SUM(amount) as daily_revenue
        FROM business_transactions
        WHERE business_id = ${businessId}
        GROUP BY DATE(transaction_date)
        ORDER BY DATE(transaction_date) DESC
        LIMIT 30
      `,
      
      // Login events
      sql<any[]>`
        SELECT
          id,
          'LOGIN' as event_type,
          'Business login' as title,
          CONCAT('Login from ', COALESCE(device, ip_address, 'unknown device')) as description,
          login_time as event_date
        FROM business_daily_logins
        WHERE business_id = ${businessId}
        ORDER BY login_time DESC
        LIMIT 20
      `,
      
      // Promotion events
      sql<any[]>`
        SELECT
          id,
          'PROMOTION_CREATED' as event_type,
          CONCAT('Promotion created: ', code) as title,
          description,
          created_at as event_date
        FROM promo_codes
        WHERE business_id = ${businessId}
        ORDER BY created_at DESC
      `
    ]);
    
    // Combine all events and sort by date
    const allEvents = [
      ...programEvents.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date})),
      ...transactionEvents.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date})),
      ...loginEvents.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date})),
      ...promotionEvents.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date}))
    ].sort((a, b) => {
      return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
    });
    
    // Add business registration as the first event
    const timelineEvents = [
      {
        id: 'registration',
        eventType: 'REGISTRATION',
        title: 'Business Registration',
        description: `${business.name} registered on the platform`,
        eventDate: business.registered_at
      },
      ...allEvents
    ];

    res.json({
      businessId: business.id,
      businessName: business.name,
      registeredAt: business.registered_at,
      events: timelineEvents
    });
  } catch (error) {
    console.error('Error fetching business timeline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get business analytics data (revenue, customers, program usage)
 * Path: /api/admin/businesses/:id/analytics
 */
router.get('/businesses/:id/analytics', auth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const businessId = req.params.id;
    
    // Get analytics data directly from the service
    const analyticsData = await BusinessAnalyticsService.getBusinessAnalytics(
      businessId,
      'month'
    );
    
    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching business analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
