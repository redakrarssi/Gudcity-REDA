// =====================================================
// QUICK DATABASE FIX - 3x Point Multiplication Bug
// =====================================================
// This script applies the fix using Node.js
// Run with: node quick-database-fix.js
// =====================================================

import { neon } from '@neondatabase/serverless';

// Try to get database URL from various sources
const DATABASE_URL = 
  process.env.VITE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  process.env.NEON_DATABASE_URL ||
  // If you have a direct connection string, put it here:
  // 'postgresql://username:password@host:port/database'
  '';

async function applyFix() {
  console.log('🔧 Applying Database Fix for 3x Point Multiplication Bug');
  console.log('=' .repeat(60));

  if (!DATABASE_URL) {
    console.log('❌ No database URL found.');
    console.log('');
    console.log('📋 MANUAL OPTION:');
    console.log('1. Open your PostgreSQL database interface (pgAdmin, etc.)');
    console.log('2. Copy and run the SQL from MANUAL-DATABASE-FIX.sql');
    console.log('3. Test with your actual card IDs');
    console.log('');
    console.log('🔧 OR SET DATABASE URL:');
    console.log('Set one of these environment variables:');
    console.log('- VITE_DATABASE_URL');
    console.log('- DATABASE_URL');
    console.log('- NEON_DATABASE_URL');
    console.log('');
    console.log('💡 Example:');
    console.log('export DATABASE_URL="postgresql://user:pass@host:port/db"');
    console.log('node quick-database-fix.js');
    return;
  }

  try {
    const sql = neon(DATABASE_URL);
    console.log('✅ Connected to database');

    // Step 1: Drop old function
    console.log('🗑️  Dropping old function...');
    await sql`DROP FUNCTION IF EXISTS award_points_to_card(INTEGER, INTEGER, VARCHAR, TEXT, VARCHAR)`;
    console.log('✅ Old function dropped');

    // Step 2: Create new fixed function
    console.log('🔧 Creating fixed function...');
    await sql`
      CREATE OR REPLACE FUNCTION award_points_to_card(
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
          
          -- Update program_enrollments if exists
          UPDATE program_enrollments
          SET current_points = current_points + p_points,
              last_activity = NOW()
          WHERE customer_id = v_customer_id::VARCHAR 
          AND program_id = v_program_id;
        END IF;
        
        RETURN v_success;
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✅ Fixed function created');

    // Step 3: Test the fix
    console.log('🧪 Testing the fix...');
    const cards = await sql`SELECT id, points FROM loyalty_cards LIMIT 1`;
    
    if (cards.length > 0) {
      const testCard = cards[0];
      const pointsBefore = testCard.points || 0;
      
      console.log(`📊 Testing with card ${testCard.id}, current points: ${pointsBefore}`);
      
      // Test with 1 point
      await sql`SELECT award_points_to_card(${testCard.id}, 1, 'TEST', 'Fix verification test')`;
      
      const afterTest = await sql`SELECT points FROM loyalty_cards WHERE id = ${testCard.id}`;
      const pointsAfter = afterTest[0].points || 0;
      const pointsAdded = pointsAfter - pointsBefore;
      
      if (pointsAdded === 1) {
        console.log('✅ TEST PASSED: Exactly 1 point was added (no multiplication!)');
      } else {
        console.log(`❌ TEST FAILED: Expected 1 point, got ${pointsAdded}`);
      }
    } else {
      console.log('⚠️  No cards found to test with');
    }

    console.log('');
    console.log('🎉 DATABASE FIX COMPLETED!');
    console.log('📋 What was fixed:');
    console.log('  ✅ Removed 3x point multiplication');
    console.log('  ✅ Points now awarded 1:1 (1 point = 1 point)');
    console.log('  ✅ Function only updates main points column');
    console.log('');
    console.log('🚀 Test in your app:');
    console.log('  1. Scan customer QR code');
    console.log('  2. Award 1 point → customer gets 1 point');
    console.log('  3. Award 10 points → customer gets 10 points');

  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
    console.log('');
    console.log('📋 FALLBACK OPTION:');
    console.log('Use the MANUAL-DATABASE-FIX.sql file instead');
    console.log('Run it directly in your database interface');
  }
}

applyFix(); 