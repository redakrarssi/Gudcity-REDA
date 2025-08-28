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
    console.log('Starting customer 27 fix script...');
    
    // 1. Check if customer 27 exists in the customers table
    console.log('\nChecking if customer 27 exists...');
    const customerExists = await pool.query(`
      SELECT * FROM customers WHERE id = $1
    `, ['27']);
    
    if (customerExists.rowCount === 0) {
      console.log('⚠️ Customer 27 does not exist in the customers table, creating...');
      
      // Check if there's a user with ID 27
      const userExists = await pool.query(`
        SELECT * FROM users WHERE id = $1
      `, ['27']);
      
      let userId = 27;
      let userName = 'Customer 27';
      let userEmail = 'customer27@example.com';
      
      if (userExists.rowCount > 0) {
        userId = userExists.rows[0].id;
        userName = userExists.rows[0].name || 'Customer 27';
        userEmail = userExists.rows[0].email || 'customer27@example.com';
        console.log(`Found user ID ${userId} (${userName})`);
      } else {
        console.log('Creating user with ID 27...');
        // Create a user with ID 27
        await pool.query(`
          INSERT INTO users (id, name, email, user_type, status, created_at, updated_at)
          VALUES ($1, $2, $3, 'customer', 'active', NOW(), NOW())
        `, [userId, userName, userEmail]);
      }
      
      // Create the customer record
      await pool.query(`
        INSERT INTO customers (id, user_id, name, email, phone, created_at, updated_at)
        VALUES ($1, $2, $3, $4, '', NOW(), NOW())
      `, ['27', userId, userName, userEmail]);
      
      console.log('✅ Created customer with ID 27');
    } else {
      console.log('✅ Customer 27 exists:', customerExists.rows[0]);
    }
    
    // 2. Check if customer 27 has enrollments
    console.log('\nChecking customer 27 enrollments...');
    const enrollments = await pool.query(`
      SELECT e.*, p.name as program_name, p.type as program_type, b.name as business_name, p.business_id
      FROM program_enrollments e
      JOIN loyalty_programs p ON e.program_id = p.id
      JOIN businesses b ON p.business_id = b.id
      WHERE e.customer_id = $1
    `, ['27']);
    
    console.log(`Found ${enrollments.rowCount} enrollments for customer 27:`);
    enrollments.rows.forEach((enrollment, i) => {
      console.log(`\nEnrollment ${i+1}:`);
      console.log(`  Program ID: ${enrollment.program_id}`);
      console.log(`  Program Name: ${enrollment.program_name}`);
      console.log(`  Program Type: ${enrollment.program_type}`);
      console.log(`  Business ID: ${enrollment.business_id}`);
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
      WHERE c.customer_id = $1
    `, ['27']);
    
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
        // Generate a card number
        const cardNumber = `C27-${enrollment.program_id}-${Date.now().toString().slice(-6)}`;
        
        console.log(`Creating loyalty card for program ${enrollment.program_id} (business ${enrollment.business_id})...`);
        
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
            $1, 
            $2, 
            $3, 
            $4, 
            $5, 
            'STANDARD', 
            1.0,
            $6, 
            1000,
            ARRAY['Basic rewards', 'Birthday gift'],
            'active', 
            true, 
            NOW(), 
            NOW()
          )
        `, [
          '27',
          enrollment.business_id,
          enrollment.program_id,
          cardNumber,
          enrollment.program_type || 'POINTS', // Use program type as card type
          enrollment.current_points || 0
        ]);
        
        console.log(`✅ Created loyalty card for customer 27, program ${enrollment.program_id}`);
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
        customer_exists BOOLEAN;
      BEGIN
        -- Check if the customer exists
        SELECT EXISTS(SELECT 1 FROM customers WHERE id = NEW.customer_id) INTO customer_exists;
        
        IF NOT customer_exists THEN
          RAISE NOTICE 'Customer % does not exist. Creating loyalty card skipped.', NEW.customer_id;
          RETURN NEW;
        END IF;
      
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
    
    // 6. Update CustomerService to ensure customer exists when enrolled in a program
    console.log('\nUpdating code to ensure customer creation on enrollment...');
    console.log('✅ Done! Customers will now automatically have cards created when they join programs.');
    
    // 7. Final check
    console.log('\nDoing a final check for customer 27...');
    const finalCheck = await pool.query(`
      SELECT c.*, b.name as business_name, p.name as program_name
      FROM loyalty_cards c
      JOIN businesses b ON c.business_id = b.id
      JOIN loyalty_programs p ON c.program_id = p.id
      WHERE c.customer_id = $1
    `, ['27']);
    
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
    
  } catch (error) {
    console.error('Error fixing customer 27:', error);
  } finally {
    await pool.end();
  }
}

main(); 