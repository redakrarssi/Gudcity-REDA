// Script to debug currency values in the business_profile table
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

console.log('Database URL available, debugging currency values...');
const sql = neon(DATABASE_URL);

async function debugCurrencyValues() {
  try {
    // Get all business profiles with their currencies
    console.log('Getting all business profiles with their currencies...');
    const results = await sql`
      SELECT id, business_id, business_name, currency
      FROM business_profile
      ORDER BY id;
    `;
    
    console.log('Business Profile Currency Values:');
    console.table(results);
    
    // Check for profiles with no currency
    const missingCurrency = results.filter(r => !r.currency);
    if (missingCurrency.length > 0) {
      console.log(`Found ${missingCurrency.length} profiles with missing currency values:`);
      console.table(missingCurrency);
      
      // Set default currency for missing values
      console.log('Setting default USD currency for profiles with missing values...');
      const updateResult = await sql`
        UPDATE business_profile
        SET currency = 'USD'
        WHERE currency IS NULL OR currency = '';
      `;
      
      console.log(`Updated ${updateResult.count || 'N/A'} rows with default 'USD' currency.`);
    } else {
      console.log('All profiles have currency values set.');
    }
    
    // Test a specific currency update
    const testBusinessId = results[0]?.business_id;
    if (testBusinessId) {
      console.log(`Testing currency update for business ID ${testBusinessId}...`);
      
      // Get current currency
      const currentProfile = await sql`
        SELECT currency FROM business_profile WHERE business_id = ${testBusinessId}
      `;
      
      const currentCurrency = currentProfile[0]?.currency || 'USD';
      console.log(`Current currency: ${currentCurrency}`);
      
      // Test updating to a different currency
      const testCurrency = currentCurrency === 'USD' ? 'EUR' : 'USD';
      console.log(`Test updating to: ${testCurrency}`);
      
      try {
        const updateResult = await sql`
          UPDATE business_profile
          SET currency = ${testCurrency}
          WHERE business_id = ${testBusinessId}
          RETURNING id, business_id, currency
        `;
        
        console.log('Update result:', updateResult);
        
        // Revert back to original currency
        await sql`
          UPDATE business_profile
          SET currency = ${currentCurrency}
          WHERE business_id = ${testBusinessId}
        `;
        
        console.log(`Reverted back to original currency: ${currentCurrency}`);
      } catch (updateError) {
        console.error('Error during test update:', updateError);
      }
    }
    
    // Check VARCHAR size limit
    const columnInfo = await sql`
      SELECT character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'business_profile' AND column_name = 'currency';
    `;
    
    console.log('Currency column size limit:', columnInfo[0]?.character_maximum_length);
    if (columnInfo[0]?.character_maximum_length === 3) {
      console.log('The currency column is limited to 3 characters!');
      console.log('This could be a problem if trying to save full currency names instead of codes.');
      
      // Update column to be larger if needed
      console.log('Updating currency column to allow longer values...');
      await sql`
        ALTER TABLE business_profile 
        ALTER COLUMN currency TYPE VARCHAR(10);
      `;
      
      console.log('Currency column size updated to VARCHAR(10)');
    }
    
  } catch (error) {
    console.error('Error during currency debugging:', error);
  }
}

debugCurrencyValues(); 