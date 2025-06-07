import sql from '../src/utils/db';

// Types for business settings
export interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    isClosed: boolean;
  };
}

export interface PaymentSettings {
  acceptsCard: boolean;
  acceptsCash: boolean;
  acceptsOnline: boolean;
  serviceFeePercent: number;
}

export interface LoyaltySettings {
  pointsPerDollar: number;
  pointsExpiryDays: number;
  minimumPointsRedemption: number;
  welcomeBonus: number;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  customerActivity: boolean;
  promotionStats: boolean;
  systemUpdates: boolean;
}

export interface Integrations {
  pos: boolean;
  accounting: boolean;
  marketing: boolean;
  crm: boolean;
}

export interface BusinessSettings {
  id: number;
  businessId: number;
  name: string;
  phone: string;
  email: string; 
  address: string;
  businessName: string;
  description: string;
  website: string;
  logo: string;
  language: string;
  country: string;
  currency: string;
  timezone: string;
  taxId: string;
  businessHours: BusinessHours;
  paymentSettings: PaymentSettings;
  loyaltySettings: LoyaltySettings;
  notificationSettings: NotificationSettings;
  integrations: Integrations;
  createdAt: string;
  updatedAt: string;
}

// Map our internal field names to the actual database column names
const DB_FIELD_MAP = {
  name: 'business_name',
  businessName: 'business_name',
  phone: 'phone',
  email: 'email',
  address: 'address_line1',
  description: 'description',
  website: 'website_url',
  logo: 'logo_url',
  country: 'country',
  currency: 'currency',
  city: 'city',
  state: 'state',
  zip: 'zip'
};

export class BusinessSettingsService {
  /**
   * Get settings for a specific business
   */
  static async getBusinessSettings(businessId: string | number): Promise<BusinessSettings | null> {
    try {
      const businessIdNum = typeof businessId === 'string' ? parseInt(businessId) : businessId;
      
      // First get business profile data
      const profileResult = await sql`
        SELECT * FROM business_profile 
        WHERE business_id = ${businessIdNum}
      `;
      
      // If no profile found, check if user exists first
      if (profileResult.length === 0) {
        const userResult = await sql`
          SELECT id, name, email, business_name, business_phone FROM users
          WHERE id = ${businessIdNum}
        `;
        
        if (userResult.length === 0) {
          console.error(`No user found with ID: ${businessId}`);
          return null;
        }
        
        const user = userResult[0];
        
        // Create basic profile if user exists
        await sql`
          INSERT INTO business_profile (
            business_id,
            name,
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
        
        if (newResult.length > 0) {
          profileResult[0] = newResult[0];
        }
      }
      
      // Now get business settings from business_settings table
      let businessSettings = null;
      
      try {
        // Check if business_settings table exists
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'business_settings'
          ) as exists
        `;
        
        if (tableExists[0]?.exists) {
          // Get settings
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
        }
      } catch (e) {
        console.error('Error fetching business_settings:', e);
      }
      
      // Get user data as fallback for missing fields
      const userResult = await sql`
        SELECT * FROM users
        WHERE id = ${businessIdNum}
      `;
      
      const user = userResult.length > 0 ? userResult[0] : null;
      
      // Combine all data into a single settings object
      const profile = profileResult.length > 0 ? profileResult[0] : null;
      
      return this.combineSettingsData(profile, businessSettings, user);
    } catch (error) {
      console.error('Error getting business settings:', error);
      return null;
    }
  }

