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
    console.log('Testing connection...');
    const testResult = await pool.query('SELECT 1 as test');
    console.log('Connection successful:', testResult.rows);
    
    // User ID for olb_chelsea@hotmail.fr
    const userId = 20;
    
    // Add a new customer
    console.log('Adding new customer...');
    const customerResult = await pool.query(`
      INSERT INTO customers (
        user_id,
        name,
        email,
        tier,
        loyalty_points,
        total_spent,
        visits,
        birthday,
        last_visit,
        notes,
        phone,
        address
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING id, name, email
    `, [
      userId,
      'Alexander Thompson',
      'alexander.t@example.com',
      'Gold',
      320,
      678.50,
      28,
      '1988-06-15',
      new Date(),
      'Prefers almond milk, always tries new seasonal items',
      '+33612345678',
      '123 Avenue des Champs-Élysées, Paris'
    ]);
    
    console.log('Added customer:', customerResult.rows[0]);
    
    // Add favorite items for this customer
    const customerId = customerResult.rows[0].id;
    console.log('Adding favorite items for customer ID:', customerId);
    
    const favoriteItems = ['Café au lait', 'Pain au chocolat', 'Croque monsieur'];
    
    for (const item of favoriteItems) {
      await pool.query(`
        INSERT INTO customer_favorite_items (customer_id, item_name)
        VALUES ($1, $2)
      `, [customerId, item]);
    }
    
    console.log('Added favorite items:', favoriteItems);
    
    // Record an initial interaction
    await pool.query(`
      INSERT INTO customer_interactions (
        customer_id,
        business_id,
        type,
        message
      ) VALUES ($1, $2, $3, $4)
    `, [
      customerId,
      userId.toString(),
      'WELCOME',
      'Welcome to our loyalty program! Excited to have you as a customer.'
    ]);
    
    console.log('Added initial welcome interaction');
    
    // Verify the customer was added
    const verifyResult = await pool.query(`
      SELECT c.*, array_agg(cfi.item_name) as favorite_items
      FROM customers c
      LEFT JOIN customer_favorite_items cfi ON c.id = cfi.customer_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [customerId]);
    
    console.log('Customer details:', verifyResult.rows[0]);
    
    console.log('✅ Customer successfully added to your account!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main(); 