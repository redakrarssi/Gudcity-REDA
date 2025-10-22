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
  const publicRoutes = ['promotions', 'pages', 'debug'];
  const isPublicRoute = segments.length > 0 && publicRoutes.includes(segments[0]);

  const user = !isPublicRoute ? await verifyAuth(req) : null;
  if (!isPublicRoute && !user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Route: /api/debug/health - Debug endpoint for diagnosing login issues
    if (segments.length === 2 && segments[0] === 'debug' && segments[1] === 'health' && req.method === 'GET') {
      console.log('[Debug Health] Health check requested');
      
      const checks = {
        timestamp: new Date().toISOString(),
        environment: {} as any,
        database: {} as any,
        tables: {} as any,
      };

      // Check environment variables
      try {
        checks.environment = {
          NODE_ENV: process.env.NODE_ENV || 'not set',
          hasJWT_SECRET: !!(process.env.JWT_SECRET || process.env.VITE_JWT_SECRET),
          hasDATABASE_URL: !!(
            process.env.DATABASE_URL || 
            process.env.POSTGRES_URL || 
            process.env.VITE_DATABASE_URL ||
            process.env.VITE_POSTGRES_URL
          ),
          hasVERCEL_URL: !!process.env.VERCEL_URL,
        };
        console.log('[Debug Health] Environment check completed');
      } catch (envError) {
        checks.environment = { error: envError.message };
        console.error('[Debug Health] Environment check failed:', envError);
      }

      // Check database connection
      try {
        const testResult = await sql`SELECT 1 as test`;
        checks.database = { 
          connected: true, 
          testQuery: testResult.length > 0 ? 'success' : 'failed' 
        };
        console.log('[Debug Health] Database connection successful');
      } catch (dbError) {
        checks.database = { 
          connected: false, 
          error: dbError.message 
        };
        console.error('[Debug Health] Database check failed:', dbError);
      }

      // Check required tables
      if (checks.database.connected) {
        try {
          // Check users table
          try {
            const userCount = await sql`SELECT COUNT(*) as count FROM users LIMIT 1`;
            checks.tables.users = { exists: true, count: userCount[0]?.count || 0 };
          } catch (userError) {
            checks.tables.users = { exists: false, error: userError.message };
          }

          // Check auth_tokens table
          try {
            const tokenCount = await sql`SELECT COUNT(*) as count FROM auth_tokens LIMIT 1`;
            checks.tables.auth_tokens = { exists: true, count: tokenCount[0]?.count || 0 };
          } catch (tokenError) {
            checks.tables.auth_tokens = { exists: false, error: tokenError.message };
          }

          console.log('[Debug Health] Table checks completed');
        } catch (tableError) {
          checks.tables = { error: tableError.message };
          console.error('[Debug Health] Table check failed:', tableError);
        }
      }

      const allGood = 
        checks.environment.hasJWT_SECRET &&
        checks.environment.hasDATABASE_URL &&
        checks.database.connected &&
        checks.tables.users?.exists;

      console.log('[Debug Health] Health check completed:', { allGood });

      return res.status(200).json({
        status: allGood ? 'healthy' : 'unhealthy',
        checks,
      });
    }

    // Route: /api/promotions
    if (segments.length === 1 && segments[0] === 'promotions' && req.method === 'GET') {
      const { businessId } = req.query;

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
    }

    // Route: /api/pages/:slug
    if (segments.length === 2 && segments[0] === 'pages' && req.method === 'GET') {
      const slug = segments[1];
      
      const pages = await sql`
        SELECT * FROM pages
        WHERE slug = ${`/${slug}`}
        AND status = 'published'
      `;
      
      if (pages.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }
      
      const page = {
        id: pages[0].id,
        title: pages[0].title,
        slug: pages[0].slug,
        content: pages[0].content,
        template: pages[0].template,
        status: pages[0].status,
        is_system: pages[0].is_system,
        created_at: pages[0].created_at,
        updated_at: pages[0].updated_at
      };
      
      return res.status(200).json({ page });
    }

    // Route: /api/dashboard/stats
    if (segments.length === 2 && segments[0] === 'dashboard' && segments[1] === 'stats' && req.method === 'GET') {
      const { type, businessId, customerId } = req.query;

      if (type === 'admin' && user!.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      if (type === 'admin') {
        const [
          totalUsers,
          totalBusinesses,
          totalCustomers,
          totalPrograms,
          totalTransactions,
          recentActivity
        ] = await Promise.all([
          sql`SELECT COUNT(*) as count FROM users WHERE status = 'active'`,
          sql`SELECT COUNT(*) as count FROM users WHERE user_type = 'business' AND status = 'active'`,
          sql`SELECT COUNT(*) as count FROM users WHERE user_type = 'customer' AND status = 'active'`,
          sql`SELECT COUNT(*) as count FROM loyalty_programs WHERE is_active = true`,
          sql`SELECT COUNT(*) as count FROM point_transactions WHERE created_at >= NOW() - INTERVAL '30 days'`,
          sql`
            SELECT u.name, u.email, u.created_at, u.user_type 
            FROM users u 
            WHERE u.created_at >= NOW() - INTERVAL '7 days' 
            ORDER BY u.created_at DESC 
            LIMIT 10
          `
        ]);

        return res.status(200).json({
          totalUsers: parseInt(totalUsers[0]?.count || '0'),
          totalBusinesses: parseInt(totalBusinesses[0]?.count || '0'),
          totalCustomers: parseInt(totalCustomers[0]?.count || '0'),
          totalPrograms: parseInt(totalPrograms[0]?.count || '0'),
          totalTransactions: parseInt(totalTransactions[0]?.count || '0'),
          recentActivity: recentActivity
        });
      }

      if (type === 'business') {
        const bizId = businessId || user!.id;
        
        if (user!.role !== 'admin' && user!.id !== parseInt(String(bizId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const [
          totalCustomers,
          totalPrograms,
          totalPoints,
          totalRedemptions,
          recentTransactions
        ] = await Promise.all([
          sql`
            SELECT COUNT(DISTINCT lc.customer_id) as count 
            FROM loyalty_cards lc 
            WHERE lc.business_id = ${parseInt(String(bizId))} AND lc.status = 'ACTIVE'
          `,
          sql`SELECT COUNT(*) as count FROM loyalty_programs WHERE business_id = ${parseInt(String(bizId))} AND is_active = true`,
          sql`SELECT SUM(points) as total FROM loyalty_cards WHERE business_id = ${parseInt(String(bizId))} AND status = 'ACTIVE'`,
          sql`SELECT COUNT(*) as count FROM redemptions r JOIN loyalty_cards lc ON r.card_id = lc.id WHERE lc.business_id = ${parseInt(String(bizId))}`,
          sql`
            SELECT pt.*, u.name as customer_name 
            FROM point_transactions pt 
            JOIN users u ON pt.customer_id = u.id 
            WHERE pt.business_id = ${parseInt(String(bizId))} 
            ORDER BY pt.created_at DESC 
            LIMIT 10
          `
        ]);

        return res.status(200).json({
          totalCustomers: parseInt(totalCustomers[0]?.count || '0'),
          totalPrograms: parseInt(totalPrograms[0]?.count || '0'),
          totalPointsAwarded: parseInt(totalPoints[0]?.total || '0'),
          totalRedemptions: parseInt(totalRedemptions[0]?.count || '0'),
          recentTransactions: recentTransactions
        });
      }

      if (type === 'customer') {
        const custId = customerId || user!.id;
        
        if (user!.role !== 'admin' && user!.id !== parseInt(String(custId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

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
      }

      return res.status(400).json({ error: 'Invalid dashboard type. Must be admin, business, or customer' });
    }

    // Route: /api/users
    if (segments.length === 1 && segments[0] === 'users') {
      if (req.method === 'GET') {
        if (user!.role !== 'admin') {
          return res.status(403).json({ error: 'Admin access required' });
        }

        const users = await sql`
          SELECT id, name, email, role, user_type, business_name, business_phone, 
                 avatar_url, business_owner_id, permissions, created_by, created_at, 
                 last_login, status 
          FROM users 
          WHERE status != 'deleted'
          ORDER BY created_at DESC
        `;

        return res.status(200).json({ users });
      }

      if (req.method === 'POST') {
        if (user!.role !== 'admin') {
          return res.status(403).json({ error: 'Admin access required' });
        }

        const { name, email, role, user_type, business_name, permissions } = req.body;

        if (!name || !email || !role) {
          return res.status(400).json({ error: 'Name, email, and role are required' });
        }

        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
          return res.status(400).json({ error: 'User with this email already exists' });
        }

        const newUser = await sql`
          INSERT INTO users (name, email, role, user_type, business_name, permissions, created_by, created_at, status)
          VALUES (${name}, ${email}, ${role}, ${user_type || 'customer'}, ${business_name || null}, 
                  ${JSON.stringify(permissions || {})}, ${user!.id}, NOW(), 'active')
          RETURNING *
        `;

        return res.status(201).json({ user: newUser[0] });
      }
    }

    // Route: /api/customers
    if (segments.length === 1 && segments[0] === 'customers' && req.method === 'GET') {
      const { businessId } = req.query;

      if (businessId) {
        if (user!.role !== 'admin' && user!.id !== parseInt(String(businessId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const customers = await sql`
          SELECT DISTINCT 
            u.id, u.name, u.email, u.phone, u.created_at,
            COUNT(lc.id) as total_cards,
            SUM(lc.points) as total_points,
            MAX(lc.created_at) as last_activity
          FROM users u
          JOIN loyalty_cards lc ON u.id = lc.customer_id
          WHERE lc.business_id = ${parseInt(String(businessId))} 
            AND lc.status = 'ACTIVE'
            AND u.user_type = 'customer'
          GROUP BY u.id, u.name, u.email, u.phone, u.created_at
          ORDER BY last_activity DESC
        `;

        return res.status(200).json({ customers });
      }

      if (user!.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const customers = await sql`
        SELECT id, name, email, phone, created_at, last_login, status
        FROM users 
        WHERE user_type = 'customer' AND status != 'deleted'
        ORDER BY created_at DESC
      `;

      return res.status(200).json({ customers });
    }

    // Handle existing customer routes: /api/customers/:customerId/cards
    if (segments.length === 3 && segments[0] === 'customers' && segments[2] === 'cards' && req.method === 'GET') {
      const customerId = segments[1];
      if (!customerId || isNaN(Number(customerId))) {
        return res.status(400).json({ error: 'Valid customerId required' });
      }

      // Verify user can access this customer data
      if (user!.id !== Number(customerId) && user!.role !== 'admin' && user!.role !== 'business') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Get customer's loyalty cards
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
        WHERE lc.customer_id = ${Number(customerId)}
          AND lc.status = 'ACTIVE'
        ORDER BY lc.created_at DESC
      `;

      // Get recent activities
      const cardActivities = await sql`
        SELECT 
          ca.card_id,
          ca.activity_type,
          ca.points,
          ca.description,
          ca.created_at
        FROM card_activities ca
        JOIN loyalty_cards lc ON lc.id = ca.card_id
        WHERE lc.customer_id = ${Number(customerId)}
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
    }

    // Handle existing customer routes: /api/customers/:customerId/programs
    if (segments.length === 3 && segments[0] === 'customers' && segments[2] === 'programs' && req.method === 'GET') {
      const customerId = segments[1];
      if (!customerId || isNaN(Number(customerId))) {
        return res.status(400).json({ error: 'Valid customerId required' });
      }

      // Verify user can access this customer data
      if (user!.id !== Number(customerId) && user!.role !== 'admin' && user!.role !== 'business') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Get customer's enrolled programs
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
        WHERE lc.customer_id = ${Number(customerId)}
          AND lc.status = 'ACTIVE'
        ORDER BY lc.created_at DESC
      `;

      return res.status(200).json({ programs });
    }

    // Route: /api/customers (GET already handled above) - Enroll customer (POST)
    if (segments.length === 1 && segments[0] === 'customers' && req.method === 'POST') {
      const { businessId, programId } = req.query;
      const { customerId, action } = (req.body || {}) as any;

      if (action === 'enroll' && businessId && programId && customerId) {
        // Verify access
        if (user!.role !== 'admin' && user!.id !== parseInt(String(businessId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Check if customer already enrolled
        const existing = await sql`
          SELECT id FROM loyalty_cards 
          WHERE customer_id = ${parseInt(String(customerId))} 
            AND program_id = ${parseInt(String(programId))}
            AND business_id = ${parseInt(String(businessId))}
        `;

        if (existing.length > 0) {
          return res.status(400).json({ error: 'Customer already enrolled in this program' });
        }

        // Create loyalty card
        const cardNumber = `GC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const newCard = await sql`
          INSERT INTO loyalty_cards (
            customer_id, business_id, program_id, card_number,
            status, card_type, points, tier, points_multiplier, is_active, created_at, updated_at
          ) VALUES (
            ${parseInt(String(customerId))}, ${parseInt(String(businessId))}, ${parseInt(String(programId))},
            ${cardNumber}, 'ACTIVE', 'STANDARD', 0, 'STANDARD', 1.0, TRUE, NOW(), NOW()
          )
          RETURNING *
        `;

        // Also add to program_enrollments
        await sql`
          INSERT INTO program_enrollments (customer_id, program_id, status, current_points, enrolled_at)
          VALUES (${parseInt(String(customerId))}, ${parseInt(String(programId))}, 'ACTIVE', 0, NOW())
          ON CONFLICT (customer_id, program_id) 
          DO UPDATE SET status = 'ACTIVE', enrolled_at = NOW()
        `;

        return res.status(201).json({ card: newCard[0], message: 'Customer enrolled successfully' });
      }

      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    // Route: /api/notifications (GET, POST, PUT)
    if (segments.length === 1 && segments[0] === 'notifications') {
      if (req.method === 'GET') {
        const { customerId, businessId, unread, type } = req.query as any;

        if (customerId) {
          if (user!.role !== 'admin' && user!.id !== parseInt(String(customerId))) {
            return res.status(403).json({ error: 'Access denied' });
          }

          let whereClause = `WHERE customer_id = ${parseInt(String(customerId))}`;
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
        }

        if (businessId) {
          if (user!.role !== 'admin' && user!.id !== parseInt(String(businessId))) {
            return res.status(403).json({ error: 'Access denied' });
          }

          const notifications = await sql`
            SELECT 
              cn.*, u.name as customer_name, u.email as customer_email
            FROM customer_notifications cn
            LEFT JOIN users u ON cn.customer_id = u.id
            WHERE cn.business_id = ${parseInt(String(businessId))}
              AND cn.type IN ('ENROLLMENT_ACCEPTED', 'ENROLLMENT_REJECTED', 'REDEMPTION_REQUEST')
            ORDER BY cn.created_at DESC
            LIMIT 50
          `;

          return res.status(200).json({ notifications });
        }

        if (user!.role === 'admin') {
          const notifications = await sql`
            SELECT 
              cn.*, u.name as customer_name, b.name as business_name
            FROM customer_notifications cn
            LEFT JOIN users u ON cn.customer_id = u.id
            LEFT JOIN users b ON cn.business_id = b.id
            ORDER BY cn.created_at DESC
            LIMIT 100
          `;

          return res.status(200).json({ notifications });
        }

        return res.status(400).json({ error: 'customerId or businessId required' });
      }

      if (req.method === 'POST') {
        const { 
          customer_id, 
          business_id, 
          type, 
          title, 
          message, 
          data,
          requires_action = false,
          priority = 'NORMAL',
          expires_at 
        } = (req.body || {}) as any;

        if (!customer_id || !type || !title) {
          return res.status(400).json({ error: 'customer_id, type, and title are required' });
        }

        if (user!.role !== 'admin' && business_id && user!.id !== parseInt(String(business_id))) {
          return res.status(403).json({ error: 'Cannot create notifications for other businesses' });
        }

        const notification = await sql`
          INSERT INTO customer_notifications (
            customer_id, business_id, type, title, message, data,
            requires_action, priority, expires_at, created_at
          ) VALUES (
            ${parseInt(String(customer_id))}, ${business_id ? parseInt(String(business_id)) : null}, 
            ${type}, ${title}, ${message || ''}, ${JSON.stringify(data || {})},
            ${requires_action}, ${priority}, ${expires_at ? new Date(String(expires_at)) : null}, NOW()
          )
          RETURNING *
        `;

        return res.status(201).json({ notification: notification[0] });
      }

      if (req.method === 'PUT') {
        const { notificationId } = req.query as any;
        const { is_read, action_taken, action_data } = (req.body || {}) as any;

        if (!notificationId) {
          return res.status(400).json({ error: 'notificationId is required' });
        }

        const existingNotification = await sql`
          SELECT * FROM customer_notifications 
          WHERE id = ${notificationId}
        `;

        if (existingNotification.length === 0) {
          return res.status(404).json({ error: 'Notification not found' });
        }

        const notification = existingNotification[0];
        if (user!.role !== 'admin' && 
            user!.id !== notification.customer_id && 
            user!.id !== notification.business_id) {
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
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Route: /api/loyalty/cards (GET, POST)
    if (segments.length === 2 && segments[0] === 'loyalty' && segments[1] === 'cards') {
      if (req.method === 'GET') {
        const { customerId, businessId } = req.query as any;

        if (customerId) {
          if (user!.role !== 'admin' && user!.id !== parseInt(String(customerId))) {
            return res.status(403).json({ error: 'Access denied' });
          }

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
            WHERE lc.customer_id = ${parseInt(String(customerId))}
              AND lc.status = 'ACTIVE'
            ORDER BY lc.created_at DESC
          `;

          return res.status(200).json({ cards });
        }

        if (businessId) {
          if (user!.role !== 'admin' && user!.id !== parseInt(String(businessId))) {
            return res.status(403).json({ error: 'Access denied' });
          }

          const cards = await sql`
            SELECT 
              lc.*,
              u.name as customer_name,
              u.email as customer_email,
              lp.name as program_name
            FROM loyalty_cards lc
            JOIN users u ON u.id = lc.customer_id
            JOIN loyalty_programs lp ON lp.id = lc.program_id
            WHERE lc.business_id = ${parseInt(String(businessId))}
              AND lc.status = 'ACTIVE'
            ORDER BY lc.created_at DESC
          `;

          return res.status(200).json({ cards });
        }

        return res.status(400).json({ error: 'customerId or businessId required' });
      }

      if (req.method === 'POST') {
        const { cardId, points, description, source } = (req.body || {}) as any;

        if (!cardId || !points || Number(points) <= 0) {
          return res.status(400).json({ error: 'Valid cardId and positive points required' });
        }

        // Get card details and verify access
        const cardResult = await sql`
          SELECT lc.*, lp.business_id 
          FROM loyalty_cards lc 
          JOIN loyalty_programs lp ON lp.id = lc.program_id 
          WHERE lc.id = ${parseInt(String(cardId))}
        `;

        if (cardResult.length === 0) {
          return res.status(404).json({ error: 'Card not found' });
        }

        const card = cardResult[0];
        if (user!.role !== 'admin' && user!.id !== card.business_id) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const result = await sql`
          SELECT award_points_to_card(
            ${parseInt(String(cardId))},
            ${parseInt(String(points))},
            ${source || 'API'},
            ${description || 'Points awarded via API'},
            ${`api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
          ) as success
        `;

        if (result?.[0]?.success) {
          const updatedCard = await sql`SELECT * FROM loyalty_cards WHERE id = ${parseInt(String(cardId))}`;
          await sql`
            INSERT INTO card_activities (
              card_id, activity_type, points, description, created_at
            ) VALUES (
              ${parseInt(String(cardId))}, 'POINTS_AWARDED', ${parseInt(String(points))}, 
              ${description || 'Points awarded via API'}, NOW()
            )
          `;
          return res.status(200).json({ success: true, card: updatedCard[0], message: `${points} points awarded successfully` });
        }

        return res.status(500).json({ error: 'Failed to award points' });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Route: /api/businesses/programs (GET, POST, PUT, DELETE)
    if (segments.length >= 2 && segments[0] === 'businesses' && segments[1] === 'programs') {
      const { businessId, programId } = req.query as any;

      if (!businessId) {
        return res.status(400).json({ error: 'businessId is required' });
      }

      // Verify access
      if (user!.role !== 'admin' && user!.id !== parseInt(String(businessId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (req.method === 'GET') {
        const programs = await sql`
          SELECT 
            lp.*,
            COUNT(lc.id) as enrolled_customers,
            SUM(lc.points) as total_points_issued,
            COUNT(r.id) as total_redemptions
          FROM loyalty_programs lp
          LEFT JOIN loyalty_cards lc ON lp.id = lc.program_id AND lc.status = 'ACTIVE'
          LEFT JOIN redemptions r ON lc.id = r.card_id
          WHERE lp.business_id = ${parseInt(String(businessId))}
          GROUP BY lp.id, lp.name, lp.description, lp.business_id, lp.points_per_dollar, 
                   lp.is_active, lp.created_at, lp.updated_at
          ORDER BY lp.created_at DESC
        `;
        return res.status(200).json({ programs });
      }

      if (req.method === 'POST') {
        const { 
          name, 
          description, 
          pointsPerDollar, 
          minimumSpend, 
          rewardThreshold,
          rewardValue,
          isActive = true 
        } = (req.body || {}) as any;

        if (!name) {
          return res.status(400).json({ error: 'Program name is required' });
        }

        const newProgram = await sql`
          INSERT INTO loyalty_programs (
            business_id, name, description, points_per_dollar,
            minimum_spend, reward_threshold, reward_value, is_active, created_at, updated_at
          ) VALUES (
            ${parseInt(String(businessId))}, ${name}, ${description || ''}, ${pointsPerDollar || 1},
            ${minimumSpend || 0}, ${rewardThreshold || 100}, ${rewardValue || 10}, 
            ${isActive}, NOW(), NOW()
          )
          RETURNING *
        `;
        return res.status(201).json({ program: newProgram[0] });
      }

      if (req.method === 'PUT') {
        if (!programId) return res.status(400).json({ error: 'programId is required' });
        const { 
          name, 
          description, 
          pointsPerDollar, 
          minimumSpend, 
          rewardThreshold,
          rewardValue,
          isActive 
        } = (req.body || {}) as any;

        const updated = await sql`
          UPDATE loyalty_programs 
          SET 
            name = COALESCE(${name}, name),
            description = COALESCE(${description}, description),
            points_per_dollar = COALESCE(${pointsPerDollar}, points_per_dollar),
            minimum_spend = COALESCE(${minimumSpend}, minimum_spend),
            reward_threshold = COALESCE(${rewardThreshold}, reward_threshold),
            reward_value = COALESCE(${rewardValue}, reward_value),
            is_active = COALESCE(${isActive}, is_active),
            updated_at = NOW()
          WHERE id = ${parseInt(String(programId))} 
            AND business_id = ${parseInt(String(businessId))}
          RETURNING *
        `;

        if (updated.length === 0) {
          return res.status(404).json({ error: 'Program not found' });
        }

        return res.status(200).json({ program: updated[0] });
      }

      if (req.method === 'DELETE') {
        if (!programId) return res.status(400).json({ error: 'programId is required' });
        const deleted = await sql`
          UPDATE loyalty_programs 
          SET is_active = false, updated_at = NOW()
          WHERE id = ${parseInt(String(programId))} 
            AND business_id = ${parseInt(String(businessId))}
          RETURNING *
        `;

        if (deleted.length === 0) {
          return res.status(404).json({ error: 'Program not found' });
        }
        return res.status(200).json({ message: 'Program deactivated successfully' });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Route: /api/qr/generate - Generate QR code
    if (segments.length === 2 && segments[0] === 'qr' && segments[1] === 'generate' && req.method === 'POST') {
      const { type, customerId, businessId, programId, promoCodeId } = (req.body || {}) as any;

      if (!type || !['customer', 'loyalty', 'promo'].includes(type)) {
        return res.status(400).json({ error: 'Valid type required (customer, loyalty, promo)' });
      }

      // Verify access
      if (type === 'customer' && user!.id !== parseInt(String(customerId)) && user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      if ((type === 'loyalty' || type === 'promo') && user!.id !== parseInt(String(businessId)) && user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Generate QR code data
      const qrData = {
        type,
        customerId: customerId ? parseInt(String(customerId)) : undefined,
        businessId: businessId ? parseInt(String(businessId)) : undefined,
        programId: programId ? parseInt(String(programId)) : undefined,
        promoCodeId: promoCodeId ? parseInt(String(promoCodeId)) : undefined,
        timestamp: new Date().toISOString(),
        id: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      return res.status(200).json({ success: true, qrData });
    }

    // Route: /api/qr/validate - Validate QR code
    if (segments.length === 2 && segments[0] === 'qr' && segments[1] === 'validate' && req.method === 'POST') {
      const { qrData, businessId } = (req.body || {}) as any;

      if (!qrData || !businessId) {
        return res.status(400).json({ error: 'qrData and businessId required' });
      }

      // Verify business access
      if (user!.id !== parseInt(String(businessId)) && user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Basic validation
      const isValid = qrData && qrData.type && qrData.id;

      return res.status(200).json({ valid: isValid, message: isValid ? 'QR code is valid' : 'Invalid QR code' });
    }

    // Route: /api/qr/scan - Log QR scan
    if (segments.length === 2 && segments[0] === 'qr' && segments[1] === 'scan' && req.method === 'POST') {
      const { qrData, businessId, customerId, points } = (req.body || {}) as any;

      if (!qrData || !businessId) {
        return res.status(400).json({ error: 'qrData and businessId required' });
      }

      // Verify business access
      if (user!.id !== parseInt(String(businessId)) && user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Log the scan
      const scanLog = await sql`
        INSERT INTO qr_scan_logs (
          scan_type, scanned_by, scanned_data, customer_id, 
          points_awarded, success, created_at
        ) VALUES (
          ${qrData.type || 'CUSTOMER_CARD'}, ${parseInt(String(businessId))}, 
          ${JSON.stringify(qrData)}, ${customerId ? parseInt(String(customerId)) : null},
          ${points || 0}, TRUE, NOW()
        )
        RETURNING id
      `;

      return res.status(200).json({ success: true, scanLogId: scanLog[0]?.id });
    }

    // Route: /api/transactions - Get transactions or award/redeem points
    if (segments.length === 1 && segments[0] === 'transactions') {
      if (req.method === 'GET') {
        const { customerId, businessId, type } = req.query as any;

        if (customerId) {
          if (user!.id !== parseInt(String(customerId)) && user!.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
          }

          let query = `
            SELECT pt.*, u.name as business_name, lp.name as program_name
            FROM point_transactions pt
            LEFT JOIN users u ON pt.business_id = u.id
            LEFT JOIN loyalty_programs lp ON pt.program_id = lp.id
            WHERE pt.customer_id = ${parseInt(String(customerId))}
          `;

          if (type) query += ` AND pt.transaction_type = '${type}'`;
          query += ` ORDER BY pt.created_at DESC LIMIT 50`;

          const transactions = await sql.unsafe(query);
          return res.status(200).json({ transactions });
        }

        if (businessId) {
          if (user!.id !== parseInt(String(businessId)) && user!.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
          }

          const transactions = await sql`
            SELECT pt.*, u.name as customer_name, lp.name as program_name
            FROM point_transactions pt
            LEFT JOIN users u ON pt.customer_id = u.id
            LEFT JOIN loyalty_programs lp ON pt.program_id = lp.id
            WHERE pt.business_id = ${parseInt(String(businessId))}
            ORDER BY pt.created_at DESC LIMIT 100
          `;

          return res.status(200).json({ transactions });
        }

        return res.status(400).json({ error: 'customerId or businessId required' });
      }

      if (req.method === 'POST') {
        const { action, customerId, businessId, programId, points, description } = (req.body || {}) as any;

        if (!action || !['award', 'redeem'].includes(action)) {
          return res.status(400).json({ error: 'Valid action required (award or redeem)' });
        }

        if (!customerId || !businessId || !programId || !points || Number(points) <= 0) {
          return res.status(400).json({ error: 'customerId, businessId, programId, and positive points required' });
        }

        // Verify business access
        if (user!.id !== parseInt(String(businessId)) && user!.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Check if customer is enrolled
        const enrollment = await sql`
          SELECT lc.* FROM loyalty_cards lc
          WHERE lc.customer_id = ${parseInt(String(customerId))}
            AND lc.business_id = ${parseInt(String(businessId))}
            AND lc.program_id = ${parseInt(String(programId))}
            AND lc.status = 'ACTIVE'
        `;

        if (enrollment.length === 0) {
          return res.status(400).json({ error: 'Customer not enrolled in this program' });
        }

        const card = enrollment[0];

        if (action === 'award') {
          // Award points
          await sql`
            UPDATE loyalty_cards
            SET points = points + ${parseInt(String(points))},
                points_balance = COALESCE(points_balance, 0) + ${parseInt(String(points))},
                total_points_earned = COALESCE(total_points_earned, 0) + ${parseInt(String(points))},
                updated_at = NOW()
            WHERE id = ${card.id}
          `;

          // Record transaction
          await sql`
            INSERT INTO point_transactions (
              customer_id, business_id, program_id, points, 
              transaction_type, description, created_at
            ) VALUES (
              ${parseInt(String(customerId))}, ${parseInt(String(businessId))}, 
              ${parseInt(String(programId))}, ${parseInt(String(points))},
              'AWARD', ${description || 'Points awarded'}, NOW()
            )
          `;

          // Log activity
          await sql`
            INSERT INTO card_activities (
              card_id, activity_type, points, description, created_at
            ) VALUES (
              ${card.id}, 'POINTS_AWARDED', ${parseInt(String(points))},
              ${description || 'Points awarded'}, NOW()
            )
          `;

          return res.status(200).json({ success: true, points: parseInt(String(points)), message: 'Points awarded successfully' });
        } else {
          // Redeem points
          if (card.points_balance < parseInt(String(points))) {
            return res.status(400).json({ error: 'Insufficient points balance' });
          }

          await sql`
            UPDATE loyalty_cards
            SET points_balance = points_balance - ${parseInt(String(points))},
                updated_at = NOW()
            WHERE id = ${card.id}
          `;

          // Record transaction
          await sql`
            INSERT INTO point_transactions (
              customer_id, business_id, program_id, points,
              transaction_type, description, created_at
            ) VALUES (
              ${parseInt(String(customerId))}, ${parseInt(String(businessId))},
              ${parseInt(String(programId))}, ${-parseInt(String(points))},
              'REDEEM', ${description || 'Points redeemed'}, NOW()
            )
          `;

          // Log activity
          await sql`
            INSERT INTO card_activities (
              card_id, activity_type, points, description, created_at
            ) VALUES (
              ${card.id}, 'POINTS_REDEEMED', ${parseInt(String(points))},
              ${description || 'Points redeemed'}, NOW()
            )
          `;

          return res.status(200).json({ success: true, points: parseInt(String(points)), message: 'Points redeemed successfully' });
        }
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Route: /api/approvals - Approval management
    if (segments.length === 1 && segments[0] === 'approvals') {
      if (req.method === 'GET') {
        const { status, type } = req.query as any;

        if (user!.role !== 'admin') {
          return res.status(403).json({ error: 'Admin access required' });
        }

        let query = 'SELECT * FROM business_applications WHERE 1=1';
        if (status) query += ` AND status = '${status}'`;
        if (type === 'pending') query += ` AND status = 'pending'`;
        query += ' ORDER BY created_at DESC LIMIT 100';

        const approvals = await sql.unsafe(query);
        return res.status(200).json({ approvals });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Route: /api/approvals/:id - Update approval
    if (segments.length === 2 && segments[0] === 'approvals' && req.method === 'PUT') {
      const approvalId = segments[1];

      if (user!.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { status, notes } = (req.body || {}) as any;

      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Valid status required (approved or rejected)' });
      }

      const updated = await sql`
        UPDATE business_applications
        SET status = ${status},
            reviewed_at = NOW(),
            notes = ${notes || ''}
        WHERE id = ${parseInt(approvalId)}
        RETURNING *
      `;

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Approval not found' });
      }

      return res.status(200).json({ approval: updated[0] });
    }

    // Route: /api/business/:id/settings - Business settings
    if (segments.length === 3 && segments[0] === 'business' && segments[2] === 'settings') {
      const businessId = segments[1];

      if (user!.id !== parseInt(businessId) && user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (req.method === 'GET') {
        const business = await sql`
          SELECT 
            id, name, business_name, business_phone, email, avatar_url,
            business_type, currency, timezone, notification_preferences
          FROM users
          WHERE id = ${parseInt(businessId)} AND user_type = 'business'
        `;

        if (business.length === 0) {
          return res.status(404).json({ error: 'Business not found' });
        }

        return res.status(200).json({ settings: business[0] });
      }

      if (req.method === 'PUT') {
        const { 
          business_name, business_phone, business_type, 
          currency, timezone, notification_preferences 
        } = (req.body || {}) as any;

        const updated = await sql`
          UPDATE users
          SET 
            business_name = COALESCE(${business_name}, business_name),
            business_phone = COALESCE(${business_phone}, business_phone),
            business_type = COALESCE(${business_type}, business_type),
            currency = COALESCE(${currency}, currency),
            timezone = COALESCE(${timezone}, timezone),
            notification_preferences = COALESCE(${notification_preferences ? JSON.stringify(notification_preferences) : null}, notification_preferences),
            updated_at = NOW()
          WHERE id = ${parseInt(businessId)} AND user_type = 'business'
          RETURNING *
        `;

        if (updated.length === 0) {
          return res.status(404).json({ error: 'Business not found' });
        }

        return res.status(200).json({ settings: updated[0] });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Route: /api/analytics/business - Business analytics
    if (segments.length === 2 && segments[0] === 'analytics' && segments[1] === 'business' && req.method === 'GET') {
      const { businessId } = req.query as any;

      if (!businessId) {
        return res.status(400).json({ error: 'businessId required' });
      }

      if (user!.id !== parseInt(String(businessId)) && user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const [
        totalCustomers,
        totalPrograms,
        totalPointsAwarded,
        totalRedemptions,
        avgPointsPerCustomer
      ] = await Promise.all([
        sql`SELECT COUNT(DISTINCT customer_id) as count FROM loyalty_cards WHERE business_id = ${parseInt(String(businessId))} AND status = 'ACTIVE'`,
        sql`SELECT COUNT(*) as count FROM loyalty_programs WHERE business_id = ${parseInt(String(businessId))} AND is_active = true`,
        sql`SELECT COALESCE(SUM(points), 0) as total FROM loyalty_cards WHERE business_id = ${parseInt(String(businessId))} AND status = 'ACTIVE'`,
        sql`SELECT COUNT(*) as count FROM redemptions r JOIN loyalty_cards lc ON r.card_id = lc.id WHERE lc.business_id = ${parseInt(String(businessId))}`,
        sql`SELECT COALESCE(AVG(points), 0) as avg FROM loyalty_cards WHERE business_id = ${parseInt(String(businessId))} AND status = 'ACTIVE'`
      ]);

      return res.status(200).json({
        totalCustomers: parseInt(totalCustomers[0]?.count || '0'),
        totalPrograms: parseInt(totalPrograms[0]?.count || '0'),
        totalPointsAwarded: parseInt(totalPointsAwarded[0]?.total || '0'),
        totalRedemptions: parseInt(totalRedemptions[0]?.count || '0'),
        avgPointsPerCustomer: parseFloat(avgPointsPerCustomer[0]?.avg || '0')
      });
    }

    // Route: /api/security/audit - Log security event
    if (segments.length === 2 && segments[0] === 'security' && segments[1] === 'audit' && req.method === 'POST') {
      const { event, metadata, ipAddress, userAgent } = (req.body || {}) as any;

      if (!event) {
        return res.status(400).json({ error: 'event is required' });
      }

      // Log security event
      await sql`
        INSERT INTO security_audit_logs (
          user_id, event, ip_address, user_agent, metadata, created_at
        ) VALUES (
          ${user!.id}, ${event}, ${ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress},
          ${userAgent || req.headers['user-agent']}, ${JSON.stringify(metadata || {})}, NOW()
        )
      `;

      return res.status(200).json({ success: true });
    }

    // Route: /api/users/:id/settings - User settings
    if (segments.length === 3 && segments[0] === 'users' && segments[2] === 'settings') {
      const userId = segments[1];

      if (user!.id !== parseInt(userId) && user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (req.method === 'GET') {
        const userSettings = await sql`
          SELECT 
            id, name, email, avatar_url, phone, timezone,
            notification_preferences, language, currency
          FROM users
          WHERE id = ${parseInt(userId)}
        `;

        if (userSettings.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({ settings: userSettings[0] });
      }

      if (req.method === 'PUT') {
        const { name, avatar_url, phone, timezone, notification_preferences, language, currency } = (req.body || {}) as any;

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
          WHERE id = ${parseInt(userId)}
          RETURNING *
        `;

        if (updated.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({ settings: updated[0] });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Catch-all API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}