  /**
   * Update business settings
   */
  static async updateBusinessSettings(
    businessId: string | number, 
    settings: Partial<BusinessSettings>
  ): Promise<BusinessSettings | null> {
    try {
      const businessIdNum = typeof businessId === 'string' ? parseInt(businessId) : businessId;
      
      console.log('Updating business settings for ID:', businessIdNum);
      console.log('Settings to update:', JSON.stringify(settings, null, 2));
      
      // First, make sure we have a business_profile entry
      const profileResult = await sql`
        SELECT id, name FROM business_profile
        WHERE business_id = ${businessIdNum}
      `;
      
      console.log('Current profile data:', JSON.stringify(profileResult, null, 2));
      
      if (profileResult.length === 0) {
        // Create profile if it doesn't exist
        const userResult = await sql`
          SELECT id, name, email, business_name, business_phone FROM users
          WHERE id = ${businessIdNum}
        `;
        
        if (userResult.length === 0) {
          console.error(`No user found with ID: ${businessId}`);
          return null;
        }
        
        const user = userResult[0];
        
        await sql`
          INSERT INTO business_profile (
            business_id,
            name,
            email,
            phone
          ) VALUES (
            ${businessIdNum},
            ${user.name},
            ${user.email},
            ${user.business_phone || ''}
          )
        `;
      }
      
      // Update business_profile table
      if (settings.name || settings.businessName || settings.phone || settings.email || 
          settings.address || settings.description || settings.website || settings.logo ||
          settings.language || settings.country || settings.currency || settings.timezone || 
          settings.taxId) {
        
        // Get the name value to update
        const nameValue = settings.name || settings.businessName;
        
        // Update business profile fields
        await sql`
          UPDATE business_profile SET
            name = COALESCE(${nameValue}, name),
            phone = COALESCE(${settings.phone}, phone),
            address = COALESCE(${settings.address}, address),
            language = COALESCE(${settings.language}, language),
            country = COALESCE(${settings.country}, country),
            currency = COALESCE(${settings.currency}, currency),
            timezone = COALESCE(${settings.timezone}, timezone),
            tax_id = COALESCE(${settings.taxId}, tax_id),
            updated_at = CURRENT_TIMESTAMP
          WHERE business_id = ${businessIdNum}
        `;
      }
      
      // Update business hours if provided
      if (settings.businessHours) {
        await sql`
          UPDATE business_profile SET
            business_hours = ${JSON.stringify(settings.businessHours)},
            updated_at = CURRENT_TIMESTAMP
          WHERE business_id = ${businessIdNum}
        `;
      }
      
      // Update payment settings if provided
      if (settings.paymentSettings) {
        await sql`
          UPDATE business_profile SET
            payment_settings = ${JSON.stringify(settings.paymentSettings)},
            updated_at = CURRENT_TIMESTAMP
          WHERE business_id = ${businessIdNum}
        `;
      }
      
      // Update notification settings if provided
      if (settings.notificationSettings) {
        await sql`
          UPDATE business_profile SET
            notification_settings = ${JSON.stringify(settings.notificationSettings)},
            updated_at = CURRENT_TIMESTAMP
          WHERE business_id = ${businessIdNum}
        `;
      }
      
      // Update integrations if provided
      if (settings.integrations) {
        await sql`
          UPDATE business_profile SET
            integrations = ${JSON.stringify(settings.integrations)},
            updated_at = CURRENT_TIMESTAMP
          WHERE business_id = ${businessIdNum}
        `;
      }
      
      // Check if business_settings table exists and update loyalty settings
      if (settings.loyaltySettings) {
        try {
          const tableExists = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'business_settings'
            ) as exists
          `;
          
          if (tableExists[0]?.exists) {
            // Check if entry exists
            const settingsExists = await sql`
              SELECT id FROM business_settings
              WHERE business_id = ${businessIdNum}
            `;
            
            if (settingsExists.length > 0) {
              // Update existing settings
              await sql`
                UPDATE business_settings SET
                  points_per_dollar = ${settings.loyaltySettings.pointsPerDollar},
                  points_expiry_days = ${settings.loyaltySettings.pointsExpiryDays},
                  minimum_points_redemption = ${settings.loyaltySettings.minimumPointsRedemption},
                  welcome_bonus = ${settings.loyaltySettings.welcomeBonus},
                  updated_at = CURRENT_TIMESTAMP
                WHERE business_id = ${businessIdNum}
              `;
            } else {
              // Insert new settings
              await sql`
                INSERT INTO business_settings (
                  business_id,
                  points_per_dollar,
                  points_expiry_days,
                  minimum_points_redemption,
                  welcome_bonus
                ) VALUES (
                  ${businessIdNum},
                  ${settings.loyaltySettings.pointsPerDollar},
                  ${settings.loyaltySettings.pointsExpiryDays},
                  ${settings.loyaltySettings.minimumPointsRedemption},
                  ${settings.loyaltySettings.welcomeBonus}
                )
                ON CONFLICT (business_id) DO UPDATE SET
                  points_per_dollar = ${settings.loyaltySettings.pointsPerDollar},
                  points_expiry_days = ${settings.loyaltySettings.pointsExpiryDays},
                  minimum_points_redemption = ${settings.loyaltySettings.minimumPointsRedemption},
                  welcome_bonus = ${settings.loyaltySettings.welcomeBonus},
                  updated_at = CURRENT_TIMESTAMP
              `;
            }
          }
        } catch (e) {
          console.error('Error updating loyalty settings:', e);
        }
      }
      
      // Get the updated settings
      return await this.getBusinessSettings(businessId);
    } catch (error) {
      console.error('Error updating business settings:', error);
      return null;
    }
  }
  
  /**
   * Combine data from different sources into a single settings object
   */
  private static combineSettingsData(
    profile: Record<string, unknown>, 
    businessSettings: Record<string, unknown>, 
    user: Record<string, unknown>
  ): BusinessSettings {
    // Default values
    const defaultBusinessHours: BusinessHours = {
      monday: { open: "09:00", close: "17:00", isClosed: false },
      tuesday: { open: "09:00", close: "17:00", isClosed: false },
      wednesday: { open: "09:00", close: "17:00", isClosed: false },
      thursday: { open: "09:00", close: "17:00", isClosed: false },
      friday: { open: "09:00", close: "17:00", isClosed: false },
      saturday: { open: "10:00", close: "14:00", isClosed: false },
      sunday: { open: "00:00", close: "00:00", isClosed: true }
    };
    
    const defaultPaymentSettings: PaymentSettings = {
      acceptsCard: true,
      acceptsCash: true,
      acceptsOnline: false,
      serviceFeePercent: 0
    };
    
    const defaultLoyaltySettings: LoyaltySettings = {
      pointsPerDollar: 10,
      pointsExpiryDays: 365,
      minimumPointsRedemption: 100,
      welcomeBonus: 50
    };
    
    const defaultNotificationSettings: NotificationSettings = {
      email: true,
      push: true,
      sms: false,
      customerActivity: true,
      promotionStats: true,
      systemUpdates: true
    };
    
    const defaultIntegrations: Integrations = {
      pos: false,
      accounting: false,
      marketing: false,
      crm: false
    };
    
    // Extract loyalty settings from business_settings if available
    let loyaltySettings = { ...defaultLoyaltySettings };
    if (businessSettings) {
      loyaltySettings = {
        pointsPerDollar: parseFloat(businessSettings.points_per_dollar as string) || defaultLoyaltySettings.pointsPerDollar,
        pointsExpiryDays: (businessSettings.points_expiry_days as number) || defaultLoyaltySettings.pointsExpiryDays,
        minimumPointsRedemption: (businessSettings.minimum_points_redemption as number) || defaultLoyaltySettings.minimumPointsRedemption,
        welcomeBonus: (businessSettings.welcome_bonus as number) || defaultLoyaltySettings.welcomeBonus
      };
    }
    
    // Extract from profile or use defaults
    const businessHours = (profile?.business_hours as BusinessHours) || defaultBusinessHours;
    const paymentSettings = (profile?.payment_settings as PaymentSettings) || defaultPaymentSettings;
    const notificationSettings = (profile?.notification_settings as NotificationSettings) || defaultNotificationSettings;
    const integrations = (profile?.integrations as Integrations) || defaultIntegrations;
    
    // Return combined data
    return {
      id: (profile?.id as number) || 0,
      businessId: (user?.id as number) || ((profile?.business_id as number) || 0),
      name: (user?.name as string) || (profile?.name as string) || '',
      businessName: (user?.business_name as string) || (profile?.name as string) || '',
      phone: (profile?.phone as string) || (user?.business_phone as string) || '',
      email: (profile?.email as string) || (user?.email as string) || '',
      address: (profile?.address as string) || '',
      description: (profile?.description as string) || '',
      website: (profile?.website as string) || '',
      logo: (profile?.logo as string) || '',
      language: (profile?.language as string) || 'en',
      country: (profile?.country as string) || '',
      currency: (profile?.currency as string) || 'USD',
      timezone: (profile?.timezone as string) || 'UTC',
      taxId: (profile?.tax_id as string) || '',
      businessHours,
      paymentSettings,
      loyaltySettings,
      notificationSettings,
      integrations,
      createdAt: (profile?.created_at as string) || new Date().toISOString(),
      updatedAt: (profile?.updated_at as string) || new Date().toISOString()
    };
  }
} 