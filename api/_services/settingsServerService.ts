import sql from '../_lib/db';

export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    showProfile: boolean;
    showActivity: boolean;
  };
}

export interface BusinessSettings {
  businessId: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  openingHours?: any;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  loyalty: {
    pointsPerDollar: number;
    welcomeBonus: number;
    referralBonus: number;
  };
}

export interface AdminSettings {
  platformName: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  emailNotifications: boolean;
  defaultPointsValue: number;
  maxPointsPerTransaction: number;
  pointsExpirationDays: number;
}

/**
 * Server-side service for handling settings
 * All database operations for settings
 */
export class SettingsServerService {
  /**
   * Get user settings
   */
  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const userIdInt = parseInt(userId);

      const result = await sql`
        SELECT settings
        FROM user_settings
        WHERE user_id = ${userIdInt}
      `;

      if (result.length === 0) {
        // Return default settings
        return {
          userId,
          theme: 'auto',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          privacy: {
            showProfile: true,
            showActivity: false
          }
        };
      }

      return {
        userId,
        ...result[0].settings
      };
    } catch (error) {
      console.error('Error getting user settings:', error);
      return null;
    }
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<{ success: boolean; settings?: UserSettings; error?: string }> {
    try {
      const userIdInt = parseInt(userId);

      // Check if settings exist
      const existing = await sql`
        SELECT settings
        FROM user_settings
        WHERE user_id = ${userIdInt}
      `;

      const currentSettings = existing.length > 0 ? existing[0].settings : {};
      const newSettings = { ...currentSettings, ...settings };

      if (existing.length === 0) {
        // Insert new settings
        await sql`
          INSERT INTO user_settings (user_id, settings, updated_at)
          VALUES (${userIdInt}, ${JSON.stringify(newSettings)}, NOW())
        `;
      } else {
        // Update existing settings
        await sql`
          UPDATE user_settings
          SET settings = ${JSON.stringify(newSettings)}, updated_at = NOW()
          WHERE user_id = ${userIdInt}
        `;
      }

      return {
        success: true,
        settings: { userId, ...newSettings }
      };
    } catch (error) {
      console.error('Error updating user settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get business settings
   */
  static async getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
    try {
      const businessIdInt = parseInt(businessId);

      const result = await sql`
        SELECT 
          id,
          name,
          description,
          logo,
          website,
          phone,
          email,
          address,
          business_settings
        FROM businesses
        WHERE id = ${businessIdInt}
      `;

      if (result.length === 0) {
        return null;
      }

      const business = result[0];
      const settings = business.business_settings || {};

      return {
        businessId,
        name: business.name,
        description: business.description,
        logo: business.logo,
        website: business.website,
        phone: business.phone,
        email: business.email,
        address: business.address,
        openingHours: settings.openingHours,
        socialMedia: settings.socialMedia,
        loyalty: settings.loyalty || {
          pointsPerDollar: 1,
          welcomeBonus: 100,
          referralBonus: 50
        }
      };
    } catch (error) {
      console.error('Error getting business settings:', error);
      return null;
    }
  }

  /**
   * Update business settings
   */
  static async updateBusinessSettings(
    businessId: string,
    settings: Partial<BusinessSettings>
  ): Promise<{ success: boolean; settings?: BusinessSettings; error?: string }> {
    try {
      const businessIdInt = parseInt(businessId);

      // Get current settings
      const current = await this.getBusinessSettings(businessId);
      if (!current) {
        return {
          success: false,
          error: 'Business not found'
        };
      }

      // Merge settings
      const newSettings = { ...current, ...settings };

      // Update business record
      await sql`
        UPDATE businesses
        SET 
          name = ${newSettings.name},
          description = ${newSettings.description || null},
          logo = ${newSettings.logo || null},
          website = ${newSettings.website || null},
          phone = ${newSettings.phone || null},
          email = ${newSettings.email || null},
          address = ${newSettings.address || null},
          business_settings = ${JSON.stringify({
            openingHours: newSettings.openingHours,
            socialMedia: newSettings.socialMedia,
            loyalty: newSettings.loyalty
          })},
          updated_at = NOW()
        WHERE id = ${businessIdInt}
      `;

      return {
        success: true,
        settings: newSettings
      };
    } catch (error) {
      console.error('Error updating business settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get admin/platform settings
   */
  static async getAdminSettings(): Promise<AdminSettings> {
    try {
      const result = await sql`
        SELECT settings
        FROM platform_settings
        WHERE id = 1
      `;

      if (result.length === 0) {
        // Return default settings
        return {
          platformName: 'Gudcity REDA',
          maintenanceMode: false,
          allowNewRegistrations: true,
          emailNotifications: true,
          defaultPointsValue: 1,
          maxPointsPerTransaction: 10000,
          pointsExpirationDays: 365
        };
      }

      return result[0].settings;
    } catch (error) {
      console.error('Error getting admin settings:', error);
      return {
        platformName: 'Gudcity REDA',
        maintenanceMode: false,
        allowNewRegistrations: true,
        emailNotifications: true,
        defaultPointsValue: 1,
        maxPointsPerTransaction: 10000,
        pointsExpirationDays: 365
      };
    }
  }

  /**
   * Update admin/platform settings
   */
  static async updateAdminSettings(
    settings: Partial<AdminSettings>
  ): Promise<{ success: boolean; settings?: AdminSettings; error?: string }> {
    try {
      // Get current settings
      const current = await this.getAdminSettings();

      // Merge settings
      const newSettings = { ...current, ...settings };

      // Check if settings exist
      const existing = await sql`
        SELECT id FROM platform_settings WHERE id = 1
      `;

      if (existing.length === 0) {
        // Insert new settings
        await sql`
          INSERT INTO platform_settings (id, settings, updated_at)
          VALUES (1, ${JSON.stringify(newSettings)}, NOW())
        `;
      } else {
        // Update existing settings
        await sql`
          UPDATE platform_settings
          SET settings = ${JSON.stringify(newSettings)}, updated_at = NOW()
          WHERE id = 1
        `;
      }

      return {
        success: true,
        settings: newSettings
      };
    } catch (error) {
      console.error('Error updating admin settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

