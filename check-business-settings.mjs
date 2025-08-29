import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Checking business settings...');
    
    // Check if business_profile table exists
    const profileTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'business_profile'
      ) as exists
    `);
    
    // Check if business_settings table exists
    const settingsTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'business_settings'
      ) as exists
    `);
    
    console.log('Tables present:');
    console.log('- business_profile:', profileTableExists.rows[0].exists ? 'Yes' : 'No');
    console.log('- business_settings:', settingsTableExists.rows[0].exists ? 'Yes' : 'No');
    
    // If tables don't exist, exit
    if (!profileTableExists.rows[0].exists && !settingsTableExists.rows[0].exists) {
      console.log('No business settings tables found. Please run setup scripts first.');
      return;
    }
    
    // Get business users
    const usersResult = await pool.query(`
      SELECT id, name, email, business_name
      FROM users
      WHERE user_type = 'business'
      ORDER BY id
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('No business users found.');
      return;
    }
    
    console.log(`\nFound ${usersResult.rows.length} business users:`);
    for (const user of usersResult.rows) {
      console.log(`- ID: ${user.id}, Name: ${user.business_name || user.name}, Email: ${user.email}`);
    }
    
    // Check business profile data
    if (profileTableExists.rows[0].exists) {
      const profilesResult = await pool.query(`
        SELECT bp.*, u.name as user_name, u.email as user_email
        FROM business_profile bp
        JOIN users u ON bp.business_id = u.id
        ORDER BY bp.business_id
      `);
      
      console.log(`\nFound ${profilesResult.rows.length} business profiles:`);
      
      for (const profile of profilesResult.rows) {
        console.log(`\n=== Business Profile for ID: ${profile.business_id} ===`);
        console.log(`Name: ${profile.business_name || profile.user_name}`);
        console.log(`Email: ${profile.email || profile.user_email}`);
        console.log(`Phone: ${profile.phone || 'Not set'}`);
        console.log(`Address: ${profile.address || 'Not set'}`);
        console.log(`Language: ${profile.language || 'en'}`);
        console.log(`Country: ${profile.country || 'Not set'}`);
        console.log(`Currency: ${profile.currency || 'USD'}`);
        
        // Parse and display business hours
        if (profile.business_hours) {
          console.log('Business Hours:');
          const hours = typeof profile.business_hours === 'string' 
            ? JSON.parse(profile.business_hours) 
            : profile.business_hours;
            
          for (const [day, schedule] of Object.entries(hours)) {
            console.log(`  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${schedule.isClosed ? 'Closed' : `${schedule.open} - ${schedule.close}`}`);
          }
        }
        
        // Parse and display payment settings
        if (profile.payment_settings) {
          console.log('Payment Settings:');
          const payments = typeof profile.payment_settings === 'string' 
            ? JSON.parse(profile.payment_settings) 
            : profile.payment_settings;
            
          console.log(`  Accepts Card: ${payments.acceptsCard ? 'Yes' : 'No'}`);
          console.log(`  Accepts Cash: ${payments.acceptsCash ? 'Yes' : 'No'}`);
          console.log(`  Accepts Online: ${payments.acceptsOnline ? 'Yes' : 'No'}`);
          console.log(`  Service Fee: ${payments.serviceFeePercent}%`);
        }
        
        console.log(`Created: ${new Date(profile.created_at).toLocaleString()}`);
        console.log(`Updated: ${new Date(profile.updated_at).toLocaleString()}`);
      }
    }
    
    // Check business settings data
    if (settingsTableExists.rows[0].exists) {
      const settingsResult = await pool.query(`
        SELECT bs.*, u.name as user_name, u.business_name
        FROM business_settings bs
        JOIN users u ON bs.business_id = u.id
        ORDER BY bs.business_id
      `);
      
      console.log(`\nFound ${settingsResult.rows.length} business settings records:`);
      
      for (const settings of settingsResult.rows) {
        console.log(`\n=== Business Settings for ID: ${settings.business_id} ===`);
        console.log(`Business Name: ${settings.business_name || settings.user_name}`);
        console.log(`Points Per Dollar: ${settings.points_per_dollar}`);
        console.log(`Points Expiry: ${settings.points_expiry_days} days`);
        console.log(`Minimum Points Redemption: ${settings.minimum_points_redemption}`);
        console.log(`Welcome Bonus: ${settings.welcome_bonus}`);
        
        // Parse and display loyalty settings if available
        if (settings.loyalty_settings) {
          console.log('Loyalty Settings:');
          const loyalty = typeof settings.loyalty_settings === 'string' 
            ? JSON.parse(settings.loyalty_settings) 
            : settings.loyalty_settings;
            
          for (const [key, value] of Object.entries(loyalty)) {
            console.log(`  ${key}: ${value}`);
          }
        }
        
        console.log(`Created: ${new Date(settings.created_at).toLocaleString()}`);
        console.log(`Updated: ${new Date(settings.updated_at).toLocaleString()}`);
      }
    }
    
    // Check missing connections
    if (profileTableExists.rows[0].exists && settingsTableExists.rows[0].exists) {
      const missingProfilesResult = await pool.query(`
        SELECT u.id, u.name, u.business_name
        FROM users u
        LEFT JOIN business_profile bp ON u.id = bp.business_id
        WHERE u.user_type = 'business' AND bp.id IS NULL
      `);
      
      const missingSettingsResult = await pool.query(`
        SELECT u.id, u.name, u.business_name
        FROM users u
        LEFT JOIN business_settings bs ON u.id = bs.business_id
        WHERE u.user_type = 'business' AND bs.id IS NULL
      `);
      
      if (missingProfilesResult.rows.length > 0) {
        console.log(`\n${missingProfilesResult.rows.length} business users missing profiles:`);
        for (const user of missingProfilesResult.rows) {
          console.log(`- ID: ${user.id}, Name: ${user.business_name || user.name}`);
        }
      } else {
        console.log('\nAll business users have profiles');
      }
      
      if (missingSettingsResult.rows.length > 0) {
        console.log(`\n${missingSettingsResult.rows.length} business users missing settings:`);
        for (const user of missingSettingsResult.rows) {
          console.log(`- ID: ${user.id}, Name: ${user.business_name || user.name}`);
        }
      } else {
        console.log('\nAll business users have settings');
      }
    }
  } catch (error) {
    console.error('Error checking business settings:', error);
  } finally {
    await pool.end();
  }
}

main(); 