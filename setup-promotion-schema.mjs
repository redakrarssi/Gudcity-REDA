import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

// Directly set the database URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up promotions schema...');

    // Read the schema SQL file
    const sql = fs.readFileSync('./db/promotion_schema.sql', 'utf8');
    
    // Execute the schema SQL
    await pool.query(sql);
    console.log('Schema created successfully!');
    
    // Check if tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('promo_codes', 'promo_redemptions')
    `);
    
    console.log('Created tables:', result.rows.map(row => row.table_name).join(', '));
    
    // Insert sample data (optional)
    console.log('Inserting sample promotion data...');
    
    const userEmail = 'olb_chelsea@hotmail.fr';
    
    // Get the user's ID for the business_id
    const userResult = await pool.query(`
      SELECT id FROM users WHERE email = $1
    `, [userEmail]);
    
    if (userResult.rows.length === 0) {
      console.log(`User with email ${userEmail} not found.`);
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`Found user ID: ${userId}`);
    
    // Check if any promo codes already exist for this user
    const existingCodes = await pool.query(`
      SELECT COUNT(*) as count FROM promo_codes WHERE business_id = $1
    `, [userId]);
    
    if (parseInt(existingCodes.rows[0].count) > 0) {
      console.log(`Found ${existingCodes.rows[0].count} existing promo codes for this user, skipping sample data insertion.`);
    } else {
      // Insert sample promo codes
      const sampleCodes = [
        { 
          code: 'SUMMER25', 
          type: 'DISCOUNT', 
          value: 25.00, 
          currency: 'USD', 
          maxUses: 100, 
          name: 'Summer Special',
          description: '25% off your summer purchase' 
        },
        { 
          code: 'WELCOME50', 
          type: 'DISCOUNT', 
          value: 50.00, 
          currency: 'USD', 
          maxUses: 50, 
          name: 'Welcome Discount',
          description: '50% off your first purchase' 
        },
        { 
          code: 'POINTS100', 
          type: 'POINTS', 
          value: 100.00, 
          currency: null, 
          maxUses: null, 
          name: 'Point Booster',
          description: 'Earn extra 100 points' 
        },
        { 
          code: 'CASHBACK10', 
          type: 'CASHBACK', 
          value: 10.00, 
          currency: 'USD', 
          maxUses: 200, 
          name: 'Cash Back Offer',
          description: 'Get 10% cashback on purchases' 
        }
      ];
      
      for (const code of sampleCodes) {
        await pool.query(`
          INSERT INTO promo_codes (
            business_id, 
            code, 
            type, 
            value, 
            currency, 
            max_uses, 
            name, 
            description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          userId,
          code.code,
          code.type,
          code.value,
          code.currency,
          code.maxUses,
          code.name,
          code.description
        ]);
      }
      
      console.log(`Added ${sampleCodes.length} sample promo codes.`);
    }
    
    console.log('Promotion setup complete! ✅');
  } catch (error) {
    console.error('Error setting up promotion schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 