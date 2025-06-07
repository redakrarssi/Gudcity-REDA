import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();
config({ path: '.env.local' });

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function updateCustomerName() {
  console.log('Database URL:', DATABASE_URL ? 'Found' : 'Not found');
  
  if (!DATABASE_URL) {
    console.error('No DATABASE_URL found in environment variables!');
    return;
  }
  
  try {
    console.log('Connecting to database...');
    const sql = neon(DATABASE_URL);
    
    // Update the customer with ID 4 (the one with name "Customer User")
    console.log('Updating customer name...');
    
    await sql`
      UPDATE users 
      SET name = 'Customer'
      WHERE id = 4 AND name = 'Customer User'
    `;
    
    console.log('Name updated successfully. Fetching updated user...');
    
    const updatedUser = await sql`SELECT id, name, email, user_type, role FROM users WHERE id = 4`;
    console.table(updatedUser);
    
    console.log('Update completed successfully.');
  } catch (error) {
    console.error('Error updating user name:', error);
  }
}

updateCustomerName(); 