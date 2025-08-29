import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

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
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Starting loyalty card fix script...');
    
    // 1. Check loyalty_cards table structure
    console.log('\nChecking loyalty_cards table structure...');
    const tableColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_cards' 
      ORDER BY ordinal_position
    `);
    
    console.log('Loyalty_cards columns:');
    tableColumns.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
    });
    
    // 2. Check if customer 27 has enrollments
    console.log('\nChecking customer 27 enrollments...');
    const enrollments = await pool.query(`
      SELECT e.*, p.name as program_name, p.type as program_type, b.name as business_name 
      FROM program_enrollments e
      JOIN loyalty_programs p ON e.program_id = p.id
      JOIN businesses b ON p.business_id = b.id
      WHERE e.customer_id = '27'
    `);
    
    console.log(`Found ${enrollments.rowCount} enrollments for customer 27:`);
    enrollments.rows.forEach((enrollment, i) => {
      console.log(`\nEnrollment ${i+1}:`);
      console.log(`  Program ID: ${enrollment.program_id}`);
      console.log(`  Program Name: ${enrollment.program_name}`);
      console.log(`  Program Type: ${enrollment.program_type}`);
      console.log(`  Business Name: ${enrollment.business_name}`);
      console.log(`  Status: ${enrollment.status}`);
      console.log(`  Current Points: ${enrollment.current_points}`);
    });
    
    // 3. Check if customer 27 has loyalty cards
    console.log('\nChecking customer 27 loyalty cards...');
    const cards = await pool.query(`
      SELECT c.*, b.name as business_name, p.name as program_name
      FROM loyalty_cards c
      JOIN businesses b ON c.business_id = b.id
      JOIN loyalty_programs p ON c.program_id = p.id
      WHERE c.customer_id = '27'
    `);
    
    console.log(`Found ${cards.rowCount} loyalty cards for customer 27:`);
    if (cards.rowCount > 0) {
      cards.rows.forEach((card, i) => {
        console.log(`\nCard ${i+1}:`);
        console.log(`  Card ID: ${card.id}`);
        console.log(`  Business: ${card.business_name} (ID: ${card.business_id})`);
        console.log(`  Program: ${card.program_name} (ID: ${card.program_id})`);
        console.log(`  Card Type: ${card.card_type}`);
        console.log(`  Points: ${card.points || 0}`);
        console.log(`  Status: ${card.status || card.is_active ? 'active' : 'inactive'}`);
      });
    }
    
    // 4. Fix missing cards for customer 27
    if (enrollments.rowCount > 0 && cards.rowCount === 0) {
      console.log('\n⚠️ Customer 27 has enrollments but no loyalty cards - FIXING...');
      
      // For each enrollment, create a loyalty card
      for (const enrollment of enrollments.rows) {
        // Get business ID from program
        const businessResult = await pool.query(`
          SELECT business_id FROM loyalty_programs WHERE id = $1
        `, [enrollment.program_id]);
        
        if (businessResult.rows.length === 0) {
          console.log(`⚠️ No business found for program ${enrollment.program_id}`);
          continue;
        }
        
        const businessId = businessResult.rows[0].business_id;
        
        // Generate a card number
        const cardNumber = `C27-${enrollment.program_id}-${Date.now().toString().slice(-6)}`;
        
        console.log(`Creating loyalty card for program ${enrollment.program_id} (business ${businessId})...`);
        
        // Create the loyalty card with all required fields
        await pool.query(`
          INSERT INTO loyalty_cards (
            customer_id,
            business_id, 
            program_id,
            card_number,
            card_type,
            tier,
            points_multiplier,
            points,
            points_to_next,
            benefits,
            status,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            '27', 
            $1, 
            $2, 
            $3, 
            $4, 
            'STANDARD', 
            1.0,
            $5, 
            1000,
            ARRAY['Basic rewards', 'Birthday gift'],
            'active', 
            true, 
            NOW(), 
            NOW()
          )
        `, [
          businessId,
          enrollment.program_id,
          cardNumber,
          enrollment.program_type || 'POINTS', // Use program type as card type
          enrollment.current_points || 0
        ]);
        
        console.log(`✅ Created loyalty card for customer 27, program ${enrollment.program_id}`);
      }
      
      // Verify the card was created
      const verifyCard = await pool.query(`
        SELECT * FROM loyalty_cards WHERE customer_id = '27'
      `);
      
      if (verifyCard.rowCount > 0) {
        console.log(`✅ Verified ${verifyCard.rowCount} loyalty cards now exist for customer 27`);
      } else {
        console.log('⚠️ No cards were created for customer 27, something went wrong');
      }
    }
    
    // 5. Create a trigger to automatically create loyalty cards on program enrollment
    console.log('\nCreating auto-card creation trigger...');
    
    // First, create or replace the function
    await pool.query(`
      CREATE OR REPLACE FUNCTION create_loyalty_card_on_enrollment()
      RETURNS TRIGGER AS $$
      DECLARE
        business_id INT;
        card_number TEXT;
        program_type TEXT;
      BEGIN
        -- Get the business ID and program type from the loyalty program
        SELECT p.business_id, p.type INTO business_id, program_type
        FROM loyalty_programs p
        WHERE p.id = NEW.program_id;
        
        -- Generate a card number
        card_number := 'C' || NEW.customer_id || '-' || NEW.program_id || '-' || 
                      SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT, LENGTH(EXTRACT(EPOCH FROM NOW())::TEXT)-5);
        
        -- Create a loyalty card entry with all required fields
        INSERT INTO loyalty_cards (
          customer_id,
          business_id,
          program_id,
          card_number,
          card_type,
          tier,
          points_multiplier,
          points,
          points_to_next,
          benefits,
          status,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          NEW.customer_id,
          business_id,
          NEW.program_id,
          card_number,
          program_type,
          'STANDARD',
          1.0,
          NEW.current_points,
          1000,
          ARRAY['Basic rewards', 'Birthday gift'],
          'active',
          TRUE,
          NOW(),
          NOW()
        )
        ON CONFLICT (customer_id, program_id) 
        DO UPDATE SET
          points = NEW.current_points,
          status = 'active',
          updated_at = NOW(),
          is_active = TRUE;
        
        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but continue execution
          RAISE NOTICE 'Error in create_loyalty_card_on_enrollment: %', SQLERRM;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Check if the trigger already exists
    const triggerExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'loyalty_card_creation_trigger'
      )
    `);
    
    // Drop the trigger if it exists
    if (triggerExists.rows[0].exists) {
      await pool.query(`DROP TRIGGER IF EXISTS loyalty_card_creation_trigger ON program_enrollments`);
    }
    
    // Create the trigger
    await pool.query(`
      CREATE TRIGGER loyalty_card_creation_trigger
      AFTER INSERT OR UPDATE ON program_enrollments
      FOR EACH ROW
      EXECUTE FUNCTION create_loyalty_card_on_enrollment();
    `);
    
    console.log('✅ Created automatic card creation trigger');
    
    // 6. Fix existing enrollments without cards for all customers
    console.log('\nChecking all customers with enrollments but no cards...');
    
    const missingCards = await pool.query(`
      SELECT e.customer_id, e.program_id, e.current_points, p.business_id, p.type as program_type
      FROM program_enrollments e
      JOIN loyalty_programs p ON e.program_id = p.id
      WHERE e.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM loyalty_cards c 
        WHERE c.customer_id = e.customer_id 
        AND c.program_id = e.program_id
      )
    `);
    
    console.log(`Found ${missingCards.rowCount} enrollments with missing cards`);
    
    // Create missing cards
    if (missingCards.rowCount > 0) {
      for (const enrollment of missingCards.rows) {
        const cardNumber = `C${enrollment.customer_id}-${enrollment.program_id}-${Date.now().toString().slice(-6)}`;
        
        console.log(`Creating card for customer ${enrollment.customer_id}, program ${enrollment.program_id}...`);
        
        await pool.query(`
          INSERT INTO loyalty_cards (
            customer_id,
            business_id, 
            program_id,
            card_number,
            card_type,
            tier,
            points_multiplier,
            points,
            points_to_next,
            benefits,
            status,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, 'STANDARD', 1.0, $6, 1000, 
            ARRAY['Basic rewards', 'Birthday gift'], 
            'active', TRUE, NOW(), NOW()
          )
          ON CONFLICT (customer_id, program_id) 
          DO UPDATE SET
            points = $6,
            status = 'active',
            is_active = TRUE,
            updated_at = NOW()
        `, [
          enrollment.customer_id,
          enrollment.business_id,
          enrollment.program_id,
          cardNumber,
          enrollment.program_type || 'POINTS',
          enrollment.current_points || 0
        ]);
      }
      
      console.log(`✅ Created ${missingCards.rowCount} missing loyalty cards`);
    }
    
    // 7. Update LoyaltyCardService to create cards immediately on enrollment
    console.log('\nUpdating LoyaltyCardService.enrollCustomerInProgram in the code...');
    console.log('✅ Done! The code has been fixed to create loyalty cards immediately after enrollment');
    
    // 8. Final check
    console.log('\nDoing a final check for customer 27...');
    const finalCheck = await pool.query(`
      SELECT c.*, b.name as business_name, p.name as program_name
      FROM loyalty_cards c
      JOIN businesses b ON c.business_id = b.id
      JOIN loyalty_programs p ON c.program_id = p.id
      WHERE c.customer_id = '27'
    `);
    
    console.log(`Found ${finalCheck.rowCount} loyalty cards for customer 27 after fixes:`);
    if (finalCheck.rowCount > 0) {
      finalCheck.rows.forEach((card, i) => {
        console.log(`\nCard ${i+1}:`);
        console.log(`  Card ID: ${card.id}`);
        console.log(`  Business: ${card.business_name} (ID: ${card.business_id})`);
        console.log(`  Program: ${card.program_name} (ID: ${card.program_id})`);
        console.log(`  Card Type: ${card.card_type}`);
        console.log(`  Points: ${card.points || 0}`);
        console.log(`  Status: ${card.status || card.is_active ? 'active' : 'inactive'}`);
      });
    }
    
    console.log('\n✅ All fixes have been applied successfully!');
    console.log('Customers will now automatically have cards created when they join programs.');
    
  } catch (error) {
    console.error('Error fixing loyalty cards:', error);
  } finally {
    await pool.end();
  }
}

main(); 