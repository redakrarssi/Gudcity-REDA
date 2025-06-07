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
    console.log('Starting customer-business linking fix...');
    
    // 1. Find all businesses
    const businessesResult = await pool.query(`
      SELECT id, email FROM users WHERE role = 'business'
    `);
    
    if (businessesResult.rows.length === 0) {
      console.log('No businesses found!');
      return;
    }
    
    console.log(`Found ${businessesResult.rows.length} businesses`);
    
    // 2. Find all customers
    const customersResult = await pool.query(`
      SELECT id, name, email FROM customers
    `);
    
    if (customersResult.rows.length === 0) {
      console.log('No customers found!');
      return;
    }
    
    console.log(`Found ${customersResult.rows.length} customers`);
    
    // Process each business
    for (const business of businessesResult.rows) {
      console.log(`\nProcessing business ID: ${business.id} (${business.email})`);
      
      // Find or create a loyalty program for this business
      let programId;
      const programsResult = await pool.query(`
        SELECT id FROM loyalty_programs WHERE business_id = $1
      `, [business.id.toString()]);
      
      if (programsResult.rows.length === 0) {
        console.log('No loyalty program found. Creating one...');
        const newProgramResult = await pool.query(`
          INSERT INTO loyalty_programs (
            name, 
            description, 
            business_id, 
            type,
            point_value,
            status,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, NOW(), NOW()
          ) RETURNING id
        `, [
          'Default Loyalty Program',
          'Automatically created loyalty program',
          business.id.toString(),
          'POINTS',
          1.0,
          'ACTIVE'
        ]);
        
        programId = newProgramResult.rows[0].id;
        console.log(`Created new loyalty program with ID: ${programId}`);
      } else {
        programId = programsResult.rows[0].id;
        console.log(`Found existing loyalty program with ID: ${programId}`);
      }
      
      // Process each customer for this business
      for (const customer of customersResult.rows) {
        console.log(`\n  Processing customer: ${customer.name} (ID: ${customer.id})`);
        
        // 3. Check if customer is already enrolled in the program
        const enrollmentResult = await pool.query(`
          SELECT id FROM program_enrollments 
          WHERE program_id = $1 AND customer_id = $2
        `, [programId, customer.id.toString()]);
        
        if (enrollmentResult.rows.length === 0) {
          console.log('    No program enrollment found. Creating one...');
          await pool.query(`
            INSERT INTO program_enrollments (
              program_id,
              customer_id,
              current_points,
              last_activity,
              enrolled_at
            ) VALUES (
              $1, $2, $3, NOW(), NOW()
            )
          `, [
            programId,
            customer.id.toString(),
            0
          ]);
          console.log('    ✅ Program enrollment created');
        } else {
          console.log('    ✓ Customer already enrolled in the program');
        }
        
        // 4. Check if customer has any transactions with this business
        const transactionResult = await pool.query(`
          SELECT COUNT(*) as count FROM loyalty_transactions 
          WHERE customer_id = $1 AND business_id = $2
        `, [customer.id.toString(), business.id.toString()]);
        
        if (parseInt(transactionResult.rows[0].count) === 0) {
          console.log('    No transactions found. Creating one...');
          await pool.query(`
            INSERT INTO loyalty_transactions (
              program_id,
              customer_id,
              business_id,
              type,
              points,
              amount,
              created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, NOW()
            )
          `, [
            programId,
            customer.id.toString(),
            business.id.toString(),
            'EARN',
            100,
            10.00
          ]);
          console.log('    ✅ Transaction created');
        } else {
          console.log(`    ✓ Found ${transactionResult.rows[0].count} existing transactions`);
        }
        
        // 5. Check if customer has a loyalty card for this business/program
        const cardResult = await pool.query(`
          SELECT id FROM loyalty_cards 
          WHERE customer_id = $1 AND business_id = $2 AND program_id = $3
        `, [customer.id, business.id, programId]);
        
        if (cardResult.rows.length === 0) {
          console.log('    No loyalty card found. Creating one...');
          try {
            await pool.query(`
              INSERT INTO loyalty_cards (
                customer_id,
                business_id,
                program_id,
                card_type,
                points,
                is_active,
                created_at,
                updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, NOW(), NOW()
              )
            `, [
              customer.id,
              business.id,
              programId,
              'STANDARD',
              0,
              true
            ]);
            console.log('    ✅ Loyalty card created');
          } catch (cardError) {
            console.error('    ❌ Error creating loyalty card:', cardError.message);
            // Continue processing even if card creation fails
          }
        } else {
          console.log('    ✓ Customer already has a loyalty card');
        }
      }
    }
    
    console.log('\n✅ Customer-business linking fix completed successfully!');
    console.log('Next steps:');
    console.log('1. Update CustomerService.getBusinessCustomers method');
    console.log('2. Check UI components displaying the customer-business relationship');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 