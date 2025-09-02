import sql from '../utils/db';

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
      console.log(`Fetching business profile for ID: ${businessIdNum}`);
      const profileResult = await sql`
        SELECT 
          id, business_id, business_name, email, phone, address_line1, city, state, zip,
          language, country, currency, timezone, logo_url, website_url, description,
          business_hours, payment_settings, notification_settings, integrations,
          created_at, updated_at
        FROM business_profile 
        WHERE business_id = ${businessIdNum}
      `;
      
      console.log('Profile result:', JSON.stringify(profileResult, null, 2));
      
      // If no profile found, check if user exists first
      if (profileResult.length === 0) {
        console.log(`No profile found, checking user with ID: ${businessIdNum}`);
        const userResult = await sql`
          SELECT id, name, email, business_name, business_phone FROM users
          WHERE id = ${businessIdNum}
        `;
        
        console.log('User result:', JSON.stringify(userResult, null, 2));
        
        if (userResult.length === 0) {
          console.error(`No user found with ID: ${businessId}`);
          return null;
        }
        
        const user = userResult[0];
        
        // Create basic profile if user exists
        console.log(`Creating new profile for user ID: ${businessIdNum}`);
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
        console.log(`Fetching newly created profile for ID: ${businessIdNum}`);
        const newResult = await sql`
          SELECT 
            id, business_id, business_name, email, phone, address_line1, city, state, zip,
            language, country, currency, timezone, logo_url, website_url, description,
            business_hours, payment_settings, notification_settings, integrations,
            created_at, updated_at
          FROM business_profile 
          WHERE business_id = ${businessIdNum}
        `;
        
        console.log('New profile result:', JSON.stringify(newResult, null, 2));
        
        if (newResult.length > 0) {
          profileResult[0] = newResult[0];
        }
      }
      
      // Now get business settings from business_settings table
      let businessSettings = null;
      
      try {
        // Check if business_settings table exists
        console.log('Checking if business_settings table exists');
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'business_settings'
          ) as exists
        `;
        
        console.log('Table exists result:', JSON.stringify(tableExists, null, 2));
        
        if (tableExists[0]?.exists) {
          // Get settings
          console.log(`Fetching business settings for ID: ${businessIdNum}`);
          const settingsResult = await sql`
            SELECT *
            FROM business_settings
            WHERE business_id = ${businessIdNum}
          `;
          
          console.log('Settings result:', JSON.stringify(settingsResult, null, 2));
          
          if (settingsResult.length > 0) {
            businessSettings = settingsResult[0];
          } else {
            // Create default settings
            console.log(`Creating default settings for ID: ${businessIdNum}`);
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
            console.log(`Fetching newly created settings for ID: ${businessIdNum}`);
            const newSettingsResult = await sql`
              SELECT *
              FROM business_settings
              WHERE business_id = ${businessIdNum}
            `;
            
            console.log('New settings result:', JSON.stringify(newSettingsResult, null, 2));
            
            if (newSettingsResult.length > 0) {
              businessSettings = newSettingsResult[0];
            }
          }
        }
      } catch (e) {
        console.error('Error fetching business_settings:', e);
      }
      
      // Get user data as fallback for missing fields
      console.log(`Fetching user data for ID: ${businessIdNum}`);
      const userResult = await sql`
        SELECT *
        FROM users
        WHERE id = ${businessIdNum}
      `;
      
      console.log('User data result:', JSON.stringify(userResult, null, 2));
      
      const user = userResult.length > 0 ? userResult[0] : null;
      
      // Combine all data into a single settings object
      const profile = profileResult.length > 0 ? profileResult[0] : null;
      
      const combinedSettings = this.combineSettingsData(profile, businessSettings, user);
      console.log('Combined settings:', JSON.stringify(combinedSettings, null, 2));
      
      return combinedSettings;
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
        SELECT * FROM business_profile
        WHERE business_id = ${businessIdNum}
      `;
      
      console.log('Current profile data:', JSON.stringify(profileResult, null, 2));
      
      if (profileResult.length === 0) {
        // Create profile if it doesn't exist
        const userResult = await sql`
          SELECT * FROM users
          WHERE id = ${businessIdNum}
        `;
        
        if (userResult.length === 0) {
          console.error(`No user found with ID: ${businessId}`);
          throw new Error(`No user found with ID: ${businessId}`);
        }
        
        const user = userResult[0];
        
        try {
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
        } catch (insertError) {
          console.error('Error creating business profile:', insertError);
          throw new Error(`Failed to create business profile: ${insertError instanceof Error ? insertError.message : 'Unknown error'}`);
        }
      }
      
      // Update business_profile table
      if (settings.name || settings.businessName || settings.phone || settings.email ||
          settings.address || settings.description || settings.website || settings.logo ||
          settings.language || settings.country || settings.currency || settings.timezone ||
          settings.taxId) {
        
        try {
          // Check if business_name column exists
          const columnsResult = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'business_profile'
          `;
          
          const columns = columnsResult.map(col => col.column_name);
          console.log('Available columns in business_profile:', columns);
          
          // Handle name and businessName properly
          // Get the name value to update - prioritize businessName if both are provided
          const nameValue = settings.businessName || settings.name;
          
          // Create individual updates for each field
          if (columns.includes('business_name') && nameValue) {
            console.log(`Updating business_name to "${nameValue}" for business ID: ${businessIdNum}`);
            
            // First log the current name
            const currentName = await sql`
              SELECT business_name FROM business_profile 
              WHERE business_id = ${businessIdNum}
            `;
            console.log('Current business_name:', JSON.stringify(currentName, null, 2));
            
            // Perform the update
            await sql`
              UPDATE business_profile 
              SET business_name = ${nameValue}, updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
            
            // Verify the update
            const verifyUpdate = await sql`
              SELECT business_name FROM business_profile 
              WHERE business_id = ${businessIdNum}
            `;
            console.log('After update, business_name is:', JSON.stringify(verifyUpdate, null, 2));
            
            // Also update the name in the users table if it exists
            try {
              console.log(`Checking if we should also update name in users table for ID: ${businessIdNum}`);
              const userExists = await sql`
                SELECT COUNT(*) as count FROM users
                WHERE id = ${businessIdNum}
              `;
              
              if (userExists && userExists[0] && Number(userExists[0].count) > 0) {
                console.log(`Updating business_name in users table for ID: ${businessIdNum}`);
                await sql`
                  UPDATE users
                  SET business_name = ${nameValue}, name = ${nameValue}
                  WHERE id = ${businessIdNum}
                `;
                
                // Verify the user table update
                const verifyUserUpdate = await sql`
                  SELECT business_name, name FROM users
                  WHERE id = ${businessIdNum}
                `;
                console.log('After update, users.business_name and users.name are:', JSON.stringify(verifyUserUpdate, null, 2));
              }
            } catch (userUpdateError) {
              console.error('Error updating users table:', userUpdateError);
            }
          }
          
          if (columns.includes('phone') && settings.phone) {
            await sql`
              UPDATE business_profile 
              SET phone = ${settings.phone}, updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          }
          
          if (columns.includes('address_line1') && settings.address) {
            await sql`
              UPDATE business_profile 
              SET address_line1 = ${settings.address}, updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          }
          
          if (columns.includes('language') && settings.language) {
            await sql`
              UPDATE business_profile 
              SET language = ${settings.language}, updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          }
          
          if (columns.includes('country') && settings.country) {
            await sql`
              UPDATE business_profile 
              SET country = ${settings.country}, updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          }
          
          if (columns.includes('currency') && settings.currency) {
            await sql`
              UPDATE business_profile 
              SET currency = ${settings.currency}, updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          }
          
          if (columns.includes('timezone') && settings.timezone) {
            await sql`
              UPDATE business_profile 
              SET timezone = ${settings.timezone}, updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          }
          
          if (columns.includes('tax_id') && settings.taxId) {
            await sql`
              UPDATE business_profile 
              SET tax_id = ${settings.taxId}, updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          }
        } catch (updateError) {
          console.error('Error updating business profile:', updateError);
          throw new Error(`Failed to update business information: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
        }
      }
      
      // Update business hours if provided
      if (settings.businessHours) {
        try {
          // First check if the business_hours column exists
          const columnsResult = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'business_profile' 
            AND column_name = 'business_hours'
          `;
          
          if (columnsResult.length > 0) {
            // Column exists, update it
            await sql`
              UPDATE business_profile SET
              business_hours = ${JSON.stringify(settings.businessHours)},
              updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          } else {
            // Column doesn't exist, try to add it
            try {
              console.log('Business hours column not found, attempting to add it...');
              await sql`
                ALTER TABLE business_profile 
                ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
                  "monday": {"open": "09:00", "close": "17:00", "isClosed": false},
                  "tuesday": {"open": "09:00", "close": "17:00", "isClosed": false},
                  "wednesday": {"open": "09:00", "close": "17:00", "isClosed": false},
                  "thursday": {"open": "09:00", "close": "17:00", "isClosed": false},
                  "friday": {"open": "09:00", "close": "17:00", "isClosed": false},
                  "saturday": {"open": "10:00", "close": "14:00", "isClosed": false},
                  "sunday": {"open": "00:00", "close": "00:00", "isClosed": true}
                }'
              `;
              
              // Now try to update again
              await sql`
                UPDATE business_profile SET
                business_hours = ${JSON.stringify(settings.businessHours)},
                updated_at = CURRENT_TIMESTAMP
                WHERE business_id = ${businessIdNum}
              `;
            } catch (alterError) {
              console.error('Error adding business_hours column:', alterError);
              throw new Error(`Could not add business_hours column: ${alterError instanceof Error ? alterError.message : 'Unknown error'}`);
            }
          }
        } catch (hoursError) {
          console.error('Error updating business hours:', hoursError);
          throw new Error(`Failed to update business hours: ${hoursError instanceof Error ? hoursError.message : 'JSON format error'}`);
        }
      }
      
      // Update payment settings if provided
      if (settings.paymentSettings) {
        try {
          // Check if column exists
          const paymentColumnsResult = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'business_profile' 
            AND column_name = 'payment_settings'
          `;
          
          if (paymentColumnsResult.length > 0) {
            // Column exists, update it
            await sql`
              UPDATE business_profile SET
                payment_settings = ${JSON.stringify(settings.paymentSettings)},
                updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          } else {
            // Column doesn't exist, try to add it
            try {
              console.log('Payment settings column not found, attempting to add it...');
              await sql`
                ALTER TABLE business_profile 
                ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{
                  "acceptsCard": true,
                  "acceptsCash": true,
                  "acceptsOnline": false,
                  "serviceFeePercent": 0
                }'
              `;
              
              // Now try to update again
              await sql`
                UPDATE business_profile SET
                  payment_settings = ${JSON.stringify(settings.paymentSettings)},
                  updated_at = CURRENT_TIMESTAMP
                WHERE business_id = ${businessIdNum}
              `;
            } catch (alterError) {
              console.error('Error adding payment_settings column:', alterError);
              throw new Error(`Could not add payment_settings column: ${alterError instanceof Error ? alterError.message : 'Unknown error'}`);
            }
          }
        } catch (paymentError) {
          console.error('Error updating payment settings:', paymentError);
          throw new Error(`Failed to update payment settings: ${paymentError instanceof Error ? paymentError.message : 'JSON format error'}`);
        }
      }
      
      // Update notification settings if provided
      if (settings.notificationSettings) {
        try {
          // Check if column exists
          const notifColumnsResult = await sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'business_profile' 
            AND column_name = 'notification_settings'
          `;
          
          if (notifColumnsResult.length > 0) {
            // Column exists, update it
            await sql`
              UPDATE business_profile SET
                notification_settings = ${JSON.stringify(settings.notificationSettings)},
                updated_at = CURRENT_TIMESTAMP
              WHERE business_id = ${businessIdNum}
            `;
          } else {
            // Column doesn't exist, try to add it
            try {
              console.log('Notification settings column not found, attempting to add it...');
              await sql`
                ALTER TABLE business_profile 
                ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
                  "email": true,
                  "push": true,
                  "sms": false,
                  "customerActivity": true,
                  "promotionStats": true,
                  "systemUpdates": true
                }'
              `;
              
              // Now try to update again
              await sql`
                UPDATE business_profile SET
                  notification_settings = ${JSON.stringify(settings.notificationSettings)},
                  updated_at = CURRENT_TIMESTAMP
                WHERE business_id = ${businessIdNum}
              `;
            } catch (alterError) {
              console.error('Error adding notification_settings column:', alterError);
              throw new Error(`Could not add notification_settings column: ${alterError instanceof Error ? alterError.message : 'Unknown error'}`);
            }
          }
        } catch (notificationError) {
          console.error('Error updating notification settings:', notificationError);
          throw new Error(`