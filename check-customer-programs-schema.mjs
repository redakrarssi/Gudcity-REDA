import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the database URL from environment variables or use fallback
const DATABASE_URL = process.env.VITE_DATABASE_URL || "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """;

async function main() {
  // Create a database connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Checking customer_programs table schema...');
    
    // Get columns from customer_programs table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customer_programs'
      ORDER BY ordinal_position
    `);
    
    if (columnsResult.rows.length > 0) {
      console.log('Columns in customer_programs table:');
      columnsResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
      });
      
      // Check the customer_id data type specifically
      const customerIdColumn = columnsResult.rows.find(row => row.column_name === 'customer_id');
      if (customerIdColumn) {
        console.log(`\nCustomer ID column data type: ${customerIdColumn.data_type}`);
      }
      
      // Check for sample data to understand the data format
      const sampleDataResult = await pool.query(`
        SELECT * FROM customer_programs LIMIT 3
      `);
      
      if (sampleDataResult.rows.length > 0) {
        console.log('\nSample data from customer_programs:');
        sampleDataResult.rows.forEach((row, index) => {
          console.log(`\nRecord ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`  ${key}: ${value} (${typeof value})`);
          });
        });
      } else {
        console.log('\nNo sample data found in customer_programs table.');
      }
    } else {
      console.log('No columns found for customer_programs table or table does not exist.');
    }
  } catch (error) {
    console.error('Error checking customer_programs schema:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
main(); 