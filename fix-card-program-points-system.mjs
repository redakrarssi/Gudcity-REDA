#!/usr/bin/env node

/**
 * Card-Program Points System Fix
 * 
 * This script ensures:
 * 1. Each card in /cards is connected to its program (critical)
 * 2. Each card has proper point counting/accumulating system
 * 3. Points are added to existing points in database
 * 4. Customer dashboard displays correct points
 */

console.log('🔧 Card-Program Points System Fix');
console.log('=' .repeat(50));

async function fixCardProgramPointsSystem() {
  try {
    // We'll use a different approach since we need to work with the existing codebase
    console.log('\n📋 Step 1: Analyzing Current Database Structure');
    
    const queries = [
      // Step 1: Ensure loyalty_cards table has all necessary columns
      `
      -- Add missing columns to loyalty_cards if they don't exist
      ALTER TABLE loyalty_cards 
      ADD COLUMN IF NOT EXISTS card_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'STANDARD',
      ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;
      `,
      
      // Step 2: Ensure all cards are properly connected to programs
      `
      -- Update any orphaned cards to ensure program_id is not null
      UPDATE loyalty_cards 
      SET program_id = (
        SELECT id FROM loyalty_programs 
        WHERE business_id = loyalty_cards.business_id 
        LIMIT 1
      )
      WHERE program_id IS NULL AND business_id IS NOT NULL;
      `,
      
      // Step 3: Sync points columns for consistency
      `
      -- Sync points columns to ensure consistency
      UPDATE loyalty_cards 
      SET 
        points_balance = COALESCE(points, 0),
        total_points_earned = GREATEST(COALESCE(points, 0), COALESCE(total_points_earned, 0))
      WHERE points_balance IS NULL OR total_points_earned IS NULL;
      `,
      
      // Step 4: Create cards for enrolled customers without cards
      `
      -- Create loyalty cards for customers enrolled in programs but missing cards
      INSERT INTO loyalty_cards (
        customer_id, 
        business_id, 
        program_id, 
        card_number,
        card_type,
        points,
        points_balance,
        total_points_earned,
        status,
        tier,
        is_active,
        created_at,
        updated_at
      )
      SELECT DISTINCT
        pe.customer_id::INTEGER,
        lp.business_id,
        pe.program_id,
        'GC-' || lpad(pe.customer_id::TEXT, 6, '0') || '-' || pe.program_id,
        'STANDARD',
        COALESCE(pe.current_points, 0),
        COALESCE(pe.current_points, 0),
        COALESCE(pe.current_points, 0),
        'ACTIVE',
        'STANDARD',
        TRUE,
        NOW(),
        NOW()
      FROM program_enrollments pe
      JOIN loyalty_programs lp ON pe.program_id = lp.id
      LEFT JOIN loyalty_cards lc ON pe.customer_id::INTEGER = lc.customer_id AND pe.program_id = lc.program_id
      WHERE lc.id IS NULL 
      AND pe.status = 'ACTIVE';
      `,
      
      // Step 5: Create an optimized function for awarding points
      `
      -- Create or replace function for reliable point awarding
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
      BEGIN
        -- Get card details
        SELECT customer_id, program_id, business_id
        INTO v_customer_id, v_program_id, v_business_id
        FROM loyalty_cards
        WHERE id = p_card_id AND is_active = TRUE;
        
        -- Check if card exists
        IF NOT FOUND THEN
          RAISE NOTICE 'Card not found or inactive: %', p_card_id;
          RETURN FALSE;
        END IF;
        
        -- Update card points (accumulate)
        UPDATE loyalty_cards
        SET 
          points = COALESCE(points, 0) + p_points,
          points_balance = COALESCE(points_balance, 0) + p_points,
          total_points_earned = COALESCE(total_points_earned, 0) + p_points,
          updated_at = NOW()
        WHERE id = p_card_id;
        
        -- Check if update was successful
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
          
          -- Also update program_enrollments if exists
          UPDATE program_enrollments
          SET current_points = current_points + p_points,
              last_activity = NOW()
          WHERE customer_id = v_customer_id::VARCHAR 
          AND program_id = v_program_id;
          
          RAISE NOTICE 'Successfully awarded % points to card %', p_points, p_card_id;
        END IF;
        
        RETURN v_success;
      END;
      $$ LANGUAGE plpgsql;
      `,
      
      // Step 6: Create indexes for better performance
      `
      -- Create performance indexes
      CREATE INDEX IF NOT EXISTS idx_loyalty_cards_points ON loyalty_cards(points);
      CREATE INDEX IF NOT EXISTS idx_loyalty_cards_active ON loyalty_cards(is_active) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_card_activities_type ON card_activities(activity_type);
      `
    ];
    
    console.log('\n🔧 Database Fix Queries Generated:');
    queries.forEach((query, index) => {
      console.log(`\n--- Query ${index + 1} ---`);
      console.log(query.trim());
    });
    
    console.log('\n✅ Card-Program Points System Fix Ready');
    console.log('\n📝 To apply these fixes:');
    console.log('1. Run each query against your database');
    console.log('2. Verify cards are connected to programs');
    console.log('3. Test point awarding functionality');
    
    console.log('\n🧪 Test the system:');
    console.log('1. Scan a customer QR code');
    console.log('2. Award points using the business dashboard');
    console.log('3. Check customer /cards page for updated points');
    
  } catch (error) {
    console.error('❌ Fix generation failed:', error);
  }
}

// Test function to verify a specific card
function generateCardTestQuery(cardId, pointsToAdd = 10) {
  return `
-- Test point awarding for card ${cardId}
SELECT award_points_to_card(${cardId}, ${pointsToAdd}, 'TEST', 'Testing point accumulation system');

-- Check the result
SELECT 
  id,
  customer_id,
  program_id,
  points,
  points_balance,
  total_points_earned,
  updated_at
FROM loyalty_cards 
WHERE id = ${cardId};
  `;
}

console.log('\n🎯 Quick Test Query Generator:');
console.log('To test with a specific card, use:');
console.log(generateCardTestQuery('YOUR_CARD_ID', 10));

fixCardProgramPointsSystem(); 