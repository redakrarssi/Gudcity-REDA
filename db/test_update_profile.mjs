// Script to test updating a business profile directly
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

console.log('Database URL available, testing profile update...');
const sql = neon(DATABASE_URL);

async function testProfileUpdate() {
  try {
    // Get a sample business profile to update
    console.log('Getting a sample business profile...');
    const profiles = await sql`
      SELECT id, business_id, business_name, currency, phone, country
      FROM business_profile
      LIMIT 1;
    `;
    
    if (profiles.length === 0) {
      console.error('No business profiles found to test with');
      return;
    }
    
    const profile = profiles[0];
    console.log('Using profile:', profile);
    
    // Test updating each field individually
    const testCurrency = profile.currency === 'USD' ? 'EUR' : 'USD';
    console.log(`\nTesting currency update to ${testCurrency}...`);
    try {
      const currencyResult = await sql`
        UPDATE business_profile
        SET currency = ${testCurrency}
        WHERE id = ${profile.id}
        RETURNING id, business_id, currency;
      `;
      console.log('Currency update result:', currencyResult);
    } catch (currencyError) {
      console.error('Error updating currency:', currencyError);
    }
    
    const testPhone = '555-NEW-PHONE';
    console.log(`\nTesting phone update to ${testPhone}...`);
    try {
      const phoneResult = await sql`
        UPDATE business_profile
        SET phone = ${testPhone}
        WHERE id = ${profile.id}
        RETURNING id, business_id, phone;
      `;
      console.log('Phone update result:', phoneResult);
    } catch (phoneError) {
      console.error('Error updating phone:', phoneError);
    }
    
    const testCountry = profile.country === 'United States' ? 'Canada' : 'United States';
    console.log(`\nTesting country update to ${testCountry}...`);
    try {
      const countryResult = await sql`
        UPDATE business_profile
        SET country = ${testCountry}
        WHERE id = ${profile.id}
        RETURNING id, business_id, country;
      `;
      console.log('Country update result:', countryResult);
    } catch (countryError) {
      console.error('Error updating country:', countryError);
    }
    
    // Now test updating multiple fields at once
    console.log('\nTesting multi-field update...');
    try {
      const multiResult = await sql`
        UPDATE business_profile
        SET 
          currency = ${profile.currency},
          phone = ${profile.phone},
          country = ${profile.country}
        WHERE id = ${profile.id}
        RETURNING id, business_id, currency, phone, country;
      `;
      console.log('Multi-field update result:', multiResult);
    } catch (multiError) {
      console.error('Error with multi-field update:', multiError);
    }
    
    console.log('\nTesting full settings update...');
    // Try to simulate what happens in the BusinessSettingsService.updateBusinessSettings method
    const businessId = profile.business_id;
    const settingsToUpdate = {
      businessName: profile.business_name,
      phone: '555-TEST-PHONE',
      description: 'Test description',
      website: 'https://example.com',
      address: '123 Test St',
      country: 'France',
      currency: 'EUR'
    };
    
    // Build update parts
    const updates = [];
    
    if (settingsToUpdate.businessName) {
      updates.push(sql`business_name = ${settingsToUpdate.businessName}`);
    }
    
    if (settingsToUpdate.description) {
      updates.push(sql`description = ${settingsToUpdate.description}`);
    }
    
    if (settingsToUpdate.website) {
      updates.push(sql`website_url = ${settingsToUpdate.website}`);
    }
    
    if (settingsToUpdate.address) {
      updates.push(sql`address_line1 = ${settingsToUpdate.address}`);
    }
    
    if (settingsToUpdate.phone) {
      updates.push(sql`phone = ${settingsToUpdate.phone}`);
    }
    
    if (settingsToUpdate.country) {
      updates.push(sql`country = ${settingsToUpdate.country}`);
    }
    
    if (settingsToUpdate.currency) {
      updates.push(sql`currency = ${settingsToUpdate.currency}`);
    }
    
    updates.push(sql`updated_at = NOW()`);
    
    // Combine all SET clauses
    const setClause = updates.reduce((acc, clause, i) => {
      return i === 0 ? clause : sql`${acc}, ${clause}`;
    });
    
    try {
      console.log('Executing full settings update...');
      const result = await sql`
        UPDATE business_profile
        SET ${setClause}
        WHERE business_id = ${businessId}
        RETURNING *;
      `;
      
      console.log('Full update result:', result);
      
      // Restore original values
      console.log('\nRestoring original values...');
      await sql`
        UPDATE business_profile
        SET 
          currency = ${profile.currency},
          phone = ${profile.phone},
          country = ${profile.country}
        WHERE business_id = ${businessId};
      `;
      console.log('Original values restored');
      
    } catch (fullUpdateError) {
      console.error('Error during full settings update:', fullUpdateError);
      if (fullUpdateError instanceof Error) {
        console.error('Error message:', fullUpdateError.message);
        console.error('Error stack:', fullUpdateError.stack);
      }
    }
    
  } catch (error) {
    console.error('Error during test:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testProfileUpdate(); 