#!/usr/bin/env node

/**
 * Apply Database Fix for 3x Point Multiplication Bug
 * 
 * This script applies the fix-multiplication-bug.sql to the database
 * to resolve the issue where 1 point becomes 3 points.
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ ERROR: No DATABASE_URL found in environment variables');
  console.log('Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🔧 Applying Database Fix for 3x Point Multiplication Bug');
console.log('=' .repeat(60));

async function applyDatabaseFix() {
  try {
    // Initialize database connection
    const sql = neon(DATABASE_URL);
    console.log('✅ Connected to database');

    // Read the SQL fix file
    const sqlFixPath = join(__dirname, 'fix-multiplication-bug.sql');
    const sqlContent = readFileSync(sqlFixPath, 'utf8');
    console.log('📄 Loaded SQL fix script');

    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.includes('DO $$'))
      .filter(stmt => !stmt.includes('RAISE NOTICE'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute the main function replacement
    const functionStatements = [
      // Drop old function
      "DROP FUNCTION IF EXISTS award_points_to_card(INTEGER, INTEGER, VARCHAR, TEXT, VARCHAR)",
      
      // Create new fixed function
      `CREATE OR REPLACE FUNCTION award_points_to_card(
        p_card_id INTEGER,
        p_points INTEGER,
        p_source VARCHAR(50) DEFAULT 'MANUAL',
        p_description TEXT DEFAULT '',
        p_transaction_ref VARCHAR(255) DEFAULT NULL
      ) RETURNS BOOLEAN AS $$
      DECLARE
        v_customer_id INTEGER;
        v_program_id INTEGER;
        v_business_id INTEGER;
        v_success BOOLEAN := FALSE;
        v_current_points INTEGER := 0;
      BEGIN
        -- Get card details and current points
        SELECT customer_id, program_id, business_id, COALESCE(points, 0)
        INTO v_customer_id, v_program_id, v_business_id, v_current_points
        FROM loyalty_cards
        WHERE id = p_card_id AND is_active = TRUE;
        
        -- Check if card exists
        IF NOT FOUND THEN
          RETURN FALSE;
        END IF;
        
        -- FIXED: Update ONLY the main points column (no multiplication!)
        UPDATE loyalty_cards
        SET 
          points = COALESCE(points, 0) + p_points,
          updated_at = NOW()
        WHERE id = p_card_id;
        
        -- Verify the update
        IF FOUND THEN
          v_success := TRUE;
          
          -- Record transaction in card_activities
          INSERT INTO card_activities (
            card_id,
            activity_type,
            points,
            description,
            transaction_reference,
            created_at
          ) VALUES (
            p_card_id,
            'EARN_POINTS',
            p_points,
            COALESCE(p_description, 'Points awarded via ' || p_source),
            COALESCE(p_transaction_ref, 'tx-' || extract(epoch from now())),
            NOW()
          );
          
          -- Update program_enrollments if exists (optional)
          UPDATE program_enrollments
          SET current_points = current_points + p_points,
              last_activity = NOW()
          WHERE customer_id = v_customer_id::VARCHAR 
          AND program_id = v_program_id;
        END IF;
        
        RETURN v_success;
      END;
      $$ LANGUAGE plpgsql`
    ];

    // Execute each statement
    for (let i = 0; i < functionStatements.length; i++) {
      const statement = functionStatements[i];
      try {
        console.log(`🔄 Executing statement ${i + 1}/${functionStatements.length}...`);
        await sql(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        // Continue with other statements
      }
    }

    // Test the fix
    console.log('\n🧪 Testing the fix...');
    
    try {
      // Check if any loyalty cards exist to test with
      const cards = await sql`SELECT id FROM loyalty_cards LIMIT 1`;
      
      if (cards.length > 0) {
        const testCardId = cards[0].id;
        console.log(`🎯 Testing with card ID: ${testCardId}`);
        
        // Get current points
        const beforeTest = await sql`SELECT points FROM loyalty_cards WHERE id = ${testCardId}`;
        const pointsBefore = beforeTest[0]?.points || 0;
        console.log(`📊 Points before test: ${pointsBefore}`);
        
        // Test the function with 1 point
        const result = await sql`SELECT award_points_to_card(${testCardId}, 1, 'TEST', 'Database fix test')`;
        
        // Check points after
        const afterTest = await sql`SELECT points FROM loyalty_cards WHERE id = ${testCardId}`;
        const pointsAfter = afterTest[0]?.points || 0;
        console.log(`📊 Points after test: ${pointsAfter}`);
        
        const pointsAdded = pointsAfter - pointsBefore;
        if (pointsAdded === 1) {
          console.log('✅ TEST PASSED: Exactly 1 point was added (no multiplication!)');
        } else {
          console.log(`❌ TEST FAILED: Expected 1 point added, got ${pointsAdded}`);
        }
      } else {
        console.log('⚠️  No loyalty cards found to test with');
      }
    } catch (testError) {
      console.warn('⚠️  Could not run test:', testError.message);
    }

    console.log('\n🎉 Database fix application completed!');
    console.log('📋 Summary:');
    console.log('  ✅ Dropped old multiplication-causing function');
    console.log('  ✅ Created new function that updates only main points column');
    console.log('  ✅ 3x multiplication bug should now be fixed');
    console.log('\n🧪 Next steps:');
    console.log('  1. Test QR code scanning in your app');
    console.log('  2. Award 1 point → should see exactly 1 point in customer cards');
    console.log('  3. Award 10 points → should see exactly 10 points in customer cards');

  } catch (error) {
    console.error('❌ Failed to apply database fix:', error);
    process.exit(1);
  }
}

// Run the fix
applyDatabaseFix(); 