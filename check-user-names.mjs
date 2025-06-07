import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config();
config({ path: '.env.local' });

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

async function checkUserNames() {
  console.log('Database URL:', DATABASE_URL ? 'Found' : 'Not found');
  
  if (!DATABASE_URL) {
    console.error('No DATABASE_URL found in environment variables!');
    return;
  }
  
  try {
    console.log('Connecting to database...');
    const sql = neon(DATABASE_URL);
    
    console.log('Fetching users...');
    const users = await sql`SELECT id, name, email, user_type, role FROM users`;
    
    console.log('Users found:', users.length);
    console.table(users);
    
    // Check for "Customer User" names
    const customerUserNames = users.filter(user => user.name === 'Customer User');
    if (customerUserNames.length > 0) {
      console.log('Found users with name "Customer User":', customerUserNames.length);
      console.table(customerUserNames);
    } else {
      console.log('No users found with name "Customer User"');
    }
    
    // Now let's update any user with name "Customer User" to their email username
    if (customerUserNames.length > 0) {
      console.log('Updating users with name "Customer User"...');
      
      for (const user of customerUserNames) {
        const emailName = user.email.split('@')[0];
        const capitalizedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        
        console.log(`Updating user ${user.id} name from "${user.name}" to "${capitalizedName}"`);
        
        await sql`
          UPDATE users 
          SET name = ${capitalizedName}
          WHERE id = ${user.id}
        `;
      }
      
      console.log('Updates completed. Fetching updated users...');
      const updatedUsers = await sql`SELECT id, name, email, user_type, role FROM users WHERE id IN (${customerUserNames.map(u => u.id)})`;
      console.table(updatedUsers);
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
}

checkUserNames(); 