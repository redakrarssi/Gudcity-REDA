import sql from '../utils/db';

// Types for admin settings
export interface AdminGlobalSettings {
  site_name: string;
  support_email: string;
  default_language: string;
  timezone: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  user_registration_enabled: boolean;
  business_registration_enabled: boolean;
}

export interface AdminSecuritySettings {
  two_factor_auth_required: boolean;
  password_min_length: number;
  password_require_special_char: boolean;
  password_require_number: boolean;
  password_require_uppercase: boolean;
  max_login_attempts: number;
  session_timeout_minutes: number;
  api_rate_limit_per_hour: number;
}

export interface AdminNotificationSettings {
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  admin_alerts_enabled: boolean;
  user_signup_notifications: boolean;
  business_signup_notifications: boolean;
  transaction_alerts: boolean;
  weekly_reports_enabled: boolean;
  marketing_emails_enabled: boolean;
}

export interface AdminPaymentSettings {
  default_currency: string;
  processing_fee_percentage: number;
  minimum_payout_amount: number;
  payout_schedule: 'weekly' | 'monthly' | 'quarterly';
  stripe_enabled: boolean;
  paypal_enabled: boolean;
  test_mode: boolean;
}

export class AdminSettingsService {
  /**
   * Ensure admin settings table exists and is properly configured
   */
  static async ensureAdminSettingsTable(): Promise<void> {
    try {
      // Check if admin_settings table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'admin_settings'
        )
      `;

      if (!tableExists[0]?.exists) {
        console.log('Creating admin_settings table...');
        // Run the admin schema file
        // Note: In production, this should be done via migration
        await this.createAdminSettingsTable();
      }
    } catch (error) {
      console.error('Error ensuring admin settings table:', error);
      throw error;
    }
  }

  /**
   * Create admin settings table if it doesn't exist
   */
  private static async createAdminSettingsTable(): Promise<void> {
    await sql`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value JSONB NOT NULL,
        setting_type VARCHAR(50) NOT NULL DEFAULT 'general',
        description TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert default settings
    const defaultSettings = [
      { key: 'site_name', value: '"Vcarda Loyalty Platform"', type: 'general', description: 'Website name' },
      { key: 'support_email', value: '"support@vcarda.com"', type: 'general', description: 'Support email address' },
      { key: 'default_language', value: '"en"', type: 'general', description: 'Default language for new users' },
      { key: 'timezone', value: '"UTC"', type: 'general', description: 'Default timezone' },
      { key: 'maintenance_mode', value: 'false', type: 'general', description: 'Enable maintenance mode' },
      { key: 'maintenance_message', value: '"We are currently performing scheduled maintenance. Please check back later."', type: 'general', description: 'Maintenance mode message' },
      { key: 'user_registration_enabled', value: 'true', type: 'security', description: 'Allow new user registrations' },
      { key: 'business_registration_enabled', value: 'true', type: 'security', description: 'Allow new business registrations' },
      { key: 'two_factor_auth_required', value: 'false', type: 'security', description: 'Require two-factor authentication' },
      { key: 'password_min_length', value: '8', type: 'security', description: 'Minimum password length' },
      { key: 'password_require_special_char', value: 'true', type: 'security', description: 'Require special characters in passwords' },
      { key: 'password_require_number', value: 'true', type: 'security', description: 'Require numbers in passwords' },
      { key: 'password_require_uppercase', value: 'true', type: 'security', description: 'Require uppercase letters in passwords' },
      { key: 'max_login_attempts', value: '5', type: 'security', description: 'Maximum login attempts before lockout' },
      { key: 'session_timeout_minutes', value: '30', type: 'security', description: 'Session timeout in minutes' },
      { key: 'api_rate_limit_per_hour', value: '100', type: 'security', description: 'API rate limit per hour' },
      { key: 'email_notifications_enabled', value: 'true', type: 'notifications', description: 'Enable email notifications' },
      { key: 'push_notifications_enabled', value: 'true', type: 'notifications', description: 'Enable push notifications' },
      { key: 'admin_alerts_enabled', value: 'true', type: 'notifications', description: 'Enable admin alerts' },
      { key: 'user_signup_notifications', value: 'true', type: 'notifications', description: 'Notify admins of new user signups' },
      { key: 'business_signup_notifications', value: 'true', type: 'notifications', description: 'Notify admins of new business signups' },
      { key: 'transaction_alerts', value: 'true', type: 'notifications', description: 'Enable transaction alerts' },
      { key: 'weekly_reports_enabled', value: 'true', type: 'notifications', description: 'Enable weekly reports' },
      { key: 'marketing_emails_enabled', value: 'false', type: 'notifications', description: 'Enable marketing emails' },
      { key: 'default_currency', value: '"USD"', type: 'payments', description: 'Default currency for transactions' },
      { key: 'processing_fee_percentage', value: '2.5', type: 'payments', description: 'Payment processing fee percentage' },
      { key: 'minimum_payout_amount', value: '50', type: 'payments', description: 'Minimum payout amount' },
      { key: 'payout_schedule', value: '"monthly"', type: 'payments', description: 'Payout schedule' },
      { key: 'stripe_enabled', value: 'true', type: 'payments', description: 'Enable Stripe payments' },
      { key: 'paypal_enabled', value: 'true', type: 'payments', description: 'Enable PayPal payments' },
      { key: 'test_mode', value: 'true', type: 'payments', description: 'Enable test mode for payments' }
    ];

    for (const setting of defaultSettings) {
      await sql`
        INSERT INTO admin_settings (setting_key, setting_value, setting_type, description)
        VALUES (${setting.key}, ${setting.value}::jsonb, ${setting.type}, ${setting.description})
        ON CONFLICT (setting_key) DO NOTHING
      `;
    }
  }

