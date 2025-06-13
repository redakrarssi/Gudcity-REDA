import sql from '../utils/db';
import { ensureCustomerExists } from '../utils/initDb';

// Types for customer settings
export interface RegionalSettings {
  language: string;
  country: string;
  currency: string;
  timezone: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  promotions: boolean;
  rewards: boolean;
  system: boolean;
}

export interface CustomerSettings {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  tier: string;
  loyaltyPoints: number;
  birthday: string | null;
  joinedAt: string;
  notificationPreferences: NotificationPreferences;
  regionalSettings: RegionalSettings;
  createdAt: string;
  updatedAt: string;
}

// Map internal field names to database column names
const DB_FIELD_MAP = {
  userId: 'user_id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  tier: 'tier',
  loyaltyPoints: 'loyalty_points',
  birthday: 'birthday',
  joinedAt: 'joined_at',
  notificationPreferences: 'notification_preferences',
  regionalSettings: 'regional_settings',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

export class CustomerSettingsService {
  /**
   * Get settings for a specific customer
   */
  static async getCustomerSettings(customerId: string | number): Promise<CustomerSettings | null> {
    try {
      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      
      // Get customer data
      const customerResult = await sql`
        SELECT * FROM customers 
        WHERE id = ${customerIdNum}
      `;
      
      if (customerResult.length === 0) {
        // Try to find by user_id in case we have a user_id instead
        const customerByUserResult = await sql`
          SELECT * FROM customers 
          WHERE user_id = ${customerIdNum}
        `;
        
        if (customerByUserResult.length === 0) {
          console.error(`No customer found with ID or user_id: ${customerId}`);
          
          // Try to create a customer record for this user ID
          const createdCustomerId = await ensureCustomerExists(customerIdNum);
          if (createdCustomerId) {
            // Fetch the newly created customer
            const newCustomerResult = await sql`
              SELECT * FROM customers 
              WHERE id = ${createdCustomerId}
            `;
            
            if (newCustomerResult.length > 0) {
              console.log(`Created and retrieved new customer record with ID: ${createdCustomerId}`);
              return this.formatCustomerData(newCustomerResult[0]);
            }
          }
          
          return null;
        }
        
        return this.formatCustomerData(customerByUserResult[0]);
      }
      
      return this.formatCustomerData(customerResult[0]);
    } catch (error) {
      console.error('Error getting customer settings:', error);
      return null;
    }
  }

  /**
   * Update settings for a specific customer
   */
  static async updateCustomerSettings(
    customerId: string | number, 
    settings: Partial<CustomerSettings>
  ): Promise<CustomerSettings | null> {
    try {
      let customerIdNum = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      console.log(`Updating customer settings for ID: ${customerIdNum}`);
      console.log('Settings to update:', JSON.stringify(settings, null, 2));
      
      // Check if customer exists
      const customerExists = await sql`
        SELECT id FROM customers 
        WHERE id = ${customerIdNum}
      `;
      
      if (customerExists.length === 0) {
        // Try to find by user_id instead
        const customerByUserExists = await sql`
          SELECT id FROM customers 
          WHERE user_id = ${customerIdNum}
        `;
        
        if (customerByUserExists.length === 0) {
          console.error(`No customer found with ID or user_id: ${customerId}`);
          
          // Try to create a customer record for this user ID
          const createdCustomerId = await ensureCustomerExists(customerIdNum, {
            name: settings.name,
            email: settings.email
          });
          
          if (createdCustomerId) {
            console.log(`Created new customer record with ID: ${createdCustomerId} for user ID: ${customerIdNum}`);
            customerIdNum = createdCustomerId;
          } else {
            return null;
          }
        } else {
          // Use the actual customer ID for updates
          customerIdNum = Number(customerByUserExists[0].id);
          console.log(`Found customer with user_id ${customerId}, using customer ID: ${customerIdNum}`);
        }
      }
      
      // First check if the notification_preferences and regional_settings columns exist
      try {
        const columnsResult = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'customers' AND (
            column_name = 'notification_preferences' OR
            column_name = 'regional_settings'
          )
        `;
        
        const columnNames = columnsResult.map((row: any) => row.column_name);
        console.log('Available columns for settings:', columnNames);
        
        if (columnNames.length < 2) {
          console.log('Missing required columns, adding them now...');
          
          // Add notification_preferences column if it doesn't exist
          if (!columnNames.includes('notification_preferences')) {
            await sql`
              ALTER TABLE customers ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
                "email": true,
                "push": true,
                "sms": false,
                "promotions": true,
                "rewards": true,
                "system": true
              }'
            `;
            console.log('Added notification_preferences column');
          }
          
          // Add regional_settings column if it doesn't exist
          if (!columnNames.includes('regional_settings')) {
            await sql`
              ALTER TABLE customers ADD COLUMN IF NOT EXISTS regional_settings JSONB DEFAULT '{
                "language": "en",
                "country": "United States",
                "currency": "USD",
                "timezone": "UTC"
              }'
            `;
            console.log('Added regional_settings column');
          }
        }
      } catch (columnsError) {
        console.error('Error checking/adding columns:', columnsError);
        // Continue with the update - we'll let SQL handle any missing columns
      }
      
      // Update basic customer fields if provided
      if (
        settings.name || 
        settings.email || 
        settings.phone || 
        settings.address || 
        settings.birthday
      ) {
        try {
          await sql`
            UPDATE customers SET
              name = COALESCE(${settings.name}, name),
              email = COALESCE(${settings.email}, email),
              phone = COALESCE(${settings.phone}, phone),
              address = COALESCE(${settings.address}, address),
              birthday = COALESCE(${settings.birthday ? new Date(settings.birthday) : null}, birthday),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${customerIdNum}
          `;
          console.log('Updated basic customer fields');
        } catch (updateError) {
          console.error('Error updating basic fields:', updateError);
          throw new Error(`Failed to update basic fields: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
        }
      }
      
      // Update notification preferences if provided
      if (settings.notificationPreferences) {
        try {
          const notificationPrefsJson = JSON.stringify(settings.notificationPreferences);
          console.log('Updating notification preferences:', notificationPrefsJson);
          
          await sql`
            UPDATE customers SET
              notification_preferences = ${notificationPrefsJson}::jsonb,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${customerIdNum}
          `;
          console.log('Updated notification preferences');
        } catch (notificationError) {
          console.error('Error updating notification preferences:', notificationError);
          throw new Error(`Failed to update notification preferences: ${notificationError instanceof Error ? notificationError.message : 'Unknown error'}`);
        }
      }
      
      // Update regional settings if provided
      if (settings.regionalSettings) {
        try {
          const regionalSettingsJson = JSON.stringify(settings.regionalSettings);
          console.log('Updating regional settings:', regionalSettingsJson);
          
          await sql`
            UPDATE customers SET
              regional_settings = ${regionalSettingsJson}::jsonb,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${customerIdNum}
          `;
          console.log('Updated regional settings');
        } catch (regionError) {
          console.error('Error updating regional settings:', regionError);
          throw new Error(`Failed to update regional settings: ${regionError instanceof Error ? regionError.message : 'Unknown error'}`);
        }
      }
      
      // Get the updated settings
      return await this.getCustomerSettings(customerIdNum);
    } catch (error) {
      console.error('Error updating customer settings:', error);
      throw error; // Rethrow so the UI can show the error
    }
  }
  
  /**
   * Format customer data from database to CustomerSettings format
   */
  private static formatCustomerData(customer: any): CustomerSettings {
    // Default notification preferences
    const defaultNotificationPreferences: NotificationPreferences = {
      email: true,
      push: true,
      sms: false,
      promotions: true,
      rewards: true,
      system: true
    };
    
    // Default regional settings
    const defaultRegionalSettings: RegionalSettings = {
      language: 'en',
      country: 'United States',
      currency: 'USD',
      timezone: 'UTC'
    };
    
    // Parse notification preferences from database or use defaults
    let notificationPreferences = defaultNotificationPreferences;
    if (customer.notification_preferences) {
      try {
        // Handle both string and object formats
        if (typeof customer.notification_preferences === 'string') {
          notificationPreferences = JSON.parse(customer.notification_preferences);
        } else {
          notificationPreferences = customer.notification_preferences;
        }
      } catch (e) {
        console.error('Error parsing notification preferences:', e);
      }
    }
    
    // Parse regional settings from database or use defaults
    let regionalSettings = defaultRegionalSettings;
    if (customer.regional_settings) {
      try {
        // Handle both string and object formats
        if (typeof customer.regional_settings === 'string') {
          regionalSettings = JSON.parse(customer.regional_settings);
        } else {
          regionalSettings = customer.regional_settings;
        }
      } catch (e) {
        console.error('Error parsing regional settings:', e);
      }
    }
    
    return {
      id: customer.id,
      userId: customer.user_id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || null,
      address: customer.address || null,
      tier: customer.tier || 'Bronze',
      loyaltyPoints: customer.loyalty_points || 0,
      birthday: customer.birthday ? customer.birthday.toISOString().split('T')[0] : null,
      joinedAt: customer.joined_at ? customer.joined_at.toISOString() : new Date().toISOString(),
      notificationPreferences,
      regionalSettings,
      createdAt: customer.created_at ? customer.created_at.toISOString() : new Date().toISOString(),
      updatedAt: customer.updated_at ? customer.updated_at.toISOString() : new Date().toISOString()
    };
  }
} 