import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Create a database connection
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: true
});

// Card tiers with their benefits
const CARD_TIERS = {
  STANDARD: {
    pointsMultiplier: 1.0,
    benefits: ['Basic rewards', 'Birthday gift'],
    pointsToNext: 1000
  },
  SILVER: {
    pointsMultiplier: 1.25,
    benefits: ['Basic rewards', 'Birthday gift', '5% discount'],
    pointsToNext: 2500
  },
  GOLD: {
    pointsMultiplier: 1.5,
    benefits: ['All Silver benefits', '10% discount', 'Free item monthly'],
    pointsToNext: 5000
  },
  PLATINUM: {
    pointsMultiplier: 2.0,
    benefits: ['All Gold benefits', '15% discount', 'Priority service', 'Exclusive events'],
    pointsToNext: null
  }
};

async function main() {
  try {
    console.log('Starting loyalty card system enhancement...');
    
    // 1. Fix schema issues
    await fixLoyaltyCardSchema();
    
    // 2. Ensure loyalty cards exist for all customer-business relationships
    await createMissingLoyaltyCards();
    
    // 3. Update card tiers based on customer activity
    await updateCardTiers();
    
    // 4. Generate unique promo codes for each card
    await generatePromoCodesForCards();
    
    // 5. Add reward programs to cards
    await setupCardRewards();
    
    console.log('✅ Loyalty card system enhancement completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

async function fixLoyaltyCardSchema() {
  console.log('\nChecking and fixing loyalty card schema...');
  
  try {
    // Check if necessary columns exist
    const columnsToCheck = [
      { name: 'promo_code', type: 'VARCHAR(50)', default: null },
      { name: 'tier', type: 'VARCHAR(20)', default: "'STANDARD'" },
      { name: 'benefits', type: 'TEXT[]', default: null },
      { name: 'points_multiplier', type: 'NUMERIC(3,2)', default: '1.00' },
      { name: 'available_rewards', type: 'JSONB', default: "'[]'::jsonb" }
    ];
    
    for (const column of columnsToCheck) {
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'loyalty_cards' 
          AND column_name = $1
        );
      `, [column.name]);
      
      if (!columnCheck.rows[0].exists) {
        console.log(`Adding missing column ${column.name} to loyalty_cards table...`);
        await pool.query(`
          ALTER TABLE loyalty_cards 
          ADD COLUMN ${column.name} ${column.type} ${column.default ? `DEFAULT ${column.default}` : ''};
        `);
        console.log(`✅ Added ${column.name} column`);
      }
    }
    
    // Check if there's a unique constraint on promo_code
    const uniqueCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_constraint
        WHERE contype = 'u' 
        AND conrelid = 'loyalty_cards'::regclass 
        AND conname = 'uq_loyalty_cards_promo_code'
      );
    `);
    
    if (!uniqueCheck.rows[0].exists) {
      console.log('Adding unique constraint on promo_code...');
      await pool.query(`
        ALTER TABLE loyalty_cards
        ADD CONSTRAINT uq_loyalty_cards_promo_code 
        UNIQUE (promo_code);
      `);
      console.log('✅ Added unique constraint on promo_code');
    }
    
    console.log('✅ Loyalty card schema is now up to date');
  } catch (error) {
    console.error('Error fixing loyalty card schema:', error);
    throw error;
  }
}

async function createMissingLoyaltyCards() {
  console.log('\nChecking for missing loyalty cards...');
  
  try {
    // Find all business-customer relationships without a loyalty card
    const result = await pool.query(`
      WITH relationships AS (
        SELECT DISTINCT 
          c.id AS customer_id, 
          lp.business_id
        FROM customers c
        CROSS JOIN loyalty_programs lp
        EXCEPT
        SELECT 
          customer_id::INTEGER, 
          business_id::INTEGER
        FROM loyalty_cards
      )
      SELECT 
        r.customer_id, 
        r.business_id,
        lp.id AS program_id
      FROM relationships r
      JOIN loyalty_programs lp ON lp.business_id = r.business_id::TEXT;
    `);
    
    if (result.rows.length === 0) {
      console.log('No missing loyalty cards found.');
      return;
    }
    
    console.log(`Found ${result.rows.length} missing loyalty cards. Creating them...`);
    
    for (const row of result.rows) {
      // Generate a unique promo code
      const promoCode = generateUniquePromoCode(row.business_id, row.customer_id);
      
      // Create the card with default tier
      await pool.query(`
        INSERT INTO loyalty_cards (
          customer_id,
          business_id,
          program_id,
          card_type,
          tier,
          points,
          promo_code,
          benefits,
          points_multiplier,
          available_rewards,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
      `, [
        row.customer_id,
        row.business_id,
        row.program_id,
        'STANDARD',
        'STANDARD',
        0,
        promoCode,
        CARD_TIERS.STANDARD.benefits,
        CARD_TIERS.STANDARD.pointsMultiplier,
        JSON.stringify([]),
        true
      ]);
      
      console.log(`✅ Created loyalty card for customer ${row.customer_id}, business ${row.business_id}`);
    }
    
    console.log(`✅ Created ${result.rows.length} missing loyalty cards`);
  } catch (error) {
    console.error('Error creating missing loyalty cards:', error);
    throw error;
  }
}

async function updateCardTiers() {
  console.log('\nUpdating card tiers based on customer activity...');
  
  try {
    // Get cards with their point totals
    const cardsResult = await pool.query(`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.business_id,
        lc.points,
        lc.tier
      FROM loyalty_cards lc
    `);
    
    console.log(`Checking tiers for ${cardsResult.rows.length} loyalty cards...`);
    
    for (const card of cardsResult.rows) {
      const points = parseInt(card.points) || 0;
      let newTier = 'STANDARD';
      
      // Determine tier based on points
      if (points >= 5000) {
        newTier = 'PLATINUM';
      } else if (points >= 2500) {
        newTier = 'GOLD';
      } else if (points >= 1000) {
        newTier = 'SILVER';
      }
      
      // Update card if tier changed
      if (newTier !== card.tier) {
        const tierData = CARD_TIERS[newTier];
        
        await pool.query(`
          UPDATE loyalty_cards
          SET 
            tier = $1,
            card_type = $1,
            benefits = $2,
            points_multiplier = $3,
            points_to_next = $4,
            updated_at = NOW()
          WHERE id = $5
        `, [
          newTier,
          tierData.benefits,
          tierData.pointsMultiplier,
          tierData.pointsToNext,
          card.id
        ]);
        
        console.log(`✅ Updated card ${card.id} from ${card.tier} to ${newTier} tier`);
      }
    }
    
    console.log('✅ Card tiers have been updated');
  } catch (error) {
    console.error('Error updating card tiers:', error);
    throw error;
  }
}

async function generatePromoCodesForCards() {
  console.log('\nGenerating unique promo codes for loyalty cards...');
  
  try {
    // Find cards without promo codes
    const result = await pool.query(`
      SELECT 
        id,
        customer_id,
        business_id
      FROM loyalty_cards
      WHERE promo_code IS NULL
    `);
    
    if (result.rows.length === 0) {
      console.log('All loyalty cards already have promo codes.');
      return;
    }
    
    console.log(`Found ${result.rows.length} cards without promo codes. Generating them...`);
    
    for (const card of result.rows) {
      const promoCode = generateUniquePromoCode(card.business_id, card.customer_id);
      
      await pool.query(`
        UPDATE loyalty_cards
        SET 
          promo_code = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [promoCode, card.id]);
      
      console.log(`✅ Generated promo code ${promoCode} for card ${card.id}`);
    }
    
    console.log('✅ All loyalty cards now have unique promo codes');
  } catch (error) {
    console.error('Error generating promo codes:', error);
    throw error;
  }
}

async function setupCardRewards() {
  console.log('\nSetting up rewards for loyalty cards...');
  
  try {
    // Standard rewards by tier
    const tierRewards = {
      STANDARD: [
        { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
        { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday' }
      ],
      SILVER: [
        { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
        { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
        { name: '5% Discount', points: 0, description: 'Automatic 5% discount on all purchases' },
        { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday' }
      ],
      GOLD: [
        { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
        { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
        { name: 'Free Lunch', points: 500, description: 'Enjoy a free lunch item' },
        { name: '10% Discount', points: 0, description: 'Automatic 10% discount on all purchases' },
        { name: 'Free Monthly Item', points: 0, description: 'One free item each month' },
        { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday' }
      ],
      PLATINUM: [
        { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
        { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
        { name: 'Free Lunch', points: 500, description: 'Enjoy a free lunch item' },
        { name: 'Premium Reward', points: 1000, description: 'Special premium reward' },
        { name: '15% Discount', points: 0, description: 'Automatic 15% discount on all purchases' },
        { name: 'Priority Service', points: 0, description: 'Priority service at all locations' },
        { name: 'Free Monthly Item', points: 0, description: 'One free item each month' },
        { name: 'Exclusive Events', points: 0, description: 'Access to exclusive member events' },
        { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday' }
      ]
    };
    
    // Get all cards
    const cardsResult = await pool.query(`
      SELECT 
        id,
        tier,
        available_rewards
      FROM loyalty_cards
    `);
    
    for (const card of cardsResult.rows) {
      // Check if the card already has the right rewards for its tier
      const currentRewards = card.available_rewards || [];
      const tierRewardsList = tierRewards[card.tier] || tierRewards.STANDARD;
      
      // Only update if rewards are empty or don't match the tier
      if (currentRewards.length === 0 || !rewardsMatch(currentRewards, tierRewardsList)) {
        await pool.query(`
          UPDATE loyalty_cards
          SET 
            available_rewards = $1,
            updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(tierRewardsList), card.id]);
        
        console.log(`✅ Updated rewards for ${card.tier} card ${card.id}`);
      }
    }
    
    console.log('✅ All loyalty cards now have appropriate rewards');
  } catch (error) {
    console.error('Error setting up card rewards:', error);
    throw error;
  }
}

// Helper function to check if current rewards match tier rewards
function rewardsMatch(currentRewards, tierRewards) {
  if (currentRewards.length !== tierRewards.length) {
    return false;
  }
  
  const currentNames = new Set(currentRewards.map(r => r.name));
  return tierRewards.every(r => currentNames.has(r.name));
}

// Helper function to generate a unique promo code
function generateUniquePromoCode(businessId, customerId) {
  const businessPrefix = `B${businessId}`.substring(0, 3);
  const customerPart = `C${customerId}`.substring(0, 3);
  const randomPart = randomUUID().substring(0, 6).toUpperCase();
  
  return `${businessPrefix}-${customerPart}-${randomPart}`;
}

main(); 