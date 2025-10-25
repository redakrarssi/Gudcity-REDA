/**
 * Consolidated API Handler for Multiple Endpoints
 * This file handles multiple API endpoints to bypass the Vercel Hobby plan's 12 function limit
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, verifyAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parse the path from the URL
  const fullPath = req.url || '';
  const pathWithoutApi = fullPath.replace(/^\/api\/v1\//, '');
  const pathSegments = pathWithoutApi.split('/').filter(Boolean);
  
  // Get the first segment to determine the endpoint type
  const endpointType = pathSegments[0] || '';

  // Log request for debugging
  console.log('🔍 [Consolidated API] Request received:', { 
    method: req.method,
    url: req.url,
    pathSegments,
    endpointType,
    query: req.query
  });

  try {
    // SECURITY AUDIT ENDPOINT
    if (endpointType === 'security' && pathSegments[1] === 'audit') {
      return handleSecurityAudit(req, res);
    }
    
    // LOYALTY CARDS ENDPOINT
    else if (endpointType === 'loyalty' && pathSegments[1] === 'cards' && 
             pathSegments[2] === 'customer' && pathSegments[3]) {
      return handleCustomerCards(req, res, pathSegments[3]);
    }
    
    // CUSTOMER PROGRAMS ENDPOINT
    else if (endpointType === 'customers' && pathSegments[1] && 
             pathSegments[2] === 'programs') {
      return handleCustomerPrograms(req, res, pathSegments[1]);
    }
    
    // NOTIFICATIONS ENDPOINT
    else if (endpointType === 'notifications') {
      return handleNotifications(req, res);
    }
    
    // PROMOTIONS ENDPOINT
    else if (endpointType === 'promotions') {
      return handlePromotions(req, res);
    }
    
    // If no handler matches, return 404
    return res.status(404).json({ 
      error: 'Not found', 
      path: fullPath,
      segments: pathSegments
    });
  } catch (error) {
    console.error('[Consolidated API] Error:', error);
    console.error('[Consolidated API] Error stack:', (error as Error).stack);
    return res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An unexpected error occurred'
    });
  }
}

// HANDLER FUNCTIONS

/**
 * Handle Security Audit endpoints
 */
