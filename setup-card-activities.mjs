import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Create a database connection
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up card_activities table for tracking loyalty card transactions...');
    
    // Check if card_activities table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'card_activities'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating card_activities table...');
      await pool.query(`
        CREATE TABLE card_activities (
          id SERIAL PRIMARY KEY,
          card_id INTEGER NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
          activity_type VARCHAR(50) NOT NULL,
          points INTEGER NOT NULL DEFAULT 0,
          description TEXT,
          transaction_reference VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_card_activities_card_id ON card_activities(card_id);
        CREATE INDEX idx_card_activities_activity_type ON card_activities(activity_type);
        CREATE INDEX idx_card_activities_created_at ON card_activities(created_at);
      `);
      console.log('✅ Created card_activities table');
    } else {
      console.log('card_activities table already exists');
      
      // Check and add any missing columns
      const columnsToCheck = [
        { name: 'transaction_reference', type: 'VARCHAR(100)' }
      ];
      
      for (const column of columnsToCheck) {
        const columnCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'card_activities' 
            AND column_name = $1
          );
        `, [column.name]);
        
        if (!columnCheck.rows[0].exists) {
          console.log(`Adding missing column ${column.name} to card_activities table...`);
          await pool.query(`
            ALTER TABLE card_activities 
            ADD COLUMN ${column.name} ${column.type};
          `);
          console.log(`✅ Added ${column.name} column`);
        }
      }
    }
    
    // Add activity type enumeration values if PostgreSQL
    console.log('Setting up activity type constraint...');
    try {
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_activity_type') THEN
            CREATE TYPE card_activity_type AS ENUM (
              'EARN_POINTS', 
              'REDEEM_REWARD', 
              'TIER_CHANGE', 
              'PROMO_CODE_REDEMPTION',
              'PROMO_CODE_REFERRAL',
              'ENROLLMENT',
              'MANUAL_ADJUSTMENT'
            );
            
            ALTER TABLE card_activities 
            ALTER COLUMN activity_type TYPE card_activity_type USING activity_type::card_activity_type;
          END IF;
        END
        $$;
      `);
      console.log('✅ Set up activity type constraint');
    } catch (error) {
      console.log('Note: Using VARCHAR for activity_type instead of ENUM');
    }
    
    // Create test data if needed
    const dataCheck = await pool.query(`
      SELECT COUNT(*) as count FROM card_activities
    `);
    
    if (parseInt(dataCheck.rows[0].count) === 0) {
      console.log('No card activities found. Creating sample activities...');
      
      // Get loyalty cards
      const cardsResult = await pool.query(`
        SELECT id, customer_id, business_id FROM loyalty_cards LIMIT 10
      `);
      
      if (cardsResult.rows.length > 0) {
        for (const card of cardsResult.rows) {
          // Create enrollment activity
          await pool.query(`
            INSERT INTO card_activities (
              card_id,
              activity_type,
              points,
              description,
              created_at
            ) VALUES (
              $1,
              'ENROLLMENT',
              0,
              'Enrolled in loyalty program',
              NOW() - INTERVAL '30 days'
            )
          `, [card.id]);
          
          // Create some earning activities
          const earningPoints = [50, 75, 100, 125];
          const earningDays = [25, 20, 15, 10, 5];
          
          for (let i = 0; i < 5; i++) {
            const points = earningPoints[Math.floor(Math.random() * earningPoints.length)];
            const days = earningDays[i];
            
            await pool.query(`
              INSERT INTO card_activities (
                card_id,
                activity_type,
                points,
                description,
                created_at
              ) VALUES (
                $1,
                'EARN_POINTS',
                $2,
                $3,
                NOW() - INTERVAL '${days} days'
              )
            `, [
              card.id,
              points,
              `Earned ${points} points for purchase`
            ]);
          }
          
          // Create a redemption activity for some cards
          if (Math.random() > 0.5) {
            await pool.query(`
              INSERT INTO card_activities (
                card_id,
                activity_type,
                points,
                description,
                created_at
              ) VALUES (
                $1,
                'REDEEM_REWARD',
                100,
                'Redeemed Free Coffee reward',
                NOW() - INTERVAL '3 days'
              )
            `, [card.id]);
          }
        }
        
        console.log('✅ Created sample card activities');
      }
    }
    
    console.log('✅ Card activities setup completed successfully!');
  } catch (error) {
    console.error('Error setting up card activities:', error);
  } finally {
    await pool.end();
  }
}

main(); 