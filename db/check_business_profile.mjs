// Script to check business_profile table structure
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Manually load the .env.local file
try {
  const envFile = readFileSync('.env.local', 'utf8');
  const envVars = envFile.split('\n').filter(line => line.trim() !== '');
  
  for (const line of envVars) {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  }
} catch (error) {
  console.error('Error loading .env.local file:', error.message);
}

const DATABASE_URL = process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}

console.log('Database URL available:', !!DATABASE_URL);
if (DATABASE_URL) {
  console.log('DB URL starts with:', DATABASE_URL.substring(0, 30) + '...');
}

const sql = neon(DATABASE_URL);

async function checkDatabaseStructure() {
  try {
    console.log('Checking business_profile table structure...');
    
    // Check if table exists
    const tableResult = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'business_profile'
      );
    `;
    
    if (!tableResult[0].exists) {
      console.error('Error: business_profile table does not exist');
      return;
    }
    
    // Check table columns
    const columnsResult = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'business_profile';
    `;
    
    console.log('Business Profile Table Structure:');
    console.table(columnsResult);
    
    // Check for sample data
    const dataResult = await sql`
      SELECT id, business_id, business_name, email, phone
      FROM business_profile
      LIMIT 5;
    `;
    
    console.log('Sample data from business_profile:');
    console.table(dataResult);

    // Check if currency column exists
    const hasCurrency = columnsResult.some(
      row => row.column_name === 'currency'
    );
    
    if (!hasCurrency) {
      console.log('Missing currency column in business_profile table!');
      console.log('This is likely the cause of the "Failed to save your business profile" error.');
    } else {
      console.log('Currency column exists in business_profile table.');
    }
  } catch (error) {
    console.error('Database error:', error);
  }
}

checkDatabaseStructure(); 