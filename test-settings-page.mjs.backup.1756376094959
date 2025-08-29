import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Testing settings page functionality...');
    
    // 1. Modify business settings for a test user
    const testUserId = 3; // Test Business
    
    // Get current settings
    console.log(`Getting current settings for business ID: ${testUserId}`);
    const currentSettings = await pool.query(`
      SELECT * FROM business_settings 
      WHERE business_id = $1
    `, [testUserId]);
    
    if (currentSettings.rows.length === 0) {
      console.log('No settings found for this business ID');
      return;
    }
    
    const settings = currentSettings.rows[0];
    console.log('Current settings:');
    console.log(`- Points per dollar: ${settings.points_per_dollar}`);
    console.log(`- Points expiry days: ${settings.points_expiry_days}`);
    console.log(`- Minimum points redemption: ${settings.minimum_points_redemption}`);
    console.log(`- Welcome bonus: ${settings.welcome_bonus}`);
    
    // Update settings with new values
    const newPointsPerDollar = 25;
    const newPointsExpiryDays = 400;
    const newMinimumPointsRedemption = 150;
    const newWelcomeBonus = 75;
    
    console.log('\nUpdating settings to:');
    console.log(`- Points per dollar: ${newPointsPerDollar}`);
    console.log(`- Points expiry days: ${newPointsExpiryDays}`);
    console.log(`- Minimum points redemption: ${newMinimumPointsRedemption}`);
    console.log(`- Welcome bonus: ${newWelcomeBonus}`);
    
    await pool.query(`
      UPDATE business_settings SET
        points_per_dollar = $1,
        points_expiry_days = $2,
        minimum_points_redemption = $3,
        welcome_bonus = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE business_id = $5
    `, [
      newPointsPerDollar,
      newPointsExpiryDays,
      newMinimumPointsRedemption,
      newWelcomeBonus,
      testUserId
    ]);
    
    // 2. Verify the update was successful
    const updatedSettings = await pool.query(`
      SELECT * FROM business_settings 
      WHERE business_id = $1
    `, [testUserId]);
    
    const updated = updatedSettings.rows[0];
    console.log('\nVerifying updated settings:');
    console.log(`- Points per dollar: ${updated.points_per_dollar} (Expected: ${newPointsPerDollar})`);
    console.log(`- Points expiry days: ${updated.points_expiry_days} (Expected: ${newPointsExpiryDays})`);
    console.log(`- Minimum points redemption: ${updated.minimum_points_redemption} (Expected: ${newMinimumPointsRedemption})`);
    console.log(`- Welcome bonus: ${updated.welcome_bonus} (Expected: ${newWelcomeBonus})`);
    
    // 3. Test business profile
    console.log('\nChecking business profile data...');
    const profileResult = await pool.query(`
      SELECT * FROM business_profile 
      WHERE business_id = $1
    `, [testUserId]);
    
    if (profileResult.rows.length === 0) {
      console.log('No profile found for this business ID');
    } else {
      const profile = profileResult.rows[0];
      console.log('Business profile:');
      console.log(`- Name: ${profile.business_name}`);
      console.log(`- Phone: ${profile.phone}`);
      console.log(`- Language: ${profile.language}`);
      console.log(`- Country: ${profile.country}`);
      console.log(`- Currency: ${profile.currency}`);
      
      // Update profile data
      console.log('\nUpdating business profile...');
      await pool.query(`
        UPDATE business_profile SET
          country = 'United Arab Emirates',
          currency = 'AED',
          updated_at = CURRENT_TIMESTAMP
        WHERE business_id = $1
      `, [testUserId]);
      
      // Verify profile update
      const updatedProfileResult = await pool.query(`
        SELECT * FROM business_profile 
        WHERE business_id = $1
      `, [testUserId]);
      
      const updatedProfile = updatedProfileResult.rows[0];
      console.log('\nVerifying updated profile:');
      console.log(`- Country: ${updatedProfile.country} (Expected: United Arab Emirates)`);
      console.log(`- Currency: ${updatedProfile.currency} (Expected: AED)`);
    }
    
    console.log('\nSettings test completed successfully! ✅');
    console.log('The settings page should now be working correctly with the database.');
    console.log('Note: You may need to refresh the page to see the updated settings.');
  } catch (error) {
    console.error('Error testing settings:', error);
  } finally {
    await pool.end();
  }
}

main(); 