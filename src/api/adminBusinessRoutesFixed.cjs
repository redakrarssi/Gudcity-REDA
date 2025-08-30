// Fixed Admin Business Routes implementation
const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/authFixed.cjs');
const sql = require('../utils/dbFix.cjs');

/**
 * Get comprehensive business data for admin panel
 * Path: /api/admin/businesses
 */
router.get('/businesses', auth, requireAdmin, async (_req, res) => {
  try {
    // Simplified query that works with existing schema
    const result = await sql.query(`
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
        COALESCE(b.address, 'No address provided') AS address,
        COALESCE(u.business_phone, 'No phone provided') AS phone,
        b.logo,
        'USD' AS currency,
        
        -- Business metrics
        (SELECT COUNT(*) FROM loyalty_programs WHERE business_id = b.id) AS program_count,
        (SELECT COUNT(DISTINCT customer_id) FROM program_enrollments pe 
         JOIN loyalty_programs lp ON pe.program_id = lp.id 
         WHERE lp.business_id = b.id) AS customer_count,
        0 AS promotion_count,
        0 AS total_transactions,
        0 AS total_revenue,
        
        -- Programs data
        (SELECT json_agg(
          json_build_object(
            'id', lp.id,
            'name', lp.name,
            'status', lp.status,
            'created_at', lp.created_at
          )
        ) FROM loyalty_programs lp WHERE lp.business_id = b.id) AS programs_data,
        
        '[]'::json AS promotions_data,
        '[]'::json AS recent_logins
        
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE u.user_type = 'business'
      ORDER BY u.created_at DESC
    `);
    
    // Transform data for client consumption
    const businesses = result.rows.map(r => ({
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
        lastLogin: null, // Not available in simplified query
      
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
      registrationDuration: {
        timestamp: r.user_created_at,
      }
    }));
    
    res.json({ businesses });
  } catch (error) {
    console.error('Error fetching admin businesses data:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * Get detailed business timeline events
 * Path: /api/admin/businesses/:id/timeline
 */
router.get('/businesses/:id/timeline', auth, requireAdmin, async (req, res) => {
  try {
    const businessId = req.params.id;
    
    // Get base business info
    const businessResult = await sql.query(`
      SELECT 
        COALESCE(b.id, u.id) as id,
        COALESCE(b.name, u.business_name, u.name) as name,
        u.created_at as registered_at
      FROM users u
      LEFT JOIN businesses b ON b.user_id = u.id
      WHERE (u.id = $1 OR b.id = $1) AND u.user_type = 'business'
      LIMIT 1
    `, [businessId]);
    
    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const business = businessResult.rows[0];
    
    // Get program creation events
    const programEvents = await sql.query(`
      SELECT
        id,
        'PROGRAM_CREATED' as event_type,
        name as title,
        'New loyalty program created' as description,
        created_at as event_date
      FROM loyalty_programs
      WHERE business_id = $1
      ORDER BY created_at DESC
    `, [businessId]);
    
    // Get transaction events (grouped by day)
    const transactionEvents = await sql.query(`
      SELECT
        DATE(transaction_date) as id,
        'TRANSACTIONS' as event_type,
        CONCAT('Processed ', COUNT(*), ' transactions') as title,
        CONCAT('Total revenue: ', SUM(amount), ' ', 'USD') as description,
        DATE(transaction_date) as event_date,
        COUNT(*) as transaction_count,
        SUM(amount) as daily_revenue
      FROM business_transactions
      WHERE business_id = $1
      GROUP BY DATE(transaction_date)
      ORDER BY DATE(transaction_date) DESC
      LIMIT 30
    `, [businessId]);
    
    // Get login events
    const loginEvents = await sql.query(`
      SELECT
        id,
        'LOGIN' as event_type,
        'Business login' as title,
        CONCAT('Login from ', COALESCE(device, ip_address, 'unknown device')) as description,
        login_time as event_date
      FROM business_daily_logins
      WHERE business_id = $1
      ORDER BY login_time DESC
      LIMIT 20
    `, [businessId]);
    
    // Get promotion events
    const promotionEvents = await sql.query(`
      SELECT
        id,
        'PROMOTION_CREATED' as event_type,
        CONCAT('Promotion created: ', code) as title,
        description,
        created_at as event_date
      FROM promo_codes
      WHERE business_id = $1
      ORDER BY created_at DESC
    `, [businessId]);
    
    // Combine all events
    const allEvents = [
      ...programEvents.rows.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date})),
      ...transactionEvents.rows.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date})),
      ...loginEvents.rows.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date})),
      ...promotionEvents.rows.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date}))
    ].sort((a, b) => {
      return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
    });
    
    // Add registration event
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * Get business analytics data (revenue, customers, program usage)
 * Path: /api/admin/businesses/:id/analytics
 */
router.get('/businesses/:id/analytics', auth, requireAdmin, async (req, res) => {
  try {
    const businessId = req.params.id;
    
    // Simple analytics for now
    const [customers, programs, transactions] = await Promise.all([
      sql.query(`
        SELECT COUNT(DISTINCT customer_id) as total_customers
        FROM customer_program_enrollments
        WHERE business_id = $1
      `, [businessId]),
      
      sql.query(`
        SELECT COUNT(*) as total_programs
        FROM loyalty_programs
        WHERE business_id = $1
      `, [businessId]),
      
      sql.query(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(amount) as total_revenue
        FROM business_transactions
        WHERE business_id = $1
      `, [businessId])
    ]);
    
    const analyticsData = {
      totalCustomers: parseInt(customers.rows[0]?.total_customers || '0'),
      totalPrograms: parseInt(programs.rows[0]?.total_programs || '0'),
      totalTransactions: parseInt(transactions.rows[0]?.total_transactions || '0'),
      totalRevenue: parseFloat(transactions.rows[0]?.total_revenue || '0'),
      customerEngagement: [],
      pointsDistribution: [],
      totalPoints: 0,
      totalRedemptions: 0,
      activeCustomers: 0,
      retentionRate: 0,
      redemptionRate: 0,
      popularRewards: [],
      averagePointsPerCustomer: 0,
      totalPromoCodes: 0,
      topPerformingPrograms: []
    };
    
    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching business analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;
