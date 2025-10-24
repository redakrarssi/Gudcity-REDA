import sql from '../dev-only/db';

/**
 * Initialize admin-specific database schema and requirements
 * This utility ensures the admin settings functionality works properly
 */
export class AdminDbInitializer {
  private static isInitialized = false;

  /**
   * Initialize all admin-related database requirements
   */
  static async initializeAdminDatabase(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🔧 Initializing admin database schema...');

      // Add missing phone column to users table (separate from business_phone)
      await this.addMissingColumns();

      // Add missing indexes for performance
      await this.addMissingIndexes();

      // Create admin settings table
      await this.createAdminSettingsTable();

      // Create updated_at trigger
      await this.createUpdatedAtTrigger();

      this.isInitialized = true;
      console.log('✅ Admin database schema initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing admin database schema:', error);
      return false;
    }
  }

  /**
   * Add missing columns to users table
   */
  private static async addMissingColumns(): Promise<void> {
    const columns = [
      { name: 'phone', type: 'VARCHAR(50)', default: null },
      { name: 'password_hash', type: 'VARCHAR(255)', default: null },
      { name: 'two_factor_enabled', type: 'BOOLEAN', default: 'FALSE' },
      { name: 'notification_settings', type: 'JSONB', default: `'{"email_notifications": true, "login_alerts": true, "system_updates": true}'` },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE', default: 'CURRENT_TIMESTAMP' },
      { name: 'status', type: 'VARCHAR(50)', default: "'active'" }
    ];

    for (const column of columns) {
      try {
        await sql`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = ${column.name}
            ) THEN
              EXECUTE format('ALTER TABLE users ADD COLUMN %I %s DEFAULT %s', ${column.name}, ${column.type}, ${column.default});
            END IF;
          END
          $$;
        `;
        console.log(`✓ Added column: users.${column.name}`);
      } catch (error) {
        console.warn(`⚠️  Could not add column users.${column.name}:`, error);
      }
    }

    // Special handling for password_hash - copy from password if it exists
    try {
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'password'
          ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'password_hash'
          ) THEN
            UPDATE users SET password_hash = password 
            WHERE password IS NOT NULL AND password_hash IS NULL;
          END IF;
        END
        $$;
      `;
    } catch (error) {
      console.warn('⚠️  Could not sync password columns:', error);
    }
  }

  /**
   * Add missing indexes for performance
   */
  private static async addMissingIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
      'CREATE INDEX IF NOT EXISTS idx_users_two_factor ON users(two_factor_enabled)',
      'CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at)'
    ];

    for (const indexSql of indexes) {
      try {
        await sql.query(indexSql);
        console.log(`✓ Added index: ${indexSql.split(' ')[5]}`);
      } catch (error) {
        console.warn(`⚠️  Could not add index: ${indexSql}`, error);
      }
    }
  }

  /**
   * Create admin settings table
   */
  private static async createAdminSettingsTable(): Promise<void> {
    try {
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
        { key: 'user_registration_enabled', value: 'true', type: 'security', description: 'Allow new user registrations' },
        { key: 'password_min_length', value: '8', type: 'security', description: 'Minimum password length' },
        { key: 'session_timeout_minutes', value: '30', type: 'security', description: 'Session timeout in minutes' },
        { key: 'email_notifications_enabled', value: 'true', type: 'notifications', description: 'Enable email notifications' },
        { key: 'default_currency', value: '"USD"', type: 'payments', description: 'Default currency for transactions' }
      ];

      for (const setting of defaultSettings) {
        await sql`
          INSERT INTO admin_settings (setting_key, setting_value, setting_type, description)
          VALUES (${setting.key}, ${setting.value}::jsonb, ${setting.type}, ${setting.description})
          ON CONFLICT (setting_key) DO NOTHING
        `;
      }

      console.log('✓ Created admin_settings table with defaults');
    } catch (error) {
      console.warn('⚠️  Could not create admin_settings table:', error);
    }
  }

  /**
   * Create updated_at trigger function and triggers
   */
  private static async createUpdatedAtTrigger(): Promise<void> {
    try {
      // Create trigger function
      await sql`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `;

      // Add trigger to users table
      await sql`
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `;

      // Add trigger to admin_settings table
      await sql`
        DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
        CREATE TRIGGER update_admin_settings_updated_at
            BEFORE UPDATE ON admin_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
      `;

      console.log('✓ Created updated_at triggers');
    } catch (error) {
      console.warn('⚠️  Could not create updated_at triggers:', error);
    }
  }

  /**
   * Check if admin database is properly initialized
   */
  static async checkAdminDatabaseHealth(): Promise<{
    isHealthy: boolean;
    missingFeatures: string[];
    errors: string[];
  }> {
    const missingFeatures: string[] = [];
    const errors: string[] = [];

    try {
      // Check for required columns in users table
      const userColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `;

      const requiredColumns = ['phone', 'password_hash', 'two_factor_enabled', 'notification_settings', 'updated_at', 'status'];
      const existingColumns = userColumns.map((col: any) => col.column_name);

      for (const col of requiredColumns) {
        if (!existingColumns.includes(col)) {
          missingFeatures.push(`Missing users.${col} column`);
        }
      }

      // Check for admin_settings table
      const adminSettingsExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'admin_settings'
        )
      `;

      if (!adminSettingsExists[0]?.exists) {
        missingFeatures.push('Missing admin_settings table');
      }

      // Check for trigger function
      const triggerExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.routines 
          WHERE routine_name = 'update_updated_at_column'
        )
      `;

      if (!triggerExists[0]?.exists) {
        missingFeatures.push('Missing updated_at trigger function');
      }

    } catch (error) {
      errors.push(`Health check error: ${error}`);
    }

    return {
      isHealthy: missingFeatures.length === 0 && errors.length === 0,
      missingFeatures,
      errors
    };
  }

  /**
   * Force re-initialization (useful for development/testing)
   */
  static async forceReinitialize(): Promise<boolean> {
    this.isInitialized = false;
    return this.initializeAdminDatabase();
  }
}
