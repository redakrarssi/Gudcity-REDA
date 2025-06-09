import sql from './src/utils/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

async function updateLoyaltyProgramsSchema() {
  try {
    console.log('Checking if columns exist in loyalty_programs table...');
    
    // Check if is_active column exists
    const isActiveExists = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'loyalty_programs' 
        AND column_name = 'is_active'
      ) as exists
    `;
    
    // Check if category column exists
    const categoryExists = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'loyalty_programs' 
        AND column_name = 'category'
      ) as exists
    `;
    
    // Add is_active column if it doesn't exist
    if (!isActiveExists[0].exists) {
      console.log('Adding is_active column to loyalty_programs table...');
      await sql`
        ALTER TABLE loyalty_programs 
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE
      `;
      console.log('is_active column added successfully');
    } else {
      console.log('is_active column already exists');
    }
    
    // Add category column if it doesn't exist
    if (!categoryExists[0].exists) {
      console.log('Adding category column to loyalty_programs table...');
      await sql`
        ALTER TABLE loyalty_programs 
        ADD COLUMN category VARCHAR(50) DEFAULT 'retail'
      `;
      console.log('category column added successfully');
    } else {
      console.log('category column already exists');
    }
    
    console.log('Schema update completed successfully');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    process.exit(0);
  }
}

updateLoyaltyProgramsSchema(); 