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
    // Get the user ID for olb_chelsea@hotmail.fr
    const userResult = await pool.query(`
      SELECT id FROM users WHERE email = $1
    `, ['olb_chelsea@hotmail.fr']);
    
    if (userResult.rows.length === 0) {
      console.log('User not found!');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`Found user with ID: ${userId}`);
    
    // Get customer we added previously
    const customersResult = await pool.query(`
      SELECT id, name, email FROM customers WHERE user_id = $1
    `, [userId]);
    
    if (customersResult.rows.length === 0) {
      console.log('No customers found for this user!');
      return;
    }
    
    console.log(`Found ${customersResult.rows.length} customers for this user:`);
    console.log(customersResult.rows);
    
    // Create a loyalty program if one doesn't exist
    let programId;
    const programsResult = await pool.query(`
      SELECT id FROM loyalty_programs WHERE business_id = $1
    `, [userId]);
    
    if (programsResult.rows.length === 0) {
      console.log('No loyalty programs found. Creating one...');
      const newProgramResult = await pool.query(`
        INSERT INTO loyalty_programs (
          business_id,
          name,
          description,
          type,
          point_value,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        ) RETURNING id
      `, [
        userId,
        'My Loyalty Program',
        'Earn points with every purchase',
        'POINTS',
        0.01,
        'ACTIVE'
      ]);
      
      programId = newProgramResult.rows[0].id;
      console.log(`Created new loyalty program with ID: ${programId}`);
    } else {
      programId = programsResult.rows[0].id;
      console.log(`Found existing loyalty program with ID: ${programId}`);
    }
    
    // For each customer, ensure they have program enrollments and transactions
    for (const customer of customersResult.rows) {
      console.log(`\nChecking associations for customer: ${customer.name} (ID: ${customer.id})`);
      
      // Check if customer is already enrolled in the program
      const enrollmentResult = await pool.query(`
        SELECT id FROM program_enrollments 
        WHERE program_id = $1 AND customer_id = $2
      `, [programId, customer.id]);
      
      if (enrollmentResult.rows.length === 0) {
        console.log('No program enrollment found. Creating one...');
        await pool.query(`
          INSERT INTO program_enrollments (
            program_id,
            customer_id
          ) VALUES (
            $1, $2
          )
        `, [
          programId,
          customer.id
        ]);
        console.log('Program enrollment created.');
      } else {
        console.log('Customer already enrolled in the program.');
      }
      
      // Check if customer has any transactions
      const transactionResult = await pool.query(`
        SELECT COUNT(*) as count FROM loyalty_transactions 
        WHERE customer_id = $1 AND business_id = $2
      `, [customer.id, userId]);
      
      if (parseInt(transactionResult.rows[0].count) === 0) {
        console.log('No transactions found. Creating one...');
        await pool.query(`
          INSERT INTO loyalty_transactions (
            program_id,
            customer_id,
            business_id,
            type,
            points,
            amount
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          )
        `, [
          programId,
          customer.id,
          userId,
          'PURCHASE',
          500,
          50.00
        ]);
        console.log('Transaction created.');
      } else {
        console.log(`Found ${transactionResult.rows[0].count} existing transactions.`);
      }
    }
    
    console.log('\n✅ All customers are now properly associated with your business!');
    console.log('Please refresh your Customer Friends page to see them.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 