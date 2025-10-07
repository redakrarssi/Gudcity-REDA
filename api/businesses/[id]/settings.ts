import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../src/utils/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing business ID' });
    }

    const businessIdNum = parseInt(id as string);

    // Get business profile data
    const profileResult = await sql`
      SELECT * FROM business_profile 
      WHERE business_id = ${businessIdNum}
    `;

    if (profileResult.length === 0) {
      // Check if user exists first
      const userResult = await sql`
        SELECT id, name, email, business_name, business_phone FROM users
        WHERE id = ${businessIdNum}
      `;
      
      if (userResult.length === 0) {
        return res.status(404).json({ error: 'Business not found' });
      }
      
      const user = userResult[0];
      
      // Create basic profile if user exists
      await sql`
        INSERT INTO business_profile (
          business_id,
          business_name,
          email,
          phone
        ) VALUES (
          ${businessIdNum},
          ${user.name},
          ${user.email},
          ${user.business_phone || ''}
        )
      `;
      
      // Fetch the newly created profile
      const newResult = await sql`
        SELECT * FROM business_profile 
        WHERE business_id = ${businessIdNum}
      `;
      
      profileResult[0] = newResult[0];
    }

    const profile = profileResult[0];

    // Get business settings
    let businessSettings = null;
    
    try {
      const settingsResult = await sql`
        SELECT * FROM business_settings
        WHERE business_id = ${businessIdNum}
      `;
      
      if (settingsResult.length > 0) {
        businessSettings = settingsResult[0];
      } else {
        // Create default settings
        await sql`
          INSERT INTO business_settings (
            business_id,
            points_per_dollar,
            points_expiry_days,
            minimum_points_redemption,
            welcome_bonus
          ) VALUES (
            ${businessIdNum},
            10,
            365,
            100,
            50
          )
          ON CONFLICT (business_id) DO NOTHING
        `;
        
        // Fetch newly created settings
        const newSettingsResult = await sql`
          SELECT * FROM business_settings
          WHERE business_id = ${businessIdNum}
        `;
        
        if (newSettingsResult.length > 0) {
          businessSettings = newSettingsResult[0];
        }
      }
    } catch (e) {
      console.error('Error fetching business_settings:', e);
    }

    // Get user data as fallback
    const userResult = await sql`
      SELECT * FROM users
      WHERE id = ${businessIdNum}
    `;
    
    const user = userResult.length > 0 ? userResult[0] : null;

    // Combine settings data
    const combinedSettings = {
      id: businessIdNum,
      name: profile.business_name || user?.name || '',
      businessName: profile.business_name || user?.name || '',
      email: profile.email || user?.email || '',
      phone: profile.phone || user?.business_phone || '',
      address: profile.address_line1 || '',
      city: profile.city || '',
      state: profile.state || '',
      zip: profile.zip || '',
      country: profile.country || '',
      website: profile.website_url || '',
      description: profile.description || '',
      logo: profile.logo_url || '',
      currency: businessSettings?.currency || 'USD',
      pointsPerDollar: businessSettings?.points_per_dollar || 10,
      pointsExpiryDays: businessSettings?.points_expiry_days || 365,
      minimumPointsRedemption: businessSettings?.minimum_points_redemption || 100,
      welcomeBonus: businessSettings?.welcome_bonus || 50,
      createdAt: profile.created_at || new Date().toISOString(),
      updatedAt: profile.updated_at || new Date().toISOString()
    };

    res.status(200).json(combinedSettings);
  } catch (error) {
    console.error('Error fetching business settings:', error);
    res.status(500).json({ error: 'Failed to fetch business settings' });
  }
}
