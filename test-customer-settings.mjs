import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Directly set the database URL
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

// Sample customer data to insert for testing
const sampleCustomer = {
  name: 'Test Customer',
  email: `test.customer.${Date.now()}@example.com`,
  phone: '+1-555-123-4567',
  address: '123 Test Street, Test City',
  notification_preferences: JSON.stringify({
    email: true,
    push: false,
    sms: true,
    promotions: true,
    rewards: false,
    system: true
  }),
  regional_settings: JSON.stringify({
    language: 'fr',
    country: 'France',
    currency: 'EUR',
    timezone: 'Europe/Paris'
  })
};

async function runTests() {
  let customerId = null;
  
  try {
    console.log('=== Running Customer Settings Tests ===');
    
    // Ensure the database has the required columns
    console.log('\nChecking database schema...');
    await checkDatabaseSchema();
    
    // Create a test customer
    console.log('\nCreating test customer...');
    customerId = await createTestCustomer(sampleCustomer);
    console.log(`Created test customer with ID: ${customerId}`);
    
    // Test retrieving the customer settings
    console.log('\nTesting retrieval of customer settings...');
    const customerSettings = await getCustomerSettings(customerId);
    console.log('Retrieved settings:', JSON.stringify(customerSettings, null, 2));
    
    // Test updating the customer settings
    console.log('\nTesting update of customer settings...');
    const updatedSettings = {
      name: 'Updated Test Customer',
      notification_preferences: JSON.stringify({
        email: true,
        push: true,
        sms: false,
        promotions: false,
        rewards: true,
        system: true
      }),
      regional_settings: JSON.stringify({
        language: 'es',
        country: 'Spain',
        currency: 'EUR',
        timezone: 'Europe/Madrid'
      })
    };
    
    await updateCustomerSettings(customerId, updatedSettings);
    console.log('Settings updated.');
    
    // Verify the updates
    console.log('\nVerifying updated settings...');
    const updatedCustomerSettings = await getCustomerSettings(customerId);
    console.log('Updated settings:', JSON.stringify(updatedCustomerSettings, null, 2));
    
    // Clean up
    if (process.env.KEEP_TEST_DATA !== 'true') {
      console.log('\nCleaning up test data...');
      await deleteTestCustomer(customerId);
      console.log('Test customer deleted.');
    } else {
      console.log('\nSkipping cleanup - test data preserved.');
    }
    
    console.log('\n=== Customer Settings Tests Completed Successfully ===');
  } catch (error) {
    console.error('\nTest failed:', error);
    
    // Attempt to clean up even if tests failed
    if (customerId && process.env.KEEP_TEST_DATA !== 'true') {
      console.log('Cleaning up test data after failure...');
      try {
        await deleteTestCustomer(customerId);
        console.log('Test customer deleted.');
      } catch (cleanupError) {
        console.error('Failed to clean up test data:', cleanupError);
      }
    }
  } finally {
    await pool.end();
  }
}

async function checkDatabaseSchema() {
  // Check if the necessary columns exist in the customers table
  const columnsResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'customers' AND (
      column_name = 'notification_preferences' OR
      column_name = 'regional_settings'
    )
  `);
  
  if (columnsResult.rows.length < 2) {
    console.log('Missing required columns. Will run setup script...');
    
    // Read and execute the setup SQL
    const setupSql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'notification_preferences'
      ) THEN
        ALTER TABLE customers ADD COLUMN notification_preferences JSONB DEFAULT '{
          "email": true,
          "push": true,
          "sms": false,
          "promotions": true,
          "rewards": true,
          "system": true
        }';
      END IF;
    END
    $$;
    
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'regional_settings'
      ) THEN
        ALTER TABLE customers ADD COLUMN regional_settings JSONB DEFAULT '{
          "language": "en",
          "country": "United States",
          "currency": "USD",
          "timezone": "UTC"
        }';
      END IF;
    END
    $$;
    `;
    
    await pool.query(setupSql);
    
    // Verify columns were added
    const verifyColumnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'customers' AND (
        column_name = 'notification_preferences' OR
        column_name = 'regional_settings'
      )
    `);
    
    console.log(`Schema updated. Found ${verifyColumnsResult.rows.length} new columns:`);
    verifyColumnsResult.rows.forEach(row => console.log(`- ${row.column_name}`));
  } else {
    console.log('Required columns exist:');
    columnsResult.rows.forEach(row => console.log(`- ${row.column_name}`));
  }
}

async function createTestCustomer(customerData) {
  // Create a new customer for testing
  const result = await pool.query(`
    INSERT INTO customers (
      name, 
      email, 
      phone, 
      address, 
      notification_preferences, 
      regional_settings
    ) VALUES (
      $1, $2, $3, $4, $5, $6
    ) RETURNING id
  `, [
    customerData.name,
    customerData.email,
    customerData.phone,
    customerData.address,
    customerData.notification_preferences,
    customerData.regional_settings
  ]);
  
  return result.rows[0].id;
}

async function deleteTestCustomer(customerId) {
  // Delete the test customer
  await pool.query(`DELETE FROM customers WHERE id = $1`, [customerId]);
}

async function getCustomerSettings(customerId) {
  // Get customer settings
  const result = await pool.query(`
    SELECT 
      id, 
      name, 
      email, 
      phone, 
      address, 
      notification_preferences, 
      regional_settings,
      created_at,
      updated_at
    FROM customers 
    WHERE id = $1
  `, [customerId]);
  
  if (result.rows.length === 0) {
    throw new Error(`No customer found with ID ${customerId}`);
  }
  
  return result.rows[0];
}

async function updateCustomerSettings(customerId, updates) {
  // Build the SET clause dynamically based on provided updates
  const fields = [];
  const values = [customerId];
  let paramCounter = 2;
  
  Object.keys(updates).forEach(key => {
    fields.push(`${key} = $${paramCounter}`);
    values.push(updates[key]);
    paramCounter++;
  });
  
  // Add updated_at timestamp
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  
  const query = `
    UPDATE customers 
    SET ${fields.join(', ')} 
    WHERE id = $1
    RETURNING id
  `;
  
  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error(`Failed to update customer with ID ${customerId}`);
  }
  
  return result.rows[0].id;
}

// Run the tests
runTests(); 