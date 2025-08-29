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

// Default rewards for STANDARD tier
const standardRewards = [
  { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
  { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
];

async function main() {
  try {
    console.log('Starting fix for card rewards...');
    
    // Check if loyalty card exists and update available_rewards
    const cardExists = await pool.query(`
      SELECT id, tier, available_rewards FROM loyalty_cards
      WHERE customer_id = 4
    `);
    
    if (cardExists.rows.length > 0) {
      console.log(`Found loyalty card with ID ${cardExists.rows[0].id} and tier ${cardExists.rows[0].tier}`);
      
      // Check if available_rewards is set
      if (!cardExists.rows[0].available_rewards) {
        console.log('available_rewards is not set, updating...');
        
        // Update the card with default rewards
        await pool.query(`
          UPDATE loyalty_cards
          SET available_rewards = $1,
              updated_at = NOW()
          WHERE customer_id = 4
        `, [JSON.stringify(standardRewards)]);
        
        console.log('✅ Updated available_rewards for customer ID 4 loyalty card');
      } else {
        console.log('✅ available_rewards is already set:', cardExists.rows[0].available_rewards);
      }
      
      // Check if the card has the necessary columns
      const cardAfterUpdate = await pool.query(`
        SELECT * FROM loyalty_cards
        WHERE customer_id = 4
      `);
      
      if (cardAfterUpdate.rows.length > 0) {
        const card = cardAfterUpdate.rows[0];
        console.log('\nCard details after update:');
        console.log(`  ID: ${card.id}`);
        console.log(`  Tier: ${card.tier}`);
        console.log(`  Points: ${card.points}`);
        console.log(`  Points Multiplier: ${card.points_multiplier}`);
        console.log(`  Available Rewards: ${JSON.stringify(card.available_rewards)}`);
        console.log(`  Benefits: ${JSON.stringify(card.benefits)}`);
      }
    } else {
      console.log('❌ No loyalty card found for customer ID 4');
    }
    
    console.log('\nSuccessfully fixed card rewards');
  } catch (error) {
    console.error('Error fixing card rewards:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 