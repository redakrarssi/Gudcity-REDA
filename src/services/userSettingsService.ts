import sql from '../utils/db';
import api from '../api/api';

// Types for user settings
export interface UserSettings {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar_url?: string;
  two_factor_enabled: boolean;
  notification_settings: {
    email_notifications: boolean;
    login_alerts: boolean;
    system_updates?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export class UserSettingsService {
  /**
   * Get settings for a specific user
   */
  static async getUserSettings(userId: string | number): Promise<UserSettings | null> {
    try {
      // Prefer backend API for RBAC and CSRF handling
      const resp = await api.get('/api/users/me/settings');
      if (resp.status === 200 && resp.data) {
        return resp.data as UserSettings;
      }
      return null;
    } catch (error) {
      console.error('Error getting user settings:', error);
      return null;
    }
  }

  /**
   * Update settings for a specific user
   */
  static async updateUserSettings(
    userId: string | number, 
    settings: Partial<UserSettings>
  ): Promise<UserSettings | null> {
    try {
      const resp = await api.put('/api/users/me/settings', settings);
      if (resp.status === 200 && resp.data) {
        return resp.data as UserSettings;
      }
      return null;
    } catch (error) {
      console.error('Error updating user settings:', error);
      return null;
    }
  }

  /**
   * Update user password
   */
  static async updateUserPassword(
    userId: string | number,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const resp = await api.put('/api/users/me/password', { currentPassword, newPassword });
      return resp.status === 200 && resp.data?.success === true;
    } catch (error) {
      console.error('Error updating user password:', error);
      return false;
    }
  }
} 