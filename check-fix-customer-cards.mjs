import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.VITE_DATABASE_URL || "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Starting customer card fix script...');
    
    // 1. Check if customer 27 has enrollments
    console.log('\nChecking customer 27 enrollments...');
    const enrollments = await pool.query(`
      SELECT e.*, p.name as program_name, b.name as business_name
      FROM program_enrollments e
      JOIN loyalty_programs p ON e.program_id = p.id
      JOIN businesses b ON p.business_id = b.id
      WHERE e.customer_id = $1
    `, ['27']);
    
    console.log(`Found ${enrollments.rowCount} enrollments for customer 27:`);
    if (enrollments.rowCount > 0) {
      enrollments.rows.forEach((enrollment, i) => {
        console.log(`\nEnrollment ${i+1}:`);
        console.log(`  Program ID: ${enrollment.program_id}`);
        console.log(`  Program Name: ${enrollment.program_name}`);
        console.log(`  Business ID: ${enrollment.business_id}`);
        console.log(`  Business Name: ${enrollment.business_name}`);
        console.log(`  Status: ${enrollment.status}`);
        console.log(`  Current Points: ${enrollment.current_points}`);
      });
    }
    
    // 2. Check if customer 27 has loyalty cards
    console.log('\nChecking customer 27 loyalty cards...');
    const cards = await pool.query(`
      SELECT c.*, b.name as business_name, p.name as program_name
      FROM loyalty_cards c
      JOIN businesses b ON c.business_id = b.id
      JOIN loyalty_programs p ON c.program_id = p.id
      WHERE c.customer_id = $1
    `, ['27']);
    
    console.log(`Found ${cards.rowCount} loyalty cards for customer 27:`);
    if (cards.rowCount > 0) {
      cards.rows.forEach((card, i) => {
        console.log(`\nCard ${i+1}:`);
        console.log(`  Card ID: ${card.id}`);
        console.log(`  Business: ${card.business_name} (ID: ${card.business_id})`);
        console.log(`  Program: ${card.program_name} (ID: ${card.program_id})`);
        console.log(`  Points: ${card.points_balance}`);
        console.log(`  Status: ${card.status}`);
      });
    }
    
    // 3. Fix missing cards for customer 27
    if (enrollments.rowCount > 0 && cards.rowCount === 0) {
      console.log('\n⚠️ Customer 27 has enrollments but no loyalty cards - FIXING...');
      
      // Create cards for each enrollment
      for (const enrollment of enrollments.rows) {
        console.log(`Creating loyalty card for program ${enrollment.program_id}...`);
        
        // Generate a card number
        const cardNumber = `C27-${enrollment.program_id}-${Date.now().toString().slice(-6)}`;
        
        // Create the loyalty card
        await pool.query(`
          INSERT INTO loyalty_cards (
            customer_id,
            business_id, 
            program_id,
            card_number,
            points_balance,
            total_points_earned,
            status,
            enrollment_date,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'active', NOW(), NOW(), NOW()
          )
        `, [
          '27',
          enrollment.business_id,
          enrollment.program_id,
          cardNumber,
          enrollment.current_points || 0,
          enrollment.current_points || 0
        ]);
        
        console.log(`✅ Created loyalty card for program ${enrollment.program_id}`);
      }
    }
    
    // 4. Fix the view for customer_loyalty_cards if it exists
    console.log('\nUpdating customer_loyalty_cards view...');
    
    // Check if view exists
    const viewExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_loyalty_cards'
      )
    `);
    
    if (viewExists.rows[0].exists) {
      // Update the view with a more reliable join
      await pool.query(`
        CREATE OR REPLACE VIEW customer_loyalty_cards AS
        SELECT 
          c.id,
          c.customer_id,
          c.business_id,
          c.program_id,
          c.card_number,
          c.points_balance as points,
          c.total_points_earned,
          c.status,
          c.enrollment_date,
          c.created_at,
          c.updated_at,
          b.name as business_name,
          p.name as program_name,
          p.type as card_type,
          COALESCE(e.tier, 'STANDARD') as tier,
          c.is_active
        FROM 
          loyalty_cards c
        JOIN 
          businesses b ON c.business_id = b.id
        JOIN 
          loyalty_programs p ON c.program_id = p.id
        LEFT JOIN
          program_enrollments e ON c.customer_id = e.customer_id AND c.program_id = e.program_id
        WHERE 
          c.status = 'active' OR c.is_active = true
      `);
      
      console.log('✅ Updated customer_loyalty_cards view');
    } else {
      // Create the view if it doesn't exist
      await pool.query(`
        CREATE VIEW customer_loyalty_cards AS
        SELECT 
          c.id,
          c.customer_id,
          c.business_id,
          c.program_id,
          c.card_number,
          c.points_balance as points,
          c.total_points_earned,
          c.status,
          c.enrollment_date,
          c.created_at,
          c.updated_at,
          b.name as business_name,
          p.name as program_name,
          p.type as card_type,
          COALESCE(e.tier, 'STANDARD') as tier,
          c.is_active
        FROM 
          loyalty_cards c
        JOIN 
          businesses b ON c.business_id = b.id
        JOIN 
          loyalty_programs p ON c.program_id = p.id
        LEFT JOIN
          program_enrollments e ON c.customer_id = e.customer_id AND c.program_id = e.program_id
        WHERE 
          c.status = 'active' OR c.is_active = true
      `);
      
      console.log('✅ Created customer_loyalty_cards view');
    }
    
    // 5. Fix the trigger that will automatically create loyalty cards when a customer joins a program
    console.log('\nCreating auto-card creation trigger...');
    
    // First create a function for the trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION create_loyalty_card_on_enrollment()
      RETURNS TRIGGER AS $$
      DECLARE
        business_id INT;
        card_number TEXT;
      BEGIN
        -- Get the business ID from the loyalty program
        SELECT business_id INTO business_id 
        FROM loyalty_programs 
        WHERE id = NEW.program_id;
        
        -- Generate a card number
        card_number := 'C' || NEW.customer_id || '-' || NEW.program_id || '-' || 
                      SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT, LENGTH(EXTRACT(EPOCH FROM NOW())::TEXT)-5);
        
        -- Create a loyalty card entry
        INSERT INTO loyalty_cards (
          customer_id,
          business_id,
          program_id,
          card_number,
          points_balance,
          total_points_earned,
          status,
          enrollment_date,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          NEW.customer_id,
          business_id,
          NEW.program_id,
          card_number,
          NEW.current_points,
          NEW.current_points,
          'active',
          NEW.enrolled_at,
          TRUE,
          NOW(),
          NOW()
        )
        ON CONFLICT (customer_id, program_id) 
        DO UPDATE SET
          points_balance = NEW.current_points,
          status = 'active',
          updated_at = NOW(),
          is_active = TRUE;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Check if the trigger already exists and drop it if it does
    const triggerExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'loyalty_card_creation_trigger'
      )
    `);
    
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
    
    // 6. Fix existing enrollments that don't have cards
    console.log('\nChecking all customers with enrollments but no cards...');
    
    const missingCards = await pool.query(`
      SELECT e.customer_id, e.program_id, e.current_points, e.enrolled_at, p.business_id
      FROM program_enrollments e
      JOIN loyalty_programs p ON e.program_id = p.id
      WHERE e.status = 'ACTIVE' 
      AND NOT EXISTS (
        SELECT 1 FROM loyalty_cards c 
        WHERE c.customer_id = e.customer_id 
        AND c.program_id = e.program_id
        AND (c.status = 'active' OR c.is_active = true)
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
            points_balance,
            total_points_earned,
            status,
            enrollment_date,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'active', $7, TRUE, NOW(), NOW()
          )
          ON CONFLICT (customer_id, program_id) 
          DO UPDATE SET
            points_balance = $5,
            status = 'active',
            is_active = TRUE,
            updated_at = NOW()
        `, [
          enrollment.customer_id,
          enrollment.business_id,
          enrollment.program_id,
          cardNumber,
          enrollment.current_points || 0,
          enrollment.current_points || 0,
          enrollment.enrolled_at || new Date()
        ]);
      }
      
      console.log(`✅ Created ${missingCards.rowCount} missing loyalty cards`);
    }
    
    console.log('\n✅ All fixes applied successfully!');
    
  } catch (error) {
    console.error('Error fixing customer cards:', error);
  } finally {
    await pool.end();
  }
}

main(); 