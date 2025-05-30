import fs from 'fs';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  // Read the schema SQL file
  const sql = fs.readFileSync('./db/customer_schema.sql', 'utf8');
  
  // Create a database connection pool
  const pool = new Pool({
    connectionString: process.env.VITE_DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Executing customer schema...');
    await pool.query(sql);
    console.log('Schema executed successfully!');
    
    // Check if tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customers', 'customer_favorite_items', 'customer_interactions')
    `);
    
    console.log('Created tables:', result.rows.map(row => row.table_name).join(', '));

    // Insert sample data
    console.log('Inserting sample customer data...');
    
    // Check if any customers already exist
    const existingCustomers = await pool.query(`
      SELECT COUNT(*) as count FROM customers
    `);
    
    if (parseInt(existingCustomers.rows[0].count) > 0) {
      console.log(`Found ${existingCustomers.rows[0].count} existing customers, skipping sample data insertion.`);
    } else {
      // Insert sample customers
      const customersResult = await pool.query(`
        INSERT INTO customers 
          (name, email, tier, loyalty_points, total_spent, visits, birthday, last_visit, notes)
        VALUES
          ('Sarah Johnson', 'sarah.j@example.com', 'Gold', 235, 487.50, 24, '1992-04-12', NOW() - INTERVAL '5 days', 'Prefers oat milk in coffee'),
          ('Mike Peterson', 'mike.p@example.com', 'Silver', 180, 329.75, 18, '1988-07-22', NOW() - INTERVAL '2 days', 'Always asks about new seasonal items'),
          ('Elena Rodriguez', 'elena.r@example.com', 'Platinum', 320, 612.25, 32, '1990-11-03', NOW(), 'Prefers window seating'),
          ('David Kim', 'david.k@example.com', 'Bronze', 95, 185.30, 12, '1995-02-28', NOW() - INTERVAL '10 days', 'Works remotely from café often'),
          ('Jessica Chen', 'jessica.c@example.com', 'Gold', 270, 541.80, 29, '1993-08-15', NOW() - INTERVAL '1 day', 'Allergic to nuts')
        RETURNING id, name
      `);
      
      console.log('Inserted customers:', customersResult.rows);
      
      // Insert favorite items for each customer
      if (customersResult.rows.length > 0) {
        const favoriteItems = [
          { customerId: customersResult.rows[0].id, items: ['Cappuccino', 'Blueberry Muffin'] },
          { customerId: customersResult.rows[1].id, items: ['Americano', 'Croissant'] },
          { customerId: customersResult.rows[2].id, items: ['Chai Latte', 'Avocado Toast'] },
          { customerId: customersResult.rows[3].id, items: ['Espresso', 'Chocolate Chip Cookie'] },
          { customerId: customersResult.rows[4].id, items: ['Green Tea', 'Fruit Parfait'] }
        ];
      
        // Insert favorite items
        for (const customer of favoriteItems) {
          // Insert new favorite items
          for (const item of customer.items) {
            await pool.query(`
              INSERT INTO customer_favorite_items (customer_id, item_name)
              VALUES ($1, $2)
            `, [customer.customerId, item]);
          }
        }
        console.log('Inserted favorite items for customers');
      }
      
      console.log('Sample data inserted successfully!');
    }
  } catch (error) {
    console.error('Error executing schema:', error);
  } finally {
    await pool.end();
  }
}

main(); 