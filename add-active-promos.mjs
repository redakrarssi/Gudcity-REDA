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
    // Get a business user
    const userEmail = 'olb_chelsea@hotmail.fr';
    const userResult = await pool.query(`
      SELECT id, business_name FROM users WHERE email = $1
    `, [userEmail]);
    
    if (userResult.rows.length === 0) {
      console.log(`User with email ${userEmail} not found.`);
      return;
    }
    
    const userId = userResult.rows[0].id;
    const businessName = userResult.rows[0].business_name;
    console.log(`Found user ID: ${userId}, Business name: ${businessName}`);
    
    // Add some active promos
    const activePromos = [
      { 
        code: 'SPRING25', 
        type: 'DISCOUNT', 
        value: 25.00, 
        currency: 'USD', 
        maxUses: 100, 
        name: 'Spring Special',
        description: '25% off your spring purchase' 
      },
      { 
        code: 'NEWUSER50', 
        type: 'DISCOUNT', 
        value: 50.00, 
        currency: 'USD', 
        maxUses: 50, 
        name: 'New User Discount',
        description: '50% off your first purchase' 
      },
      { 
        code: 'BONUS200', 
        type: 'POINTS', 
        value: 200.00, 
        currency: null, 
        maxUses: null, 
        name: 'Bonus Points',
        description: 'Earn extra 200 points' 
      },
      { 
        code: 'GIFT15', 
        type: 'GIFT', 
        value: 15.00, 
        currency: 'USD', 
        maxUses: 20, 
        name: 'Gift Card Offer',
        description: '$15 gift card with purchase over $75' 
      }
    ];
    
    let added = 0;
    for (const promo of activePromos) {
      try {
        // Check if code already exists
        const existingCode = await pool.query(`
          SELECT id FROM promo_codes WHERE code = $1
        `, [promo.code]);
        
        if (existingCode.rows.length > 0) {
          // Update to active if it exists
          await pool.query(`
            UPDATE promo_codes 
            SET status = 'ACTIVE', 
                updated_at = NOW() 
            WHERE code = $1
          `, [promo.code]);
          console.log(`Updated existing code ${promo.code} to ACTIVE`);
          added++;
        } else {
          // Insert a new code
          await pool.query(`
            INSERT INTO promo_codes (
              business_id, 
              code, 
              type, 
              value, 
              currency, 
              max_uses, 
              name, 
              description,
              status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            userId,
            promo.code,
            promo.type,
            promo.value,
            promo.currency,
            promo.maxUses,
            promo.name,
            promo.description,
            'ACTIVE'
          ]);
          console.log(`Added new code ${promo.code}`);
          added++;
        }
      } catch (error) {
        console.error(`Error adding/updating promo ${promo.code}:`, error);
      }
    }
    
    console.log(`Successfully added/updated ${added} promo codes.`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 