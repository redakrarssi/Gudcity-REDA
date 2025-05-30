import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

// Directly set the database URL
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up loyalty cards schema...');

    // Read the schema SQL file
    const sql = fs.readFileSync('./db/loyalty_cards_schema.sql', 'utf8');
    
    // Execute the schema SQL
    await pool.query(sql);
    console.log('Schema created successfully!');
    
    // Check if tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('loyalty_cards', 'card_activities')
    `);
    
    console.log('Created tables:', result.rows.map(row => row.table_name).join(', '));
    
    // Check for existing loyalty programs and customers to create sample cards
    const programsResult = await pool.query(`
      SELECT COUNT(*) FROM loyalty_programs
    `);
    
    const customersResult = await pool.query(`
      SELECT COUNT(*) FROM customers
    `);
    
    const programCount = parseInt(programsResult.rows[0].count);
    const customerCount = parseInt(customersResult.rows[0].count);
    
    console.log(`Found ${programCount} loyalty programs and ${customerCount} customers`);
    
    // If we have both customers and programs, create sample data
    if (programCount > 0 && customerCount > 0) {
      console.log('Creating sample loyalty cards...');
      
      // Get first customer ID and program IDs
      const firstCustomerResult = await pool.query(`
        SELECT id FROM customers ORDER BY id LIMIT 1
      `);
      
      const programsIdsResult = await pool.query(`
        SELECT id, business_id FROM loyalty_programs ORDER BY id LIMIT 3
      `);
      
      if (firstCustomerResult.rows.length > 0 && programsIdsResult.rows.length > 0) {
        const customerId = firstCustomerResult.rows[0].id;
        
        // Clear existing cards for this customer (for clean testing)
        await pool.query(`
          DELETE FROM loyalty_cards WHERE customer_id = $1
        `, [customerId]);
        
        // Create sample cards
        const cardTypes = ['PREMIUM', 'GOLD', 'SILVER'];
        const nextRewards = ['Free Coffee', 'Free Dessert Platter', 'Free Training Session'];
        const pointsValues = [235, 450, 320];
        const pointsToNext = [15, 50, 30];
        const expiryDates = ['2024-12-31', '2024-11-15', '2024-09-30'];
        const benefitsList = [
          '{\"10% off every purchase\", \"Free coffee on birthdays\", \"Access to member events\"}',
          '{\"Free pastry with coffee\", \"Early access to seasonal items\", \"Double points on weekends\"}',
          '{\"Guest passes\", \"Locker access\", \"Discounted personal training\"}'
        ];
        
        for (let i = 0; i < Math.min(programsIdsResult.rows.length, 3); i++) {
          const program = programsIdsResult.rows[i];
          
          const cardResult = await pool.query(`
            INSERT INTO loyalty_cards (
              customer_id, 
              business_id,
              program_id,
              card_type,
              points,
              next_reward,
              points_to_next,
              expiry_date,
              benefits,
              last_used,
              is_active
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], NOW() - INTERVAL '${i * 5 + 10} days', TRUE
            )
            RETURNING id
          `, [
            customerId, 
            program.business_id, 
            program.id,
            cardTypes[i],
            pointsValues[i],
            nextRewards[i],
            pointsToNext[i],
            expiryDates[i],
            benefitsList[i]
          ]);
          
          if (cardResult.rows.length > 0) {
            const cardId = cardResult.rows[0].id;
            
            // Add some activities
            await pool.query(`
              INSERT INTO card_activities (
                card_id,
                activity_type,
                points,
                description,
                transaction_reference
              )
              VALUES
                ($1, 'EARN_POINTS', 15, 'Purchase at location', 'TXN-${10000 + i * 1000}'),
                ($1, 'EARN_POINTS', 10, 'Welcome bonus', 'BONUS-00${i+1}')
            `, [cardId]);
            
            console.log(`Created card ${i+1} with ID: ${cardId}`);
          }
        }
        
        console.log('Sample loyalty cards created successfully!');
      }
    }
    
    console.log('Loyalty cards setup complete! ✅');
  } catch (error) {
    console.error('Error setting up loyalty cards schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 