  /**
   * Get all admin settings grouped by type
   */
  static async getAllSettings(): Promise<{
    general: AdminGlobalSettings;
    security: AdminSecuritySettings;
    notifications: AdminNotificationSettings;
    payments: AdminPaymentSettings;
  }> {
    try {
      await this.ensureAdminSettingsTable();

      const settings = await sql`
        SELECT setting_key, setting_value, setting_type
        FROM admin_settings
        ORDER BY setting_type, setting_key
      `;

      // Initialize default settings structure
      const result = {
        general: {
          site_name: 'Vcarda Loyalty Platform',
          support_email: 'support@vcarda.com',
          default_language: 'en',
          timezone: 'UTC',
          maintenance_mode: false,
          maintenance_message: 'We are currently performing scheduled maintenance. Please check back later.',
          user_registration_enabled: true,
          business_registration_enabled: true
        },
        security: {
          two_factor_auth_required: false,
          password_min_length: 8,
          password_require_special_char: true,
          password_require_number: true,
          password_require_uppercase: true,
          max_login_attempts: 5,
          session_timeout_minutes: 30,
          api_rate_limit_per_hour: 100
        },
        notifications: {
          email_notifications_enabled: true,
          push_notifications_enabled: true,
          admin_alerts_enabled: true,
          user_signup_notifications: true,
          business_signup_notifications: true,
          transaction_alerts: true,
          weekly_reports_enabled: true,
          marketing_emails_enabled: false
        },
        payments: {
          default_currency: 'USD',
          processing_fee_percentage: 2.5,
          minimum_payout_amount: 50,
          payout_schedule: 'monthly' as const,
          stripe_enabled: true,
          paypal_enabled: true,
          test_mode: true
        }
      };

      // Parse settings from database
      for (const setting of settings) {
        const key = setting.setting_key;
        const value = setting.setting_value;
        const type = setting.setting_type;

        // Parse JSON value safely
        let parsedValue: any;
        try {
          parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          parsedValue = value;
        }

        // Assign to appropriate category
        if (type === 'general' && key in result.general) {
          (result.general as any)[key] = parsedValue;
        } else if (type === 'security' && key in result.security) {
          (result.security as any)[key] = parsedValue;
        } else if (type === 'notifications' && key in result.notifications) {
          (result.notifications as any)[key] = parsedValue;
        } else if (type === 'payments' && key in result.payments) {
          (result.payments as any)[key] = parsedValue;
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting admin settings:', error);
      throw error;
    }
  }

  /**
   * Update admin settings
   */
  static async updateSettings(
    settings: Partial<{
      general: Partial<AdminGlobalSettings>;
      security: Partial<AdminSecuritySettings>;
      notifications: Partial<AdminNotificationSettings>;
      payments: Partial<AdminPaymentSettings>;
    }>,
    updatedBy?: number
  ): Promise<boolean> {
    try {
      await this.ensureAdminSettingsTable();

      // Process each category of settings
      for (const [category, categorySettings] of Object.entries(settings)) {
        if (categorySettings && typeof categorySettings === 'object') {
          for (const [key, value] of Object.entries(categorySettings)) {
            await sql`
              INSERT INTO admin_settings (setting_key, setting_value, setting_type, created_by)
              VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${category}, ${updatedBy || null})
              ON CONFLICT (setting_key) 
              DO UPDATE SET 
                setting_value = ${JSON.stringify(value)}::jsonb,
                updated_at = CURRENT_TIMESTAMP
            `;
          }
        }
      }

      console.log('✅ Admin settings updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating admin settings:', error);
      return false;
    }
  }

  /**
   * Get a specific setting value
   */
  static async getSetting(key: string): Promise<any> {
    try {
      await this.ensureAdminSettingsTable();

      const result = await sql`
        SELECT setting_value
        FROM admin_settings
        WHERE setting_key = ${key}
      `;

      if (result.length === 0) {
        return null;
      }

      const value = result[0].setting_value;
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return value;
      }
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a specific setting value
   */
  static async setSetting(key: string, value: any, type: string = 'general', updatedBy?: number): Promise<boolean> {
    try {
      await this.ensureAdminSettingsTable();

      await sql`
        INSERT INTO admin_settings (setting_key, setting_value, setting_type, created_by)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${type}, ${updatedBy || null})
        ON CONFLICT (setting_key) 
        DO UPDATE SET 
          setting_value = ${JSON.stringify(value)}::jsonb,
          updated_at = CURRENT_TIMESTAMP
      `;

      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a setting
   */
  static async deleteSetting(key: string): Promise<boolean> {
    try {
      await sql`
        DELETE FROM admin_settings
        WHERE setting_key = ${key}
      `;

      return true;
    } catch (error) {
      console.error(`Error deleting setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Reset all settings to defaults
   */
  static async resetToDefaults(): Promise<boolean> {
    try {
      await sql`
        DELETE FROM admin_settings
      `;

      await this.createAdminSettingsTable();
      
      console.log('✅ Admin settings reset to defaults');
      return true;
    } catch (error) {
      console.error('Error resetting admin settings:', error);
      return false;
    }
  }
}
