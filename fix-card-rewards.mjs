import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const pool = new Pool({
  connectionString: "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
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