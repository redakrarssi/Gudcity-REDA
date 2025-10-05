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
      
      console.log(`🔐 Attempting password update for user ${userId}`);

      // Get all column names for debugging
      const allColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY column_name
      `;
      console.log(`Available columns in users table: ${allColumns.map(c => c.column_name).join(', ')}`);
      
      // Check which password column exists in the database
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ('password', 'password_hash')
      `;
      
      const hasPasswordHash = columns.some(col => col.column_name === 'password_hash');
      const hasPassword = columns.some(col => col.column_name === 'password');
      
      console.log(`Password columns found: password=${hasPassword ? 'Yes' : 'No'}, password_hash=${hasPasswordHash ? 'Yes' : 'No'}`);
      
      // Ensure both columns exist - add them if they don't
      if (!hasPasswordHash) {
        console.log('Adding missing password_hash column...');
        await sql.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)');
      }
      
      if (!hasPassword) {
        console.log('Adding missing password column...');
        await sql.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)');
      }
      
      // Check if user exists and get current password data
      const userResult = await sql`
        SELECT id, password, password_hash FROM users 
        WHERE id = ${userIdNum}
      `;
      
      if (userResult.length === 0) {
        console.error(`❌ No user found with ID: ${userId}`);
        return false;
      }
      
      const user = userResult[0];
      console.log(`Found user: id=${user.id}, has_password=${!!user.password}, has_password_hash=${!!user.password_hash}`);
      
      // Import bcrypt directly for password hashing/verification
      const bcrypt = await import('bcryptjs');
      
      // Choose which password hash to use for verification
      const storedHash = user.password_hash || user.password;
      
      if (!storedHash) {
        console.log(`⚠️ User ${userId} has no password set. Allowing new password set without verification.`);
        // Just set new password without verifying old one
      } else {
        console.log(`🔑 Verifying current password for user ${userId}`);
        
        try {
          // Try bcrypt verification
          if (storedHash.startsWith('$2')) {
            const isValid = await bcrypt.compare(currentPassword, storedHash);
            if (!isValid) {
              console.error(`❌ Invalid current password for user ${userId}`);
              return false;
            }
          } else {
            // Legacy verification - just compare strings
            if (currentPassword !== storedHash) {
              console.error(`❌ Invalid current password for user ${userId}`);
              return false;
            }
          }
        } catch (verifyError) {
          console.error(`❌ Error verifying password: ${verifyError}`);
          return false;
        }
      }
      
      console.log(`✅ Password verification passed`);
      
      // Hash the new password with bcrypt
      console.log(`🔑 Hashing new password`);
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);
      
      // Update both password columns directly using a transaction
      console.log(`💾 Updating password in database`);
      try {
        await sql.begin();
        
        // SECURITY: Record password change timestamp
        const passwordChangedAt = new Date();
        
        await sql`
          UPDATE users SET
            password = ${newPasswordHash},
            password_hash = ${newPasswordHash},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${userIdNum}
        `;
        
        await sql.commit();
        console.log(`✅ Password updated successfully for user ${userId}`);
        
        // SECURITY: Revoke all tokens for this user after password change
        // This forces re-authentication with the new password
        try {
          console.log(`🚫 Revoking all tokens for user ${userId} after password change`);
          
          // Call the server-side API to revoke tokens
          await fetch('/api/auth/revoke-tokens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: userIdNum,
              reason: 'Password changed'
            })
          });
          
          console.log(`✅ All tokens revoked for user ${userId}`);
        } catch (revokeError) {
          console.error(`⚠️ Error revoking tokens (non-critical): ${revokeError}`);
          // Don't fail the password update if token revocation fails
        }
        
        return true;
      } catch (updateError) {
        console.error(`❌ Error during password update transaction: ${updateError}`);
        await sql.rollback();
        return false;
      }
    } catch (error) {
      console.error(`❌ Error updating user password: ${error}`);
      if (error instanceof Error) {
        throw error; // Pass the error up for better error handling in the UI
      }
      return false;
    }
  }
} 