async function handleSecurityAudit(req: VercelRequest, res: VercelResponse) {
  console.log('✅ [SecurityAudit] Matched security/audit route:', { method: req.method, url: req.url });
  
  try {
    const { requireSql } = await import('../_lib/db.js');
    const sql = requireSql();
    
    // Create security_audit_log table if it doesn't exist (consistent with other route naming)
    await sql`
      CREATE TABLE IF NOT EXISTS security_audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ [SecurityAudit] Table verified/created');
    
  } catch (tableError) {
    console.error('❌ [SecurityAudit] Table creation error:', tableError);
    return res.status(500).json({ error: 'Database setup failed' });
  }
  
  if (req.method === 'GET') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      console.warn('⚠️ [SecurityAudit] Unauthorized GET request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      // Get query parameters
      const { searchParams } = new URL(req.url!, `http://localhost`);
      const userId = searchParams.get('userId');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      
      let logs;
      if (userId && (user.role === 'admin' || user.role === 'owner')) {
        // Admins can view logs for specific users
        logs = await sql`
          SELECT 
            id, user_id, event_type, ip_address, user_agent, 
            metadata, created_at
          FROM security_audit_log
          WHERE user_id = ${parseInt(userId)}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      } else {
        // Regular users can only view their own logs
        logs = await sql`
          SELECT 
            id, user_id, event_type, ip_address, user_agent, 
            metadata, created_at
          FROM security_audit_log
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
          LIMIT ${limit}
      `;
      }

      console.log('✅ [SecurityAudit] Retrieved logs:', { userId: user.id, count: logs.length });

      return res.status(200).json({ 
        success: true,
        logs,
        count: logs.length
      });
      
    } catch (error) {
      console.error('❌ [SecurityAudit] Error getting security audit logs:', error);
      return res.status(500).json({ 
        error: 'Failed to get audit logs',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  if (req.method === 'POST') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      console.warn('⚠️ [SecurityAudit] Unauthorized POST request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { eventType, event, metadata, ipAddress, userAgent } = (req.body || {}) as any;
    const actualEventType = eventType || event; // Support both field names

    if (!actualEventType) {
      console.warn('⚠️ [SecurityAudit] Missing eventType in request body');
      return res.status(400).json({ error: 'eventType is required' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      // Extract IP address with fallback chain
      const clientIp = ipAddress || 
                      req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] ||
                      req.connection?.remoteAddress ||
                      req.socket?.remoteAddress ||
                      'unknown';
      
      const clientUserAgent = userAgent || req.headers['user-agent'] || 'unknown';
      
      // Log security event
      const result = await sql`
        INSERT INTO security_audit_log (
          user_id, event_type, ip_address, user_agent, metadata, created_at
        ) VALUES (
          ${user.id}, 
          ${actualEventType}, 
          ${Array.isArray(clientIp) ? clientIp[0] : clientIp},
          ${clientUserAgent}, 
          ${metadata ? JSON.stringify(metadata) : null}, 
          NOW()
        )
        RETURNING id, created_at
      `;

      console.log('✅ [SecurityAudit] Logged security event:', { 
        userId: user.id, 
        eventType: actualEventType, 
        auditId: result[0]?.id 
      });

      return res.status(201).json({ 
        success: true,
        auditId: result[0]?.id,
        timestamp: result[0]?.created_at
      });
      
    } catch (error) {
      console.error('❌ [SecurityAudit] Error logging security event:', error);
      return res.status(500).json({ 
        error: 'Failed to log security event',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  console.warn('⚠️ [SecurityAudit] Method not allowed:', req.method);
  return res.status(405).json({ 
    error: 'Method not allowed',
    allowed: ['GET', 'POST']
  });
}

/**
 * Handle Customer Loyalty Cards endpoints
 */
async function handleCustomerCards(req: VercelRequest, res: VercelResponse, customerId: string) {
  console.log('✅ [CustomerCards] Matched loyalty/cards/customer route:', customerId);
  
  if (req.method === 'GET') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      console.warn('⚠️ [CustomerCards] Unauthorized request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate customer ID
    const customerIdNum = parseInt(customerId);
    if (isNaN(customerIdNum)) {
      console.warn('⚠️ [CustomerCards] Invalid customer ID:', customerId);
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }
    
    // Authorization check
    if (user.id !== customerIdNum && user.role !== 'admin' && user.role !== 'business') {
      console.warn('⚠️ [CustomerCards] Access denied for user:', user.id, 'requesting customer:', customerIdNum);
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      // Create loyalty_cards table if it doesn't exist
      await sql`
        CREATE TABLE IF NOT EXISTS loyalty_cards (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL,
          card_id INTEGER NOT NULL,
          program_id INTEGER,
          current_stamps INTEGER DEFAULT 0,
          points_balance INTEGER DEFAULT 0,
          total_points_earned INTEGER DEFAULT 0,
          card_number VARCHAR(50),
          card_type VARCHAR(100),
          tier VARCHAR(50) DEFAULT 'STANDARD',
          status VARCHAR(50) DEFAULT 'ACTIVE',
          is_complete BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Create cards table if it doesn't exist (loyalty program templates)
      await sql`
        CREATE TABLE IF NOT EXISTS cards (
          id SERIAL PRIMARY KEY,
          business_id INTEGER NOT NULL,
          card_type VARCHAR(255) NOT NULL,
          stamps_required INTEGER DEFAULT 10,
          reward_description TEXT,
          points_per_dollar DECIMAL(5,2) DEFAULT 1.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      console.log('✅ [CustomerCards] Tables verified/created');
      
      // Fetch customer's loyalty cards with business details
      const cards = await sql`
        SELECT 
          lc.id,
          lc.customer_id,
          lc.card_id,
          lc.program_id,
          lc.current_stamps,
          lc.points_balance,
          lc.total_points_earned,
          lc.card_number,
          lc.card_type,
          lc.tier,
          lc.status,
          lc.is_complete,
          lc.created_at,
          lc.updated_at,
          c.stamps_required,
          c.reward_description,
          c.business_id,
          u.business_name,
          u.name as business_owner_name,
          CASE 
            WHEN c.stamps_required > 0 AND lc.current_stamps IS NOT NULL 
            THEN ROUND((lc.current_stamps::decimal / c.stamps_required) * 100, 2)
            ELSE 0 
          END as progress_percentage
        FROM loyalty_cards lc
        LEFT JOIN cards c ON lc.card_id = c.id
        LEFT JOIN users u ON c.business_id = u.id OR c.business_id = u.business_id
        WHERE lc.customer_id = ${customerIdNum}
          AND lc.status IN ('ACTIVE', 'COMPLETED')
        ORDER BY lc.updated_at DESC
      `;
      
      console.log('✅ [CustomerCards] Retrieved cards:', { 
        customerId: customerIdNum, 
        count: cards.length,
        userId: user.id 
      });
      
      // If no cards found, return empty array instead of error
      return res.status(200).json({ 
        success: true,
        cards: cards || [],
        count: cards?.length || 0,
        customerId: customerIdNum
      });
      
    } catch (error) {
      console.error('❌ [CustomerCards] Error getting customer cards:', error);
      
      // Return empty array instead of error for better UX
      return res.status(200).json({ 
        success: true,
        cards: [],
        count: 0,
        customerId: customerIdNum,
        error: 'Could not fetch loyalty cards',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  console.warn('⚠️ [CustomerCards] Method not allowed:', req.method);
  return res.status(405).json({ 
    error: 'Method not allowed',
    allowed: ['GET']
  });
}

/**
 * Handle Customer Programs endpoints
 */
async function handleCustomerPrograms(req: VercelRequest, res: VercelResponse, customerId: string) {
  console.log('✅ [CustomerPrograms] Matched customers/programs route:', customerId);
  
  if (req.method === 'GET') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      console.warn('⚠️ [CustomerPrograms] Unauthorized request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate customer ID
    const customerIdNum = parseInt(customerId);
    if (isNaN(customerIdNum)) {
      console.warn('⚠️ [CustomerPrograms] Invalid customer ID:', customerId);
      return res.status(400).json({ error: 'Invalid customer ID format' });
    }
    
    // Authorization check
    if (user.id !== customerIdNum && user.role !== 'admin' && user.role !== 'business') {
      console.warn('⚠️ [CustomerPrograms] Access denied for user:', user.id, 'requesting customer:', customerIdNum);
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      // Create necessary tables if they don't exist
      await sql`
        CREATE TABLE IF NOT EXISTS loyalty_programs (
          id SERIAL PRIMARY KEY,
          business_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          points_per_dollar DECIMAL(5,2) DEFAULT 1.00,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      console.log('✅ [CustomerPrograms] Tables verified/created');
      
      // Get customer's enrolled programs using loyalty_cards as the primary source
      const programs = await sql`
        SELECT DISTINCT
          COALESCE(lp.id, c.id) as program_id,
          COALESCE(lp.name, c.card_type) as program_name,
          COALESCE(lp.description, c.reward_description) as description,
          COALESCE(lp.business_id, c.business_id) as business_id,
          COALESCE(lp.points_per_dollar, c.points_per_dollar, 1.00) as points_per_dollar,
          COALESCE(lp.is_active, true) as is_active,
          COALESCE(lp.created_at, c.created_at) as program_created_at,
          u.business_name,
          u.name AS business_owner_name,
          u.email AS business_email,
          lc.id AS enrollment_id,
          lc.card_id,
          lc.current_stamps,
          lc.points_balance,
          lc.total_points_earned,
          lc.card_number,
          lc.card_type,
          lc.tier,
          lc.status AS enrollment_status,
          lc.created_at AS enrollment_date,
          lc.updated_at AS last_activity,
          c.stamps_required,
          c.reward_description,
          CASE 
            WHEN c.stamps_required > 0 AND lc.current_stamps IS NOT NULL 
            THEN ROUND((lc.current_stamps::decimal / c.stamps_required) * 100, 2)
            ELSE 0 
          END as progress_percentage
        FROM loyalty_cards lc
        LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
        LEFT JOIN cards c ON lc.card_id = c.id
        LEFT JOIN users u ON COALESCE(lp.business_id, c.business_id) = u.id OR COALESCE(lp.business_id, c.business_id) = u.business_id
        WHERE lc.customer_id = ${customerIdNum}
          AND lc.status IN ('ACTIVE', 'COMPLETED')
        ORDER BY lc.updated_at DESC
      `;

      console.log('✅ [CustomerPrograms] Retrieved programs:', { 
        customerId: customerIdNum, 
        count: programs.length,
        userId: user.id 
      });

      return res.status(200).json({ 
        success: true,
        programs: programs || [],
        count: programs?.length || 0,
        customerId: customerIdNum
      });
      
    } catch (error) {
      console.error('❌ [CustomerPrograms] Error getting customer programs:', error);
      
      // Return empty array instead of error for better UX
      return res.status(200).json({ 
        success: true,
        programs: [],
        count: 0,
        customerId: customerIdNum,
        error: 'Could not fetch enrolled programs',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  console.warn('⚠️ [CustomerPrograms] Method not allowed:', req.method);
  return res.status(405).json({ 
    error: 'Method not allowed',
    allowed: ['GET']
  });
}

/**
 * Handle Notifications endpoints
 */
async function handleNotifications(req: VercelRequest, res: VercelResponse) {
  console.log('✅ [Notifications] Matched notifications route:', { method: req.method, url: req.url, query: req.query });
  
  try {
    const { requireSql } = await import('../_lib/db.js');
    const sql = requireSql();
    
    // Create notifications table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        business_id INTEGER,
        user_id INTEGER,
        type VARCHAR(50) DEFAULT 'info',
        title VARCHAR(200),
        message TEXT NOT NULL,
        data JSONB,
        requires_action BOOLEAN DEFAULT FALSE,
        action_taken BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        read_status BOOLEAN DEFAULT FALSE,
        priority VARCHAR(20) DEFAULT 'normal',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        action_taken_at TIMESTAMP
      )
    `;
    
    console.log('✅ [Notifications] Table verified/created');
    
  } catch (tableError) {
    console.error('❌ [Notifications] Table creation error:', tableError);
    return res.status(500).json({ error: 'Database setup failed' });
  }
  
  if (req.method === 'GET') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { searchParams } = new URL(req.url!, 'http://localhost');
    const customerId = searchParams.get('customerId');
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const unread = searchParams.get('unread');
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    console.log('🔍 [Notifications] Query params:', { customerId, businessId, userId, unread, type, limit });

    // Authorization check
    if (customerId && user.id !== Number(customerId) && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (businessId && user.id !== Number(businessId) && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      if (customerId) {
        let whereClause = `WHERE customer_id = ${Number(customerId)}`;
        if (unread === 'true') whereClause += ` AND is_read = FALSE`;
        if (type) whereClause += ` AND type = '${type}'`;

        console.log('📋 [Notifications] Fetching customer notifications for:', customerId);
        
        const notifications = await sql`
          SELECT 
            id, customer_id, business_id, user_id, type, title, message, data,
            requires_action, action_taken, is_read, read_status, priority,
            expires_at, created_at, read_at, action_taken_at
          FROM notifications
          WHERE customer_id = ${Number(customerId)}
          ${unread === 'true' ? sql`AND (is_read = FALSE OR read_status = FALSE)` : sql``}
          ${type ? sql`AND type = ${type}` : sql``}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

        console.log('✅ [Notifications] Retrieved notifications:', { 
          count: notifications.length, 
          customerId, 
          businessId,
          userId: user.id 
        });

        return res.status(200).json({ 
          success: true,
          notifications: notifications || [],
          count: notifications?.length || 0,
          params: { customerId, businessId, unread, type, limit }
        });
      }

      // Return empty response for other cases
      console.log('📋 [Notifications] No specific customer/business ID, returning empty array');
      return res.status(200).json({ 
        success: true,
        notifications: [],
        count: 0
      });
    } catch (error) {
      console.error('❌ [Notifications] Error getting notifications:', error);
      
      // Return empty array on database errors instead of 500
      return res.status(200).json({ 
        success: true,
        notifications: [],
        count: 0,
        error: 'Could not fetch notifications',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  if (req.method === 'POST') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      customer_id, 
      business_id, 
      type, 
      title, 
      message 
    } = (req.body || {}) as any;

    if (!customer_id || !type || !title) {
      return res.status(400).json({ error: 'customer_id, type, and title are required' });
    }

    // Authorization check
    if (business_id && user.id !== Number(business_id) && user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot create notifications for other businesses' });
    }

    // Return placeholder response
    return res.status(201).json({ 
      success: true,
      notification: {
        id: Date.now(),
        customer_id,
        business_id,
        type,
        title,
        message,
        created_at: new Date().toISOString()
      }
    });
  }

  if (req.method === 'PUT') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationId } = req.query as any;
    const { is_read, action_taken } = (req.body || {}) as any;

    if (!notificationId) {
      return res.status(400).json({ error: 'notificationId is required' });
    }

    // Return placeholder response
    return res.status(200).json({ 
      success: true,
      notification: {
        id: notificationId,
        is_read: is_read || false,
        action_taken: action_taken || false,
        updated_at: new Date().toISOString()
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Handle Promotions endpoints
 */
async function handlePromotions(req: VercelRequest, res: VercelResponse) {
  console.log('✅ [Promotions] Matched promotions route:', { method: req.method, query: req.query });
  
  try {
    const { requireSql } = await import('../_lib/db.js');
    const sql = requireSql();
    
    // Create promotions table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        discount_type VARCHAR(50) DEFAULT 'percentage',
        discount_value DECIMAL(10,2),
        code VARCHAR(50),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        terms_conditions TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create promo_codes table (legacy support)
    await sql`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255),
        description TEXT,
        type VARCHAR(50) DEFAULT 'percentage',
        value DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ [Promotions] Tables verified/created');
    
  } catch (tableError) {
    console.error('❌ [Promotions] Table creation error:', tableError);
    return res.status(500).json({ error: 'Database setup failed' });
  }
  
  if (req.method === 'GET') {
    // This is a public route, no auth required
    const { searchParams } = new URL(req.url!, 'http://localhost');
    const businessId = searchParams.get('businessId');
    const activeOnly = searchParams.get('active') !== 'false'; // default true
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    console.log('🔍 [Promotions] Query params:', { businessId, activeOnly, limit });

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      let promotions = [];
      
      // Try promotions table first (modern)
      try {
        if (businessId && !isNaN(parseInt(businessId))) {
          const bid = parseInt(businessId);
          
          if (activeOnly) {
            promotions = await sql`
              SELECT 
                p.*,
                u.business_name,
                u.name as business_owner_name
              FROM promotions p
              LEFT JOIN users u ON p.business_id = u.id OR p.business_id = u.business_id
              WHERE p.business_id = ${bid}
                AND p.is_active = TRUE
                AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
              ORDER BY p.created_at DESC
              LIMIT ${limit}
            `;
          } else {
            promotions = await sql`
              SELECT 
                p.*,
                u.business_name,
                u.name as business_owner_name
              FROM promotions p
              LEFT JOIN users u ON p.business_id = u.id OR p.business_id = u.business_id
              WHERE p.business_id = ${bid}
              ORDER BY p.created_at DESC
              LIMIT ${limit}
            `;
          }
        } else {
          if (activeOnly) {
            promotions = await sql`
              SELECT 
                p.*,
                u.business_name,
                u.name as business_owner_name
              FROM promotions p
              LEFT JOIN users u ON p.business_id = u.id OR p.business_id = u.business_id
              WHERE p.is_active = TRUE
                AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
              ORDER BY p.created_at DESC
              LIMIT ${limit}
            `;
          } else {
            promotions = await sql`
              SELECT 
                p.*,
                u.business_name,
                u.name as business_owner_name
              FROM promotions p
              LEFT JOIN users u ON p.business_id = u.id OR p.business_id = u.business_id
              ORDER BY p.created_at DESC
              LIMIT ${limit}
            `;
          }
        }
        
      } catch (modernPromotionsError) {
        // Fall back to promo_codes table (legacy support)
        console.log('📦 [Promotions] Falling back to promo_codes table');
        
        let promoCodesResult = [];
        
        if (businessId && !isNaN(parseInt(businessId))) {
        promoCodesResult = await sql`
            SELECT pc.*, u.business_name, u.name as business_owner_name
          FROM promo_codes pc
            LEFT JOIN users u ON pc.business_id = u.id OR pc.business_id = u.business_id
            WHERE pc.business_id = ${parseInt(businessId)}
            AND pc.status = 'ACTIVE'
            AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
          ORDER BY pc.created_at DESC
            LIMIT ${limit}
        `;
      } else {
        promoCodesResult = await sql`
            SELECT pc.*, u.business_name, u.name as business_owner_name
          FROM promo_codes pc
            LEFT JOIN users u ON pc.business_id = u.id OR pc.business_id = u.business_id
          WHERE pc.status = 'ACTIVE'
          AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
          AND (pc.max_uses IS NULL OR pc.used_count < pc.max_uses)
          ORDER BY pc.created_at DESC
            LIMIT ${limit}
          `;
        }
        
        // Transform promo_codes to promotions format
        promotions = promoCodesResult.map((row: any) => ({
          id: row.id,
          business_id: row.business_id,
          title: row.name || row.code,
          description: row.description,
          discount_type: row.type || 'percentage',
          discount_value: row.value,
          code: row.code,
          start_date: null,
          end_date: row.expires_at,
          is_active: row.status === 'ACTIVE',
          max_uses: row.max_uses,
          used_count: row.used_count,
          terms_conditions: null,
          image_url: null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          business_name: row.business_name,
          business_owner_name: row.business_owner_name
        }));
      }

      console.log('✅ [Promotions] Retrieved promotions:', { 
        count: promotions.length,
        businessId,
        activeOnly
      });

      return res.status(200).json({ 
        success: true,
        promotions: promotions || [],
        count: promotions?.length || 0,
        businessId: businessId ? Number(businessId) : null
      });
      
    } catch (error) {
      console.error('❌ [Promotions] Error getting promotions:', error);
      
      // Return empty array instead of error for better UX
      return res.status(200).json({ 
        success: true,
        promotions: [],
        count: 0,
        businessId: businessId ? Number(businessId) : null,
        error: 'Could not fetch promotions',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  console.warn('⚠️ [Promotions] Method not allowed:', req.method);
  return res.status(405).json({ 
    error: 'Method not allowed',
    allowed: ['GET']
  });
}
