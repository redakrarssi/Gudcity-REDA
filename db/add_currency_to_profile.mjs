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

console.log('Database URL available, starting schema update...');
const sql = neon(DATABASE_URL);

async function addCurrencyColumn() {
  try {
    // Check if currency column exists
    console.log('Checking if currency column exists in business_profile...');
    const columnsResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_profile' AND column_name = 'currency';
    `;
    
    if (columnsResult.length > 0) {
      console.log('Currency column already exists in business_profile table.');
    } else {
      console.log('Currency column does not exist. Adding it now...');
      
      // Add the currency column
      await sql`
        ALTER TABLE business_profile 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
      `;
      
      console.log('Currency column added successfully!');
    }
    
    // Verify the column was added
    const verifyResult = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'business_profile' AND column_name = 'currency';
    `;
    
    console.log('Verification result:', verifyResult);
    
    if (verifyResult.length > 0) {
      console.log('Currency column is now available.');
      
      // Update any NULL values to USD
      const updateResult = await sql`
        UPDATE business_profile 
        SET currency = 'USD' 
        WHERE currency IS NULL;
      `;
      
      console.log(`Updated ${updateResult.count || 'N/A'} rows with default 'USD' currency.`);
    } else {
      console.error('Failed to add currency column!');
    }
  } catch (error) {
    console.error('Error during database update:', error);
  }
}

addCurrencyColumn(); 