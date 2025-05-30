import sql from '../utils/db';

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
      const customerIdNum = typeof customerId === 'string' ? parseInt(customerId) : customerId;
      
      // Check if customer exists
      const customerExists = await sql`
        SELECT id FROM customers 
        WHERE id = ${customerIdNum}
      `;
      
      if (customerExists.length === 0) {
        console.error(`No customer found with ID: ${customerId}`);
        return null;
      }
      
      // Update basic customer fields if provided
      if (
        settings.name || 
        settings.email || 
        settings.phone || 
        settings.address || 
        settings.birthday
      ) {
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
      }
      
      // Update notification preferences if provided
      if (settings.notificationPreferences) {
        await sql`
          UPDATE customers SET
            notification_preferences = ${JSON.stringify(settings.notificationPreferences)},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${customerIdNum}
        `;
      }
      
      // Update regional settings if provided
      if (settings.regionalSettings) {
        await sql`
          UPDATE customers SET
            regional_settings = ${JSON.stringify(settings.regionalSettings)},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${customerIdNum}
        `;
      }
      
      // Get the updated settings
      return await this.getCustomerSettings(customerId);
    } catch (error) {
      console.error('Error updating customer settings:', error);
      return null;
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
    const notificationPreferences = customer.notification_preferences 
      ? customer.notification_preferences
      : defaultNotificationPreferences;
      
    // Parse regional settings from database or use defaults
    const regionalSettings = customer.regional_settings
      ? customer.regional_settings
      : defaultRegionalSettings;
    
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