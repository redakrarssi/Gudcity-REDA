#!/usr/bin/env node

/**
 * Create Customer Record
 * This script creates the missing customer record for user 29
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

async function createCustomerRecord() {
  // Create a fresh connection
  const sql = postgres(DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 1
  });
  
  try {
    console.log('Creating missing customer record for user 29...');
    
    // Get user 29 details
    const user29 = await sql`SELECT id, name, email FROM users WHERE id = 29`;
    if (!user29[0]) {
      console.log('❌ User 29 not found');
      return;
    }
    
    console.log('User 29 details:', user29[0]);
    
    // Check if customer record already exists
    const existingCustomer = await sql`SELECT * FROM customers WHERE user_id = 29`;
    if (existingCustomer[0]) {
      console.log('✅ Customer record already exists:', existingCustomer[0]);
      return;
    }
    
    // Create customer record
    const result = await sql`
      INSERT INTO customers (user_id, name, email)
      VALUES (${user29[0].id}, ${user29[0].name}, ${user29[0].email})
      RETURNING id
    `;
    
    console.log('✅ Customer record created with ID:', result[0].id);
    
    // Verify it was created
    const customer = await sql`SELECT * FROM customers WHERE user_id = 29`;
    console.log('Verification - Customer record:', customer[0]);
    
  } catch (error) {
    console.error('❌ Error creating customer record:', error);
  } finally {
    await sql.end();
  }
}

// Run the script
createCustomerRecord()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running script:', error);
    process.exit(1);
  });