#!/usr/bin/env node

/**
 * Script to fix the issue with customer ID 27 and program ID 11
 * This script addresses the 405 error when trying to award points
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

async function main() {
  console.log('🔧 Starting fix for customer ID 27 and program ID 11');
  
  if (!DATABASE_URL) {
    console.error('❌ Database URL not found in environment variables');
    console.error('Create a .env or .env.local file with DATABASE_URL or VITE_DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });

  try {
    // 1. Check if customer 27 exists
    console.log('Checking if customer ID 27 exists...');
    
    const customerCheck = await pool.query(`
      SELECT * FROM users WHERE id = 27
    `);
    
    if (customerCheck.rows.length === 0) {
      console.log('⚠️ Customer ID 27 not found in users table, checking customers table...');
      
      const customerFallback = await pool.query(`
        SELECT * FROM customers WHERE id = 27
      `);
      
      if (customerFallback.rows.length === 0) {
        console.log('❌ Customer ID 27 not found in any table. Cannot proceed.');
        return;
      } else {
        console.log('✅ Customer ID 27 found in customers table');
      }
    } else {
      console.log('✅ Customer ID 27 found in users table');
    }
    
    // 2. Check if program 11 exists
    console.log('\nChecking if program ID 11 exists...');
    
    const programCheck = await pool.query(`
      SELECT * FROM loyalty_programs WHERE id = 11
    `);
    
    if (programCheck.rows.length === 0) {
      console.log('❌ Program ID 11 not found. Cannot proceed.');
      return;
    } else {
      console.log('✅ Program ID 11 found');
      console.log(`Program name: ${programCheck.rows[0].name}`);
      console.log(`Business ID: ${programCheck.rows[0].business_id}`);
    }
    
    // 3. Check if customer is enrolled in program
    console.log('\nChecking if customer 27 is enrolled in program 11...');
    
    const enrollmentCheck = await pool.query(`
      SELECT * FROM customer_programs
      WHERE customer_id = '27' AND program_id = 11
    `);
    
    if (enrollmentCheck.rows.length === 0) {
      console.log('⚠️ Customer 27 is not enrolled in program 11. Creating enrollment...');
      
      // Create enrollment
      await pool.query(`
        INSERT INTO customer_programs (
          customer_id, program_id, current_points, status, enrolled_at
        ) VALUES (
          '27', 11, 0, 'ACTIVE', NOW()
        )
      `);
      
      console.log('✅ Created enrollment for customer 27 in program 11');
    } else {
      console.log('✅ Customer 27 is already enrolled in program 11');
      console.log(`Current points: ${enrollmentCheck.rows[0].current_points}`);
    }
    
    // 4. Check if customer has a loyalty card for this program
    console.log('\nChecking if customer 27 has a loyalty card for program 11...');
    
    const cardCheck = await pool.query(`
      SELECT * FROM loyalty_cards
      WHERE customer_id = '27' AND program_id = 11
    `);
    
    if (cardCheck.rows.length === 0) {
      console.log('⚠️ No loyalty card found for customer 27 in program 11. Creating card...');
      
      // Get business ID from program
      const businessId = programCheck.rows[0].business_id;
      
      // Create loyalty card
      await pool.query(`
        INSERT INTO loyalty_cards (
          customer_id, program_id, business_id, card_type, points, points_balance,
          is_active, created_at, updated_at
        ) VALUES (
          '27', 11, $1, 'STANDARD', 0, 0, TRUE, NOW(), NOW()
        )
      `, [businessId]);
      
      console.log('✅ Created loyalty card for customer 27 in program 11');
    } else {
      console.log('✅ Customer 27 already has a loyalty card for program 11');
      console.log(`Card ID: ${cardCheck.rows[0].id}`);
      console.log(`Points: ${cardCheck.rows[0].points}`);
    }
    
    // 5. Verify the fix
    console.log('\nVerifying fix...');
    
    // Check enrollment again
    const verifyEnrollment = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM customer_programs
        WHERE customer_id = '27' AND program_id = 11
      ) AS is_enrolled
    `);
    
    // Check card again
    const verifyCard = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM loyalty_cards
        WHERE customer_id = '27' AND program_id = 11
      ) AS has_card
    `);
    
    if (verifyEnrollment.rows[0].is_enrolled && verifyCard.rows[0].has_card) {
      console.log('✅ Fix verified! Customer 27 is enrolled in program 11 and has a loyalty card.');
      console.log('You should now be able to award points without getting a 405 error.');
    } else {
      console.log('❌ Fix verification failed. Please check the logs above for errors.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing customer 27 and program 11:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 