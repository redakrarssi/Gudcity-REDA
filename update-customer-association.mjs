import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Create a database connection
const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    // First, get the user ID for olb_chelsea@hotmail.fr
    const userResult = await pool.query(`
      SELECT id FROM users WHERE email = $1
    `, ['olb_chelsea@hotmail.fr']);
    
    if (userResult.rows.length === 0) {
      console.log('User not found!');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`Found user with ID: ${userId}`);
    
    // Get any customers created for this user
    const customersResult = await pool.query(`
      SELECT id, name, email FROM customers WHERE user_id = $1
    `, [userId]);
    
    console.log(`Found ${customersResult.rows.length} customers for this user:`);
    console.log(customersResult.rows);
    
    if (customersResult.rows.length === 0) {
      console.log('No customers found for this user. Creating a test loyalty program and transaction to make existing customers visible...');
      
      // First, create a loyalty program
      const programResult = await pool.query(`
        INSERT INTO loyalty_programs (
          name, 
          description, 
          business_id, 
          points_per_currency, 
          currency_symbol, 
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, NOW(), NOW()
        ) RETURNING id
      `, [
        'Default Loyalty Program',
        'Created automatically to show customers',
        userId.toString(),
        1,
        '$'
      ]);
      
      if (programResult.rows.length > 0) {
        const programId = programResult.rows[0].id;
        console.log(`Created loyalty program with ID: ${programId}`);
        
        // Get all customers in the system
        const allCustomersResult = await pool.query(`
          SELECT id FROM customers
        `);
        
        console.log(`Found ${allCustomersResult.rows.length} total customers in the system`);
        
        // Create program enrollments and transactions for each customer
        for (const customer of allCustomersResult.rows) {
          // Create a program enrollment
          await pool.query(`
            INSERT INTO program_enrollments (
              program_id,
              customer_id,
              status,
              joined_at
            ) VALUES (
              $1, $2, $3, NOW()
            )
          `, [
            programId,
            customer.id.toString(),
            'ACTIVE'
          ]);
          
          // Create a transaction
          await pool.query(`
            INSERT INTO loyalty_transactions (
              customer_id,
              business_id,
              amount,
              points,
              type,
              status,
              created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, NOW()
            )
          `, [
            customer.id.toString(),
            userId.toString(),
            10.00,
            10,
            'PURCHASE',
            'COMPLETED'
          ]);
        }
        
        console.log(`✅ Successfully associated ${allCustomersResult.rows.length} customers with your business!`);
      }
    } else {
      console.log('Customers already associated with your account.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 