import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../../_lib/db.js';
import { verifyAuth, verifyBusinessAccess, cors, rateLimitFactory } from '../../_lib/auth.js';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { businessId } = req.query as { businessId: string };
  if (!businessId || isNaN(Number(businessId))) return res.status(400).json({ error: 'Valid businessId required' });
  const canAccess = await verifyBusinessAccess(user.id, businessId);
  if (!canAccess) return res.status(403).json({ error: 'Forbidden' });

  const segments = (req.query.segments as string[] | undefined) || [];
  const sql = requireSql();

  try {
    // /api/business/:businessId/analytics (GET)
    if (segments.length === 1 && segments[0] === 'analytics' && req.method === 'GET') {
      const [
        totalPointsRows,
        totalRedRows,
        activeCustRows,
        totalProgramsRows,
        totalPromoRows,
        avgPtsRows,
        popularRewardsRows,
        engagementRows,
        pointsDistRows,
        topProgramsRows
      ] = await Promise.all([
        sql`SELECT COALESCE(SUM(points),0) AS total FROM card_activities ca JOIN loyalty_cards lc ON lc.id = ca.card_id WHERE lc.business_id = ${Number(businessId)} AND ca.activity_type = 'EARN_POINTS'`,
        sql`SELECT COUNT(*)::int AS total FROM redemptions WHERE business_id = ${Number(businessId)} AND status IN ('COMPLETED','FULFILLED')`,
        sql`SELECT COUNT(DISTINCT customer_id)::int AS total FROM loyalty_cards WHERE business_id = ${Number(businessId)} AND updated_at >= NOW() - INTERVAL '30 days'`,
        sql`SELECT COUNT(*)::int AS total FROM loyalty_programs WHERE business_id = ${Number(businessId)}`,
        sql`SELECT COUNT(*)::int AS total FROM promo_codes WHERE business_id = ${Number(businessId)}`,
        sql`SELECT COALESCE(AVG(sub.total_pts),0) AS avg FROM (
              SELECT lc.customer_id, COALESCE(SUM(ca.points),0) AS total_pts
              FROM loyalty_cards lc
              LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
              WHERE lc.business_id = ${Number(businessId)}
              GROUP BY lc.customer_id
            ) sub`,
        sql`SELECT reward AS name, COUNT(*)::int AS count
            FROM redemptions 
            WHERE business_id = ${Number(businessId)} 
            GROUP BY reward
            ORDER BY COUNT(*) DESC
            LIMIT 10`,
        sql`SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS value
            FROM card_activities ca
            JOIN loyalty_cards lc ON lc.id = ca.card_id
            WHERE lc.business_id = ${Number(businessId)}
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY DATE_TRUNC('day', created_at) DESC
            LIMIT 30`,
        sql`SELECT 
              CASE 
                WHEN points <= 50 THEN '0-50'
                WHEN points <= 100 THEN '51-100'
                WHEN points <= 250 THEN '101-250'
                WHEN points <= 500 THEN '251-500'
                ELSE '500+'
              END AS category,
              COUNT(*)::int AS value
            FROM (
              SELECT COALESCE(SUM(ca.points),0) AS points
              FROM loyalty_cards lc
              LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
              WHERE lc.business_id = ${Number(businessId)}
              GROUP BY lc.customer_id
            ) t
            GROUP BY category
            ORDER BY category`,
        sql`SELECT lp.name, COUNT(DISTINCT lc.customer_id)::int AS customers, COALESCE(SUM(ca.points),0)::int AS points
            FROM loyalty_programs lp
            LEFT JOIN loyalty_cards lc ON lc.program_id = lp.id
            LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
            WHERE lp.business_id = ${Number(businessId)}
            GROUP BY lp.id
            ORDER BY points DESC
            LIMIT 5`
      ]);

      const totalCustomers = Number(activeCustRows?.[0]?.total || 0);
      const totalRedemptions = Number(totalRedRows?.[0]?.total || 0);
      const totalPoints = Number(totalPointsRows?.[0]?.total || 0);
      const retentionRate = totalCustomers;
      const redemptionRate = totalCustomers > 0 ? Math.min(100, Math.round((totalRedemptions / totalCustomers) * 100)) : 0;

      return res.status(200).json({
        totalPoints,
        totalRedemptions,
        activeCustomers: totalCustomers,
        retentionRate,
        redemptionRate,
        popularRewards: (popularRewardsRows || []).map((r: any) => ({ reward: r.name, count: Number(r.count) })),
        customerEngagement: (engagementRows || []).reverse(),
        pointsDistribution: (pointsDistRows || []),
        totalPrograms: Number(totalProgramsRows?.[0]?.total || 0),
        totalPromoCodes: Number(totalPromoRows?.[0]?.total || 0),
        averagePointsPerCustomer: Number(avgPtsRows?.[0]?.avg || 0),
        topPerformingPrograms: (topProgramsRows || []).map((r: any) => ({ name: r.name, customers: Number(r.customers), points: Number(r.points) }))
      });
    }

    // /api/business/:businessId/settings (GET/PUT)
    if (segments.length === 1 && segments[0] === 'settings') {
      if (req.method === 'GET') {
        const profile = await sql`SELECT * FROM business_profile WHERE business_id = ${Number(businessId)} LIMIT 1`;
        const settings = await sql`SELECT * FROM business_settings WHERE business_id = ${Number(businessId)} LIMIT 1`;
        return res.status(200).json({ profile: profile?.[0] || null, settings: settings?.[0] || null });
      } else if (req.method === 'PUT') {
        const body = (req.body || {}) as any;
        if (body.profile && typeof body.profile === 'object') {
          const p = body.profile;
          await sql`
            INSERT INTO business_profile (business_id, business_name, email, phone, address_line1, language, country, currency, timezone, tax_id, business_hours, payment_settings, notification_settings, integrations)
            VALUES (
              ${Number(businessId)},
              ${p.business_name || p.name || null},
              ${p.email || null},
              ${p.phone || null},
              ${p.address_line1 || p.address || null},
              ${p.language || 'en'},
              ${p.country || null},
              ${p.currency || 'EUR'},
              ${p.timezone || 'UTC'},
              ${p.tax_id || null},
              ${p.business_hours ? JSON.stringify(p.business_hours) : null},
              ${p.payment_settings ? JSON.stringify(p.payment_settings) : null},
              ${p.notification_settings ? JSON.stringify(p.notification_settings) : null},
              ${p.integrations ? JSON.stringify(p.integrations) : null}
            )
            ON CONFLICT (business_id) DO UPDATE SET
              business_name = EXCLUDED.business_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              address_line1 = EXCLUDED.address_line1,
              language = EXCLUDED.language,
              country = EXCLUDED.country,
              currency = EXCLUDED.currency,
              timezone = EXCLUDED.timezone,
              tax_id = EXCLUDED.tax_id,
              business_hours = COALESCE(EXCLUDED.business_hours, business_profile.business_hours),
              payment_settings = COALESCE(EXCLUDED.payment_settings, business_profile.payment_settings),
              notification_settings = COALESCE(EXCLUDED.notification_settings, business_profile.notification_settings),
              integrations = COALESCE(EXCLUDED.integrations, business_profile.integrations),
              updated_at = NOW()
          `;
        }
        if (body.settings && typeof body.settings === 'object') {
          const s = body.settings;
          await sql`
            INSERT INTO business_settings (business_id, points_per_dollar, points_expiry_days, minimum_points_redemption, welcome_bonus)
            VALUES (
              ${Number(businessId)},
              ${s.points_per_dollar ?? 10},
              ${s.points_expiry_days ?? 365},
              ${s.minimum_points_redemption ?? 100},
              ${s.welcome_bonus ?? 50}
            )
            ON CONFLICT (business_id) DO UPDATE SET
              points_per_dollar = EXCLUDED.points_per_dollar,
              points_expiry_days = EXCLUDED.points_expiry_days,
              minimum_points_redemption = EXCLUDED.minimum_points_redemption,
              welcome_bonus = EXCLUDED.welcome_bonus,
              updated_at = NOW()
          `;
        }
        const profile = await sql`SELECT * FROM business_profile WHERE business_id = ${Number(businessId)} LIMIT 1`;
        const settings = await sql`SELECT * FROM business_settings WHERE business_id = ${Number(businessId)} LIMIT 1`;
        return res.status(200).json({ profile: profile?.[0] || null, settings: settings?.[0] || null });
      }
    }

    // /api/business/:businessId/notifications (GET)
    if (segments.length === 1 && segments[0] === 'notifications' && req.method === 'GET') {
      const rows = await sql`SELECT cn.id, cn.type, cn.title, cn.message, cn.customer_id, cn.business_id, cn.reference_id, cn.data, cn.created_at
        FROM customer_notifications cn
        WHERE cn.business_id = ${Number(businessId)} AND cn.type IN ('ENROLLMENT_ACCEPTED','ENROLLMENT_REJECTED','NEW_ENROLLMENT','ENROLLMENT_REQUEST')
        ORDER BY cn.created_at DESC
        LIMIT 50`;
      return res.status(200).json({ notifications: rows });
    }

    // /api/business/:businessId/redemption-notifications (GET)
    if (segments.length === 1 && segments[0] === 'redemption-notifications' && req.method === 'GET') {
      await sql`CREATE TABLE IF NOT EXISTS redemption_notifications (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        business_id VARCHAR(255) NOT NULL,
        program_id VARCHAR(255) NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        reward TEXT NOT NULL,
        reward_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`;
      const rows = await sql`SELECT id, customer_id, business_id, program_id, points, reward, reward_id, status, is_read, created_at AS timestamp
        FROM redemption_notifications WHERE business_id = ${String(businessId)} ORDER BY created_at DESC LIMIT 50`;
      return res.status(200).json({ notifications: rows });
    }

    // /api/business/:businessId/approvals/pending (GET)
    if (segments.length === 2 && segments[0] === 'approvals' && segments[1] === 'pending' && req.method === 'GET') {
      const rows = await sql`SELECT cn.id, cn.type, cn.title, cn.message, cn.customer_id, cn.business_id, cn.reference_id, cn.data, cn.created_at
        FROM customer_notifications cn
        WHERE cn.business_id = ${Number(businessId)}
          AND cn.type = 'ENROLLMENT_REQUEST'
          AND (cn.data::jsonb)->>'status' IS DISTINCT FROM 'accepted'
          AND (cn.data::jsonb)->>'status' IS DISTINCT FROM 'rejected'
        ORDER BY cn.created_at DESC
        LIMIT 50`;
      return res.status(200).json({ approvals: rows });
    }

    // /api/business/:businessId/programs/count (GET)
    if (segments.length === 2 && segments[0] === 'programs' && segments[1] === 'count' && req.method === 'GET') {
      const rows = await sql`SELECT COUNT(*)::int AS total FROM loyalty_programs WHERE business_id = ${Number(businessId)}`;
      return res.status(200).json({ totalPrograms: Number(rows?.[0]?.total || 0) });
    }

    // /api/business/:businessId/promo-codes/count (GET)
    if (segments.length === 2 && segments[0] === 'promo-codes' && segments[1] === 'count' && req.method === 'GET') {
      const rows = await sql`SELECT COUNT(*)::int AS total FROM promo_codes WHERE business_id = ${Number(businessId)}`;
      return res.status(200).json({ totalPromoCodes: Number(rows?.[0]?.total || 0) });
    }

    // /api/business/:businessId/programs/top-performing (GET)
    if (segments.length === 2 && segments[0] === 'programs' && segments[1] === 'top-performing' && req.method === 'GET') {
      const rows = await sql`SELECT lp.name, COUNT(DISTINCT lc.customer_id)::int AS customers, COALESCE(SUM(ca.points),0)::int AS points
        FROM loyalty_programs lp
        LEFT JOIN loyalty_cards lc ON lc.program_id = lp.id
        LEFT JOIN card_activities ca ON ca.card_id = lc.id AND ca.activity_type = 'EARN_POINTS'
        WHERE lp.business_id = ${Number(businessId)}
        GROUP BY lp.id
        ORDER BY points DESC
        LIMIT 5`;
      return res.status(200).json({ topPerformingPrograms: rows });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error('Business catch-all handler error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}

