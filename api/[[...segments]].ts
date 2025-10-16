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
  const publicRoutes = ['promotions', 'pages'];
  const isPublicRoute = segments.length > 0 && publicRoutes.includes(segments[0]);

  const user = !isPublicRoute ? await verifyAuth(req) : null;
  if (!isPublicRoute && !user) return res.status(401).json({ error: 'Unauthorized' });

  try {
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
      
      // Try both with and without leading slash to match database format
      const pages = await sql`
        SELECT * FROM pages
        WHERE (slug = ${`/${slug}`} OR slug = ${slug})
        AND status = 'published'
      `;
      
      if (pages.length === 0) {
        // If not found, return a basic fallback for common pages
        if (slug === 'pricing') {
          return res.status(200).json({ 
            page: {
              id: 0,
              title: 'Pricing Plans',
              slug: '/pricing',
              content: '<h1>Simple, Transparent Pricing</h1><p>Choose the plan that works best for your business.</p>',
              template: 'default',
              status: 'published',
              is_system: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          });
        }
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

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Catch-all API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}