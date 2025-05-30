import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Create a database connection
const sql = (strings, ...values) => {
  const query = strings.reduce((result, str, i) => {
    return result + str + (values[i] !== undefined ? `$${i + 1}` : '');
  }, '');
  
  const params = values.filter(v => v !== undefined);
  
  return {
    query,
    params,
    execute: async () => {
      const client = await pool.connect();
      try {
        const result = await client.query(query, params);
        return result.rows;
      } finally {
        client.release();
      }
    }
  };
};

const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Testing loyalty program service...');
    
    // Test connection
    const testResult = await sql`SELECT 1 as test`.execute();
    console.log('Connection successful:', testResult);
    
    // Get all loyalty programs
    const programs = await sql`
      SELECT * FROM loyalty_programs
      LIMIT 5
    `.execute();
    
    console.log('Found programs:', programs.length);
    
    if (programs.length > 0) {
      console.log('Sample program:', programs[0]);
      
      // Get reward tiers for the first program
      const tiers = await sql`
        SELECT * FROM reward_tiers
        WHERE program_id = ${programs[0].id}
        ORDER BY points_required ASC
      `.execute();
      
      console.log('Reward tiers for program:', tiers);
    } else {
      console.log('No existing programs found, creating a test program...');
      
      // Create a test program
      const businessId = '1'; // Test business ID
      
      const newProgram = await sql`
        INSERT INTO loyalty_programs (
          business_id,
          name,
          description,
          type,
          point_value,
          expiration_days,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${businessId},
          ${'Test Coffee Rewards'},
          ${'Earn points for every coffee purchase'},
          ${'POINTS'},
          ${1.0},
          ${365},
          ${'ACTIVE'},
          NOW(),
          NOW()
        )
        RETURNING *
      `.execute();
      
      console.log('Created test program:', newProgram[0]);
      
      // Create reward tiers for the test program
      if (newProgram.length > 0) {
        const programId = newProgram[0].id;
        
        const tier1 = await sql`
          INSERT INTO reward_tiers (
            program_id,
            points_required,
            reward
          )
          VALUES (
            ${programId},
            ${10},
            ${'Free Coffee'}
          )
          RETURNING *
        `.execute();
        
        const tier2 = await sql`
          INSERT INTO reward_tiers (
            program_id,
            points_required,
            reward
          )
          VALUES (
            ${programId},
            ${25},
            ${'Free Pastry'}
          )
          RETURNING *
        `.execute();
        
        console.log('Created reward tiers:', [tier1[0], tier2[0]]);
      }
    }
  } catch (error) {
    console.error('Error testing loyalty program service:', error);
  } finally {
    await pool.end();
  }
}

main(); 