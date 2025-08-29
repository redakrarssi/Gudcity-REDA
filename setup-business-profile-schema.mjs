import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

// Directly set the database URL
const DATABASE_URL = "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """;

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up business profile data...');
    
    // Check if tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'business_profile'
    `);
    
    if (result.rows.length === 0) {
      console.log('Business profile table not found, creating...');
      // Read the schema SQL file
      const sql = fs.readFileSync('./db/business_profile_schema.sql', 'utf8');
      
      // Execute the schema SQL
      await pool.query(sql);
      console.log('Schema created successfully!');
    } else {
      console.log('Using existing business_profile table');
    }
    
    // Check the columns in business_profile to make sure we know what we're working with
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'business_profile'
    `);
    
    console.log('Business profile columns:');
    const columns = columnsResult.rows.map(row => row.column_name);
    console.log(columns);
    
    // Get all business users to create default profiles for them
    const usersResult = await pool.query(`
      SELECT id, name, email, business_name, business_phone 
      FROM users 
      WHERE user_type = 'business'
    `);
    
    const businessUsers = usersResult.rows;
    console.log(`Found ${businessUsers.length} business users`);
    
    // Check if any of them already have business profiles
    const profilesResult = await pool.query(`
      SELECT business_id FROM business_profile
    `);
    
    const existingProfileBusinessIds = profilesResult.rows.map(row => row.business_id.toString());
    
    console.log('Existing profiles for business IDs:', existingProfileBusinessIds);
    
    // Create profiles for each business that doesn't already have one
    let createdCount = 0;
    for (const user of businessUsers) {
      if (!existingProfileBusinessIds.includes(user.id.toString())) {
        console.log(`Creating profile for business ID: ${user.id} (${user.business_name || user.name})`);
        
        // Build the insert query based on actual columns
        const insertFields = [];
        const insertValues = [];
        const valuePlaceholders = [];
        let paramIndex = 1;
        
        // Required field
        insertFields.push('business_id');
        insertValues.push(user.id);
        valuePlaceholders.push(`$${paramIndex++}`);
        
        // Optional fields - check if they exist in schema
        if (columns.includes('business_name')) {
          insertFields.push('business_name');
          insertValues.push(user.business_name || user.name);
          valuePlaceholders.push(`$${paramIndex++}`);
        }
        
        if (columns.includes('phone')) {
          insertFields.push('phone');
          insertValues.push(user.business_phone || '');
          valuePlaceholders.push(`$${paramIndex++}`);
        }
        
        if (columns.includes('email')) {
          insertFields.push('email');
          insertValues.push(user.email || '');
          valuePlaceholders.push(`$${paramIndex++}`);
        }
        
        // Execute the dynamic insert query
        const insertQuery = `
          INSERT INTO business_profile (
            ${insertFields.join(', ')}
          ) VALUES (
            ${valuePlaceholders.join(', ')}
          )
        `;
        
        await pool.query(insertQuery, insertValues);
        createdCount++;
      }
    }
    
    console.log(`Created default profiles for ${createdCount} businesses`);
    
    // Check for existing business_settings data to integrate
    try {
      const businessSettingsResult = await pool.query(`
        SELECT * FROM business_settings
      `);
      
      if (businessSettingsResult.rows.length > 0) {
        console.log(`Found ${businessSettingsResult.rows.length} existing business_settings records`);
        
        for (const settings of businessSettingsResult.rows) {
          console.log(`Settings for business ID: ${settings.business_id}`);
        }
      }
    } catch (error) {
      console.log('Note: No business_settings table found or error accessing it');
    }
    
    console.log('Business profile setup complete! ✅');
  } catch (error) {
    console.error('Error setting up business profile:', error);
  } finally {
    await pool.end();
  }
}

main(); 