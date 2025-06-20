import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL;

async function checkLoyaltyTable() {
  console.log('Checking loyalty_programs table structure...');
  
  try {
    if (!DATABASE_URL) {
      console.error('No DATABASE_URL found in environment variables');
      return;
    }
    
    const sql = neon(DATABASE_URL);
    
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'loyalty_programs'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.log('loyalty_programs table does not exist!');
      return;
    }
    
    console.log('loyalty_programs table exists, checking columns...');
    
    // Get all columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_programs'
      ORDER BY ordinal_position
    `;
    
    console.log('Columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('Error checking loyalty table:', error);
  }
}

checkLoyaltyTable().catch(console.error); 