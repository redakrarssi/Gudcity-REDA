/**
 * Unified Customer Dashboard API Handler
 * Consolidates all customer dashboard endpoints to stay within 12 serverless function limit
 * Handles: /dashboard, /cards, /promotions, /qr-card, /settings, /notifications
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from './_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from './_lib/auth.js';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const segments = (req.query.segments as string[] | undefined) || [];
  const sql = requireSql();

  // Handle public routes that don't require auth
  const publicRoutes = ['promotions'];
  const isPublicRoute = segments.length > 0 && publicRoutes.includes(segments[0]);

  const user = !isPublicRoute ? await verifyAuth(req) : null;
  if (!isPublicRoute && !user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Route: GET /api/dashboard
    if (segments.length === 1 && segments[0] === 'dashboard' && req.method === 'GET') {
      return handleDashboard(req, res, user!, sql);
    }

    // Route: GET /api/cards
    if (segments.length === 1 && segments[0] === 'cards' && req.method === 'GET') {
      return handleCards(req, res, user!, sql);
    }

    // Route: GET /api/promotions
    if (segments.length === 1 && segments[0] === 'promotions' && req.method === 'GET') {
      return handlePromotions(req, res, sql);
    }

    // Route: GET /api/qr-card
    if (segments.length === 1 && segments[0] === 'qr-card' && req.method === 'GET') {
      return handleQrCard(req, res, user!, sql);
    }

    // Route: GET /api/settings
    if (segments.length === 1 && segments[0] === 'settings' && req.method === 'GET') {
      return handleSettings(req, res, user!, sql);
    }

    // Route: PUT /api/settings
    if (segments.length === 1 && segments[0] === 'settings' && req.method === 'PUT') {
      return handleUpdateSettings(req, res, user!, sql);
    }

    // Route: GET /api/notifications
    if (segments.length === 1 && segments[0] === 'notifications' && req.method === 'GET') {
      return handleNotifications(req, res, user!, sql);
    }

    // Route: PUT /api/notifications/:id
    if (segments.length === 2 && segments[0] === 'notifications' && req.method === 'PUT') {
      return handleUpdateNotification(req, res, user!, sql, segments[1]);
    }

    // Route: GET /api/loyalty/cards/customer/:customerId
    if (segments.length === 4 && 
        segments[0] === 'loyalty' && 
        segments[1] === 'cards' && 
        segments[2] === 'customer' && 
        segments[3]) {
      return handleCustomerCards(req, res, user!, sql, segments[3]);
    }

    // Route: GET /api/customers/:customerId/programs
    if (segments.length === 3 && 
        segments[0] === 'customers' && 
        segments[1] && 
        segments[2] === 'programs') {
      return handleCustomerPrograms(req, res, user!, sql, segments[1]);
    }

    // Route: GET /api/users/:id
    if (segments.length === 2 && segments[0] === 'users' && segments[1]) {
      return handleUserById(req, res, user!, sql, segments[1]);
    }

    // Route: GET /api/security/audit
    if (segments.length === 2 && 
        segments[0] === 'security' && 
        segments[1] === 'audit') {
      return handleSecurityAudit(req, res, user!, sql);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Customer Dashboard API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Handle Dashboard endpoint
 */
