import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(60, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const sql = requireSql();

  try {
    const { businessId } = req.query;
    const bizId = businessId ? parseInt(String(businessId)) : user.id;

    // Verify access
    if (user.role !== 'admin' && user.id !== bizId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      // Get business settings
      const businessData = await sql`
        SELECT 
          id, name, business_name, email, phone, business_phone,
          business_address, avatar_url, status, created_at, last_login,
          role, user_type, permissions
        FROM users 
        WHERE id = ${bizId} AND (user_type = 'business' OR role = 'business')
      `;

      if (businessData.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      // Get business-specific settings from business_settings table if it exists
      let businessSettings = {};
      try {
        const settings = await sql`
          SELECT * FROM business_settings 
          WHERE business_id = ${bizId}
        `;
        if (settings.length > 0) {
          businessSettings = settings[0];
        }
      } catch (error) {
        // business_settings table might not exist, that's ok
      }

      return res.status(200).json({
        business: businessData[0],
        settings: businessSettings
      });
    }

    if (req.method === 'PUT') {
      // Update business settings
      const {
        name,
        business_name,
        phone,
        business_phone,
        business_address,
        avatar_url,
        settings
      } = req.body;

      // Update user table
      const updatedBusiness = await sql`
        UPDATE users 
        SET 
          name = COALESCE(${name}, name),
          business_name = COALESCE(${business_name}, business_name),
          phone = COALESCE(${phone}, phone),
          business_phone = COALESCE(${business_phone}, business_phone),
          business_address = COALESCE(${business_address}, business_address),
          avatar_url = COALESCE(${avatar_url}, avatar_url),
          updated_at = NOW()
        WHERE id = ${bizId}
        RETURNING *
      `;

      // Update or insert business settings if provided
      if (settings && typeof settings === 'object') {
        try {
          await sql`
            INSERT INTO business_settings (business_id, settings, updated_at)
            VALUES (${bizId}, ${JSON.stringify(settings)}, NOW())
            ON CONFLICT (business_id) 
            DO UPDATE SET 
              settings = ${JSON.stringify(settings)},
              updated_at = NOW()
          `;
        } catch (error) {
          // business_settings table might not exist, that's ok
          console.warn('Could not update business_settings table:', error);
        }
      }

      if (updatedBusiness.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }

      return res.status(200).json({ business: updatedBusiness[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Business settings API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
