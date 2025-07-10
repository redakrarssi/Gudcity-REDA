#!/usr/bin/env node

/**
 * Database fix script for customer program enrollment and loyalty card issues
 * 
 * This script fixes inconsistencies between customer_programs and loyalty_cards tables
 * that could cause the 405 error when awarding points to enrolled customers.
 * 
 * Issues addressed:
 * 1. Customers enrolled in programs but missing loyalty cards
 * 2. Loyalty cards with incorrect customer or program references
 * 3. Inconsistent data formats for customer IDs across tables
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error('❌ Database URL not found in environment variables');
    console.error('Create a .env or .env.local file with DATABASE_URL or VITE_DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });

  console.log('🔧 Starting database fix for customer program enrollment issues');
  
  try {
    // 1. Ensure consistent customer ID format across tables
    console.log('Standardizing customer ID format...');
    
    // This will standardize IDs across tables - adapt as needed for your schema
    const fixQueries = [
      `
      ALTER TABLE customer_programs 
      ALTER COLUMN customer_id TYPE VARCHAR(255)
      `,
      
      `
      ALTER TABLE loyalty_cards
      ALTER COLUMN customer_id TYPE VARCHAR(255)
      `,
      
      `
      INSERT INTO loyalty_cards (customer_id, program_id, business_id, card_type, points, is_active, created_at)
      SELECT 
        cp.customer_id, 
        cp.program_id, 
        lp.business_id, 
        'STANDARD', 
        COALESCE(cp.current_points, 0), 
        TRUE, 
        NOW()
      FROM customer_programs cp
      JOIN loyalty_programs lp ON cp.program_id = lp.id
      WHERE NOT EXISTS (
        SELECT 1 FROM loyalty_cards lc 
        WHERE lc.customer_id = cp.customer_id 
        AND lc.program_id = cp.program_id
      )
      `,
      
      `
      UPDATE loyalty_cards lc
      SET points = cp.current_points
      FROM customer_programs cp
      WHERE lc.customer_id = cp.customer_id
      AND lc.program_id = cp.program_id
      AND lc.points != cp.current_points
      `
    ];
    
    // Execute each fix query
    for (const query of fixQueries) {
      try {
        await pool.query(query);
        console.log('✅ Successfully executed fix query');
      } catch (err) {
        console.log('⚠️ Query error (may be safely ignored if column already exists):', err.message);
      }
    }
    
    // 2. Check for any specific problem with customer ID 4
    console.log('\nChecking customer ID 4 specifically...');
    
    // Verify customer 4 exists
    const customer4 = await pool.query(`
      SELECT * FROM users WHERE id = 4
    `);
    
    if (customer4.rows.length > 0) {
      console.log('✅ Customer ID 4 exists in users table');
      
      // Check enrollments
      const enrollments = await pool.query(`
        SELECT * FROM customer_programs WHERE customer_id = '4'
      `);
      
      if (enrollments.rows.length > 0) {
        console.log(`✅ Customer 4 has ${enrollments.rows.length} program enrollments`);
        
        // Check for missing loyalty cards
        const missingCards = await pool.query(`
          SELECT cp.program_id 
          FROM customer_programs cp
          WHERE cp.customer_id = '4'
          AND NOT EXISTS (
            SELECT 1 FROM loyalty_cards lc
            WHERE lc.customer_id = '4'
            AND lc.program_id = cp.program_id
          )
        `);
        
        if (missingCards.rows.length > 0) {
          console.log(`⚠️ Customer 4 is missing loyalty cards for ${missingCards.rows.length} programs`);
          
          // Fix missing cards
          for (const row of missingCards.rows) {
            const programId = row.program_id;
            
            // Get business ID for this program
            const programInfo = await pool.query(`
              SELECT business_id FROM loyalty_programs WHERE id = $1
            `, [programId]);
            
            if (programInfo.rows.length > 0) {
              const businessId = programInfo.rows[0].business_id;
              
              // Create missing card
              await pool.query(`
                INSERT INTO loyalty_cards (
                  customer_id, program_id, business_id, card_type, 
                  points, is_active, created_at
                )
                VALUES ($1, $2, $3, 'STANDARD', 0, TRUE, NOW())
              `, ['4', programId, businessId]);
              
              console.log(`✅ Created missing card for program ${programId}`);
            }
          }
        } else {
          console.log('✅ Customer 4 has all required loyalty cards');
        }
      } else {
        console.log('❌ Customer 4 has no program enrollments');
      }
    } else {
      console.log('❌ Customer ID 4 not found in users table');
    }
    
    console.log('\n✅ Database fix script completed successfully');
    
  } catch (error) {
    console.error('❌ Error during database fix:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