async function handleDashboard(req: VercelRequest, res: VercelResponse, user: any, sql: any) {
  const { type, customerId } = req.query;
  const custId = customerId || user.id;
  
  if (user.role !== 'admin' && user.id !== parseInt(String(custId))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const [
      totalCards,
      totalPoints,
      totalRedemptions,
      enrolledPrograms,
      recentActivity
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM loyalty_cards WHERE customer_id = ${parseInt(String(custId))} AND status = 'ACTIVE'`,
      sql`SELECT SUM(points) as total FROM loyalty_cards WHERE customer_id = ${parseInt(String(custId))} AND status = 'ACTIVE'`,
      sql`SELECT COUNT(*) as count FROM redemptions r JOIN loyalty_cards lc ON r.card_id = lc.id WHERE lc.customer_id = ${parseInt(String(custId))}`,
      sql`
        SELECT lp.name as program_name, u.name as business_name, lc.points, lc.tier 
        FROM loyalty_cards lc 
        JOIN loyalty_programs lp ON lc.program_id = lp.id 
        JOIN users u ON lp.business_id = u.id 
        WHERE lc.customer_id = ${parseInt(String(custId))} AND lc.status = 'ACTIVE'
      `,
      sql`
        SELECT ca.*, lp.name as program_name, u.name as business_name 
        FROM card_activities ca 
        JOIN loyalty_cards lc ON ca.card_id = lc.id 
        JOIN loyalty_programs lp ON lc.program_id = lp.id 
        JOIN users u ON lp.business_id = u.id 
        WHERE lc.customer_id = ${parseInt(String(custId))} 
        ORDER BY ca.created_at DESC 
        LIMIT 10
      `
    ]);

    return res.status(200).json({
      totalCards: parseInt(totalCards[0]?.count || '0'),
      totalPoints: parseInt(totalPoints[0]?.total || '0'),
      totalRedemptions: parseInt(totalRedemptions[0]?.count || '0'),
      enrolledPrograms: enrolledPrograms,
      recentActivity: recentActivity
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

/**
 * Handle Cards endpoint
 */
async function handleCards(req: VercelRequest, res: VercelResponse, user: any, sql: any) {
  const { customerId } = req.query;
  const custId = customerId || user.id;
  
  if (user.role !== 'admin' && user.id !== parseInt(String(custId))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const cards = await sql`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.business_id,
        lc.program_id,
        lc.card_number,
        lc.card_type,
        lc.tier,
        lc.points,
        lc.points_balance,
        lc.total_points_earned,
        lc.status,
        lc.created_at,
        lc.updated_at,
        lc.qr_code_url,
        lp.name AS program_name,
        lp.description AS program_description,
        u.name AS business_name,
        u.email AS business_email
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lp.id = lc.program_id
      JOIN users u ON u.id = lc.business_id
      WHERE lc.customer_id = ${parseInt(String(custId))}
        AND lc.status = 'ACTIVE'
      ORDER BY lc.created_at DESC
    `;

    // Get recent activities for each card
    const cardActivities = await sql`
      SELECT 
        ca.card_id,
        ca.activity_type,
        ca.points,
        ca.description,
        ca.created_at
      FROM card_activities ca
      JOIN loyalty_cards lc ON lc.id = ca.card_id
      WHERE lc.customer_id = ${parseInt(String(custId))}
      ORDER BY ca.created_at DESC
      LIMIT 50
    `;

    // Group activities by card
    const activitiesByCard = cardActivities.reduce((acc: any, activity: any) => {
      if (!acc[activity.card_id]) acc[activity.card_id] = [];
      acc[activity.card_id].push(activity);
      return acc;
    }, {});

    // Add activities to cards
    const cardsWithActivities = cards.map((card: any) => ({
      ...card,
      recentActivities: activitiesByCard[card.id] || []
    }));

    return res.status(200).json({ cards: cardsWithActivities });
  } catch (error) {
    console.error('Cards error:', error);
    return res.status(500).json({ error: 'Failed to fetch cards' });
  }
}

/**
 * Handle Promotions endpoint
 */
async function handlePromotions(req: VercelRequest, res: VercelResponse, sql: any) {
  const { businessId } = req.query;

  try {
    if (businessId) {
      const promoCodesResult = await sql`
        SELECT pc.*, u.business_name, u.name as business_name
        FROM promo_codes pc
        JOIN users u ON pc.business_id = u.id
        WHERE pc.business_id = ${parseInt(String(businessId))}
          AND pc.status = 'ACTIVE'
          AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
        ORDER BY pc.created_at DESC
      `;

      const promotions = promoCodesResult.map((row: any) => ({
        id: String(row.id),
        businessId: String(row.business_id),
        businessName: row.business_name || row.name || 'Unknown Business',
        code: String(row.code),
        type: row.type,
        value: Number(row.value),
        currency: row.currency,
        maxUses: row.max_uses ? Number(row.max_uses) : null,
        usedCount: Number(row.used_count || 0),
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        status: row.status,
        name: String(row.name || ''),
        description: String(row.description || ''),
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }));

      return res.status(200).json({ promotions });
    }

    const promoCodesResult = await sql`
      SELECT pc.*, u.business_name, u.name as business_name
      FROM promo_codes pc
      JOIN users u ON pc.business_id = u.id
      WHERE pc.status = 'ACTIVE'
      AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
      AND (pc.max_uses IS NULL OR pc.used_count < pc.max_uses)
      ORDER BY pc.created_at DESC
    `;
    
    const promotions = promoCodesResult.map((row: any) => ({
      id: String(row.id),
      businessId: String(row.business_id),
      businessName: row.business_name || row.name || 'Unknown Business',
      code: String(row.code),
      type: row.type,
      value: Number(row.value),
      currency: row.currency,
      maxUses: row.max_uses ? Number(row.max_uses) : null,
      usedCount: Number(row.used_count || 0),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      status: row.status,
      name: String(row.name || ''),
      description: String(row.description || ''),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
    
    return res.status(200).json({ promotions });
  } catch (error) {
    console.error('Promotions error:', error);
    return res.status(500).json({ error: 'Failed to fetch promotions' });
  }
}

/**
 * Handle QR Card endpoint
 */
async function handleQrCard(req: VercelRequest, res: VercelResponse, user: any, sql: any) {
  const { customerId } = req.query;
  const custId = customerId || user.id;
  
  if (user.role !== 'admin' && user.id !== parseInt(String(custId))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Get customer's primary QR code
    const qrCodeResult = await sql`
      SELECT 
        lc.id,
        lc.qr_code_url,
        lc.card_number,
        lc.points,
        lc.tier,
        lp.name as program_name,
        u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN users u ON lc.business_id = u.id
      WHERE lc.customer_id = ${parseInt(String(custId))}
        AND lc.status = 'ACTIVE'
      ORDER BY lc.created_at DESC
      LIMIT 1
    `;

    if (qrCodeResult.length === 0) {
      return res.status(404).json({ error: 'No QR code found for customer' });
    }

    const qrCode = qrCodeResult[0];

    return res.status(200).json({
      id: qrCode.id,
      qrCodeUrl: qrCode.qr_code_url,
      cardNumber: qrCode.card_number,
      points: qrCode.points,
      tier: qrCode.tier,
      programName: qrCode.program_name,
      businessName: qrCode.business_name
    });
  } catch (error) {
    console.error('QR Card error:', error);
    return res.status(500).json({ error: 'Failed to fetch QR code' });
  }
}

/**
 * Handle Settings endpoint
 */
async function handleSettings(req: VercelRequest, res: VercelResponse, user: any, sql: any) {
  try {
    const userSettings = await sql`
      SELECT 
        id, name, email, avatar_url, phone, timezone,
        notification_preferences, language, currency, user_type
      FROM users
      WHERE id = ${user.id}
    `;

    if (userSettings.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = userSettings[0];

    return res.status(200).json({
      id: settings.id,
      name: settings.name,
      email: settings.email,
      avatarUrl: settings.avatar_url,
      phone: settings.phone,
      timezone: settings.timezone,
      notificationPreferences: settings.notification_preferences || {},
      language: settings.language || 'en',
      currency: settings.currency || 'USD',
      userType: settings.user_type
    });
  } catch (error) {
    console.error('Settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

/**
 * Handle Update Settings endpoint
 */
async function handleUpdateSettings(req: VercelRequest, res: VercelResponse, user: any, sql: any) {
  const { 
    name, 
    avatar_url, 
    phone, 
    timezone, 
    notification_preferences, 
    language, 
    currency 
  } = (req.body || {}) as any;

  try {
    const updated = await sql`
      UPDATE users
      SET 
        name = COALESCE(${name}, name),
        avatar_url = COALESCE(${avatar_url}, avatar_url),
        phone = COALESCE(${phone}, phone),
        timezone = COALESCE(${timezone}, timezone),
        notification_preferences = COALESCE(${notification_preferences ? JSON.stringify(notification_preferences) : null}, notification_preferences),
        language = COALESCE(${language}, language),
        currency = COALESCE(${currency}, currency),
        updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ 
      success: true,
      settings: updated[0] 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
}

/**
 * Handle Notifications endpoint
 */
async function handleNotifications(req: VercelRequest, res: VercelResponse, user: any, sql: any) {
  const { customerId, unread, type } = req.query as any;
  const custId = customerId || user.id;

  if (user.role !== 'admin' && user.id !== parseInt(String(custId))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    let whereClause = `WHERE customer_id = ${parseInt(String(custId))}`;
    if (unread === 'true') whereClause += ` AND is_read = FALSE`;
    if (type) whereClause += ` AND type = '${type}'`;

    const notifications = await sql`
      SELECT 
        id, customer_id, business_id, type, title, message, data,
        requires_action, action_taken, is_read, priority,
        expires_at, created_at, read_at, action_taken_at
      FROM customer_notifications
      ${sql.raw(whereClause)}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return res.status(200).json({ notifications });
  } catch (error) {
    console.error('Notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * Handle Update Notification endpoint
 */
async function handleUpdateNotification(req: VercelRequest, res: VercelResponse, user: any, sql: any, notificationId: string) {
  const { is_read, action_taken, action_data } = (req.body || {}) as any;

  try {
    const existingNotification = await sql`
      SELECT * FROM customer_notifications 
      WHERE id = ${notificationId}
    `;

    if (existingNotification.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = existingNotification[0];
    if (user.role !== 'admin' && 
        user.id !== notification.customer_id && 
        user.id !== notification.business_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await sql`
      UPDATE customer_notifications
      SET 
        is_read = COALESCE(${is_read}, is_read),
        action_taken = COALESCE(${action_taken}, action_taken),
        read_at = CASE WHEN ${is_read} THEN NOW() ELSE read_at END,
        action_taken_at = CASE WHEN ${action_taken} THEN NOW() ELSE action_taken_at END,
        data = CASE WHEN ${action_data} IS NOT NULL THEN 
                 COALESCE(data, '{}'::jsonb) || ${JSON.stringify(action_data || {})}::jsonb
               ELSE data END
      WHERE id = ${notificationId}
      RETURNING *
    `;

    return res.status(200).json({ notification: updated[0] });
  } catch (error) {
    console.error('Update notification error:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
}

/**
 * Handle Customer Cards endpoint
 */
async function handleCustomerCards(req: VercelRequest, res: VercelResponse, user: any, sql: any, customerId: string) {
  if (user.role !== 'admin' && user.id !== parseInt(customerId) && user.role !== 'business') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const cards = await sql`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.business_id,
        lc.program_id,
        lc.card_number,
        lc.card_type,
        lc.tier,
        lc.points,
        lc.points_balance,
        lc.total_points_earned,
        lc.status,
        lc.created_at,
        lc.updated_at,
        lc.qr_code_url,
        lp.name AS program_name,
        lp.description AS program_description,
        u.name AS business_name,
        u.email AS business_email
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lp.id = lc.program_id
      JOIN users u ON u.id = lc.business_id
      WHERE lc.customer_id = ${parseInt(customerId)}
        AND lc.status = 'ACTIVE'
      ORDER BY lc.created_at DESC
    `;

    return res.status(200).json({ cards });
  } catch (error) {
    console.error('Customer cards error:', error);
    return res.status(500).json({ error: 'Failed to fetch customer cards' });
  }
}

/**
 * Handle Customer Programs endpoint
 */
async function handleCustomerPrograms(req: VercelRequest, res: VercelResponse, user: any, sql: any, customerId: string) {
  if (user.role !== 'admin' && user.id !== parseInt(customerId) && user.role !== 'business') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const programs = await sql`
      SELECT DISTINCT
        lp.id,
        lp.name,
        lp.description,
        lp.business_id,
        lp.points_per_dollar,
        lp.is_active,
        lp.created_at,
        u.name AS business_name,
        u.email AS business_email,
        lc.id AS card_id,
        lc.points,
        lc.points_balance,
        lc.total_points_earned,
        lc.card_number,
        lc.card_type,
        lc.tier,
        lc.status AS card_status,
        lc.created_at AS enrollment_date
      FROM loyalty_programs lp
      JOIN loyalty_cards lc ON lc.program_id = lp.id
      JOIN users u ON u.id = lp.business_id
      WHERE lc.customer_id = ${parseInt(customerId)}
        AND lc.status = 'ACTIVE'
      ORDER BY lc.created_at DESC
    `;

    return res.status(200).json({ programs });
  } catch (error) {
    console.error('Customer programs error:', error);
    return res.status(500).json({ error: 'Failed to fetch customer programs' });
  }
}

/**
 * Handle User by ID endpoint
 */
async function handleUserById(req: VercelRequest, res: VercelResponse, user: any, sql: any, userId: string) {
  if (user.role !== 'admin' && user.id !== parseInt(userId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const users = await sql`
      SELECT 
        id, name, email, phone, user_type, role, status,
        business_name, business_phone, avatar_url, created_at, last_login
      FROM users
      WHERE id = ${parseInt(userId)}
      AND status != 'deleted'
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error('User by ID error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * Handle Security Audit endpoint
 */
async function handleSecurityAudit(req: VercelRequest, res: VercelResponse, user: any, sql: any) {
  if (req.method === 'GET') {
    try {
      const logs = await sql`
        SELECT 
          id, user_id, event, ip_address, user_agent, metadata, created_at
        FROM security_audit_logs
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return res.status(200).json({ logs });
    } catch (error) {
      console.error('Security audit error:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  if (req.method === 'POST') {
    const { event, metadata, ipAddress, userAgent } = (req.body || {}) as any;

    if (!event) {
      return res.status(400).json({ error: 'event is required' });
    }

    try {
      await sql`
        INSERT INTO security_audit_logs (
          user_id, event, ip_address, user_agent, metadata, created_at
        ) VALUES (
          ${user.id}, ${event}, ${ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress},
          ${userAgent || req.headers['user-agent']}, ${JSON.stringify(metadata || {})}, NOW()
        )
      `;

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Security audit log error:', error);
      return res.status(500).json({ error: 'Failed to log security event' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}