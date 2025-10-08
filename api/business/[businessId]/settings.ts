import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../../_lib/db';
import { verifyAuth, verifyBusinessAccess, cors, rateLimitFactory } from '../../_lib/auth';

const allow = rateLimitFactory(120, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { businessId } = req.query as { businessId: string };
  if (!businessId || isNaN(Number(businessId))) {
    return res.status(400).json({ error: 'Valid businessId required' });
  }
  const canAccess = await verifyBusinessAccess(user.id, businessId);
  if (!canAccess) return res.status(403).json({ error: 'Forbidden' });

  const sql = requireSql();

  try {
    if (req.method === 'GET') {
      const profile = await sql`SELECT * FROM business_profile WHERE business_id = ${Number(businessId)} LIMIT 1`;
      const settings = await sql`SELECT * FROM business_settings WHERE business_id = ${Number(businessId)} LIMIT 1`;
      return res.status(200).json({ profile: profile?.[0] || null, settings: settings?.[0] || null });
    }

    if (req.method === 'PUT') {
      const body = (req.body || {}) as any;
      // Shallow updates to profile/settings as provided (validated server-side)
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

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Business settings error:', error);
    return res.status(500).json({ error: 'Failed to process business settings' });
  }
}

