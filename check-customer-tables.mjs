// Check Customer Tables
// This script checks the structure of the customers table

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

// Create database connection
const sql = neon(DATABASE_URL);

async function checkCustomerTable() {
  try {
    console.log('Checking customers table structure...');
    
    // Check if the customers table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
      )
    `;
    
    if (!tableExists[0].exists) {
      console.error('Customers table does not exist');
      return;
    }
    
    // Get the columns of the customers table
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'customers'
    `;
    
    console.log('Customers table columns:');
    columns.forEach(column => {
      console.log(`  ${column.column_name}: ${column.data_type}`);
    });
    
    // Get a sample customer
    const customers = await sql`
      SELECT * FROM customers LIMIT 1
    `;
    
    if (customers.length > 0) {
      console.log('\nSample customer data:');
      console.log(JSON.stringify(customers[0], null, 2));
    } else {
      console.log('No customers found in the database');
    }
    
  } catch (err) {
    console.error('Error checking customers table:', err);
  }
}

checkCustomerTable(); 