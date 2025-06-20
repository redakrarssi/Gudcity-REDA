import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.VITE_DATABASE_URL;

async function setupLoyaltySchema() {
  console.log('Setting up loyalty schema...');
  
  try {
    if (!DATABASE_URL) {
      console.error('No DATABASE_URL found in environment variables');
      return;
    }
    
    const sql = neon(DATABASE_URL);
    
    // Check if table exists first
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'loyalty_programs'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.log('loyalty_programs table does not exist, creating...');
      await sql`
        CREATE TABLE loyalty_programs (
          id SERIAL PRIMARY KEY,
          business_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL,
          point_value NUMERIC(10, 2) DEFAULT 1.0,
          expiration_days INTEGER,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('loyalty_programs table created successfully');
    } else {
      // Check column type
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'loyalty_programs'
        AND column_name = 'business_id'
      `;
      
      if (columns.length > 0) {
        const businessIdColumn = columns[0];
        console.log(`Current business_id column type: ${businessIdColumn.data_type}`);
        
        if (businessIdColumn.data_type !== 'integer') {
          console.log('Altering business_id column to INTEGER type...');
          
          // Create a temporary column for the conversion
          await sql`ALTER TABLE loyalty_programs ADD COLUMN business_id_new INTEGER`;
          
          // Convert existing values
          await sql`
            UPDATE loyalty_programs 
            SET business_id_new = CASE 
              WHEN business_id ~ '^[0-9]+$' THEN business_id::INTEGER
              ELSE NULL
            END
          `;
          
          // Drop the old column and rename the new one
          await sql`ALTER TABLE loyalty_programs DROP COLUMN business_id`;
          await sql`ALTER TABLE loyalty_programs RENAME COLUMN business_id_new TO business_id`;
          
          // Add NOT NULL constraint
          await sql`ALTER TABLE loyalty_programs ALTER COLUMN business_id SET NOT NULL`;
          
          console.log('business_id column altered to INTEGER type');
        } else {
          console.log('business_id column is already INTEGER type');
        }
      }
    }
    
    // Check if reward_tiers table exists
    const rewardTiersExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reward_tiers'
      );
    `;
    
    if (!rewardTiersExists[0].exists) {
      console.log('reward_tiers table does not exist, creating...');
      await sql`
        CREATE TABLE reward_tiers (
          id SERIAL PRIMARY KEY,
          program_id INTEGER NOT NULL,
          points_required INTEGER NOT NULL,
          reward VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (program_id) REFERENCES loyalty_programs(id) ON DELETE CASCADE
        )
      `;
      console.log('reward_tiers table created successfully');
    }
    
    console.log('Loyalty schema setup completed successfully');
    
  } catch (error) {
    console.error('Error setting up loyalty schema:', error);
  }
}

setupLoyaltySchema().catch(console.error); 