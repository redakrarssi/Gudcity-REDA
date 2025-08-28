import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up business settings schema...');

    // Create the business_settings table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_settings (
        id SERIAL PRIMARY KEY,
        business_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points_per_dollar DECIMAL(10, 2) DEFAULT 10,
        points_expiry_days INTEGER DEFAULT 365,
        minimum_points_redemption INTEGER DEFAULT 100,
        welcome_bonus INTEGER DEFAULT 50,
        
        -- Business Hours (JSON format)
        business_hours JSONB DEFAULT '{
          "monday": {"open": "09:00", "close": "17:00", "isClosed": false},
          "tuesday": {"open": "09:00", "close": "17:00", "isClosed": false},
          "wednesday": {"open": "09:00", "close": "17:00", "isClosed": false},
          "thursday": {"open": "09:00", "close": "17:00", "isClosed": false},
          "friday": {"open": "09:00", "close": "17:00", "isClosed": false},
          "saturday": {"open": "10:00", "close": "14:00", "isClosed": false},
          "sunday": {"open": "00:00", "close": "00:00", "isClosed": true}
        }',
        
        -- Payment Settings (JSON format)
        payment_settings JSONB DEFAULT '{
          "acceptsCard": true,
          "acceptsCash": true,
          "acceptsOnline": false,
          "serviceFeePercent": 0
        }',
        
        -- Notification Settings (JSON format)
        notification_settings JSONB DEFAULT '{
          "email": true,
          "push": true,
          "sms": false,
          "customerActivity": true,
          "promotionStats": true,
          "systemUpdates": true
        }',
        
        -- Integrations (JSON format)
        integrations JSONB DEFAULT '{
          "pos": false,
          "accounting": false,
          "marketing": false,
          "crm": false
        }',
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(business_id)
      );
    `);

    // Create an index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);
    `);

    console.log('Business settings schema created successfully!');

    // Check if we have business users without settings
    const usersResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.business_name, u.business_phone 
      FROM users u
      LEFT JOIN business_settings bs ON u.id = bs.business_id
      WHERE u.user_type = 'business' AND bs.id IS NULL
    `);
    
    const businessUsersWithoutSettings = usersResult.rows;
    console.log(`Found ${businessUsersWithoutSettings.length} business users without settings`);
    
    // Create default settings for businesses that don't have them
    let createdCount = 0;
    for (const user of businessUsersWithoutSettings) {
      try {
        await pool.query(`
          INSERT INTO business_settings (
            business_id,
            points_per_dollar,
            points_expiry_days,
            minimum_points_redemption,
            welcome_bonus
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (business_id) DO NOTHING
        `, [user.id, 10, 365, 100, 50]);
        
        console.log(`Created settings for business ID: ${user.id} (${user.business_name || user.name})`);
        createdCount++;
      } catch (error) {
        console.error(`Error creating settings for business ID ${user.id}:`, error);
      }
    }
    
    console.log(`Created default settings for ${createdCount} businesses`);
    
    // Update any existing records that are missing required fields
    try {
      console.log('Checking for columns in business_settings table...');
      
      // Check if minimum_points_redemption column exists
      const minimumPointsExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'business_settings' 
          AND column_name = 'minimum_points_redemption'
        ) as exists
      `);
      
      // Check if welcome_bonus column exists
      const welcomeBonusExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'business_settings' 
          AND column_name = 'welcome_bonus'
        ) as exists
      `);
      
      console.log('Columns present:');
      console.log('- minimum_points_redemption:', minimumPointsExists.rows[0].exists ? 'Yes' : 'No');
      console.log('- welcome_bonus:', welcomeBonusExists.rows[0].exists ? 'Yes' : 'No');
      
      // Add missing columns if needed
      if (!minimumPointsExists.rows[0].exists) {
        console.log('Adding minimum_points_redemption column...');
        await pool.query(`
          ALTER TABLE business_settings 
          ADD COLUMN minimum_points_redemption INTEGER DEFAULT 100
        `);
      }
      
      if (!welcomeBonusExists.rows[0].exists) {
        console.log('Adding welcome_bonus column...');
        await pool.query(`
          ALTER TABLE business_settings 
          ADD COLUMN welcome_bonus INTEGER DEFAULT 50
        `);
      }
      
      // Update any records with null values
      await pool.query(`
        UPDATE business_settings 
        SET 
          minimum_points_redemption = 100 
        WHERE minimum_points_redemption IS NULL
      `);
      
      await pool.query(`
        UPDATE business_settings 
        SET 
          welcome_bonus = 50 
        WHERE welcome_bonus IS NULL
      `);
      
      console.log('Updated records with missing values');
    } catch (error) {
      console.error('Error updating table schema or records:', error);
    }
    
    // Check if we need to also create business_profile entries
    try {
      // Check if table exists
      const profileTableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'business_profile'
        ) as exists
      `);
      
      if (profileTableExists.rows[0].exists) {
        console.log('Checking for missing business_profile entries...');
        
        const missingProfiles = await pool.query(`
          SELECT u.id, u.name, u.email, u.business_name, u.business_phone 
          FROM users u
          LEFT JOIN business_profile bp ON u.id = bp.business_id
          WHERE u.user_type = 'business' AND bp.id IS NULL
        `);
        
        if (missingProfiles.rows.length > 0) {
          console.log(`Found ${missingProfiles.rows.length} businesses without profiles`);
          console.log('Run setup-business-profile-schema.mjs to create them');
        } else {
          console.log('All businesses have profile entries');
        }
      }
    } catch (error) {
      console.error('Error checking business profiles:', error);
    }
    
    // Display some sample data
    const settingsResult = await pool.query(`
      SELECT bs.*, u.business_name, u.email
      FROM business_settings bs
      JOIN users u ON bs.business_id = u.id
      LIMIT 5
    `);
    
    if (settingsResult.rows.length > 0) {
      console.log('\nSample business settings:');
      settingsResult.rows.forEach(row => {
        console.log(`- Business: ${row.business_name || 'Unnamed'} (ID: ${row.business_id})`);
        console.log(`  Points per dollar: ${row.points_per_dollar}`);
        console.log(`  Points expiry: ${row.points_expiry_days} days`);
        console.log(`  Created: ${new Date(row.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    console.log('Business settings setup complete! ✅');
  } catch (error) {
    console.error('Error setting up business settings schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 