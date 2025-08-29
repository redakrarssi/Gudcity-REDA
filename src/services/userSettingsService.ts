import sql from '../utils/db';

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
      const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
      
      // Get user data
      const userResult = await sql`
        SELECT * FROM users 
        WHERE id = ${userIdNum}
      `;
      
      if (userResult.length === 0) {
        console.error(`No user found with ID: ${userId}`);
        return null;
      }
      
      const user = userResult[0];
      
      // Return formatted user data
      return {
        id: Number(user.id),
        name: String(user.name || ''),
        email: String(user.email || ''),
        phone: user.phone ? String(user.phone) : undefined,
        role: String(user.role || 'user'),
        avatar_url: user.avatar_url ? String(user.avatar_url) : undefined,
        two_factor_enabled: Boolean(user.two_factor_enabled),
        notification_settings: user.notification_settings ? 
          (typeof user.notification_settings === 'string' ? 
            JSON.parse(user.notification_settings) : 
            user.notification_settings) as {
              email_notifications: boolean;
              login_alerts: boolean;
              system_updates?: boolean;
            } : 
          {
            email_notifications: true,
            login_alerts: true,
            system_updates: true
          },
        created_at: user.created_at instanceof Date ? 
          user.created_at.toISOString() : 
          new Date().toISOString(),
        updated_at: user.updated_at instanceof Date ? 
          user.updated_at.toISOString() : 
          new Date().toISOString()
      };
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
      const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
      
      // Check if user exists
      const userExists = await sql`
        SELECT id FROM users 
        WHERE id = ${userIdNum}
      `;
      
      if (userExists.length === 0) {
        console.error(`No user found with ID: ${userId}`);
        return null;
      }
      
      // Update basic user fields if provided
      if (
        settings.name || 
        settings.email || 
        settings.phone || 
        settings.avatar_url
      ) {
        await sql`
          UPDATE users SET
            name = COALESCE(${settings.name}, name),
            email = COALESCE(${settings.email}, email),
            phone = COALESCE(${settings.phone}, phone),
            avatar_url = COALESCE(${settings.avatar_url}, avatar_url),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userIdNum}
        `;
      }
      
      // Update two factor auth settings if provided
      if (settings.two_factor_enabled !== undefined) {
        await sql`
          UPDATE users SET
            two_factor_enabled = ${settings.two_factor_enabled},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userIdNum}
        `;
      }
      
      // Update notification settings if provided
      if (settings.notification_settings) {
        const columns = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users'
        `;

        const hasNotificationSettingsColumn = columns.some(col => 
          col.column_name === 'notification_settings'
        );

        if (hasNotificationSettingsColumn) {
          await sql`
            UPDATE users SET
              notification_settings = ${JSON.stringify(settings.notification_settings)},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${userIdNum}
          `;
        } else {
          // Add notification_settings column if it doesn't exist
          await sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
              "email_notifications": true,
              "login_alerts": true,
              "system_updates": true
            }'
          `;
          
          // Update the newly created column
          await sql`
            UPDATE users SET
              notification_settings = ${JSON.stringify(settings.notification_settings)},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${userIdNum}
          `;
        }
      }
      
      // Get the updated settings
      return await this.getUserSettings(userId);
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
      const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
      
      // Check which password column exists in the database
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ('password', 'password_hash')
      `;
      
      const hasPasswordHash = columns.some(col => col.column_name === 'password_hash');
      const hasPassword = columns.some(col => col.column_name === 'password');
      
      // Determine which column to use
      const passwordColumn = hasPasswordHash ? 'password_hash' : (hasPassword ? 'password' : null);
      
      if (!passwordColumn) {
        console.error('No password column found in users table');
        return false;
      }
      
      // Check if user exists and get current password hash
      // Use dynamic query building to avoid syntax errors with column names
      const query = `SELECT id, ${passwordColumn} as password_value FROM users WHERE id = $1`;
      const userResult = await sql.query(query, [userIdNum]);
      
      if (userResult.length === 0) {
        console.error(`No user found with ID: ${userId}`);
        return false;
      }
      
      const user = userResult[0];
      
      // Validate the current password
      if (!user.password_value) {
        console.error(`User ${userId} has no password set`);
        return false;
      }
      
      // Import the authService to use its password verification and hashing functions
      const { verifyPassword, hashPassword } = await import('./authService');
      
      // Verify that the current password matches the stored hash
      const isPasswordValid = await verifyPassword(currentPassword, String(user.password_value));
      
      if (!isPasswordValid) {
        console.error(`Invalid current password for user ${userId}`);
        return false;
      }
      
      // Hash the new password before storing it
      const newPasswordHash = await hashPassword(newPassword);
      
      // Update both password columns if they exist for consistency
      if (hasPasswordHash && hasPassword) {
        await sql`
          UPDATE users SET
            password_hash = ${newPasswordHash},
            password = ${newPasswordHash},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userIdNum}
        `;
      } else if (hasPasswordHash) {
        await sql`
          UPDATE users SET
            password_hash = ${newPasswordHash},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userIdNum}
        `;
      } else {
        await sql`
          UPDATE users SET
            password = ${newPasswordHash},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userIdNum}
        `;
      }
      
      console.log(`✅ Password updated successfully for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating user password:', error);
      return false;
    }
  }
} 