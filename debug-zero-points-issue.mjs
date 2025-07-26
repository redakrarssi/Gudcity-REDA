#!/usr/bin/env node

/**
 * IMMEDIATE FIX: Debug and Solve Zero Points Issue
 * 
 * This script will:
 * 1. Check the current database state
 * 2. Identify why points are showing as 0
 * 3. Apply immediate fixes
 * 4. Test point awarding
 */

console.log('🚨 DEBUGGING ZERO POINTS ISSUE');
console.log('=' .repeat(50));

// Generate immediate diagnostic queries
const diagnosticQueries = [
  {
    name: "Check loyalty_cards table structure",
    query: `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'loyalty_cards' 
    AND column_name IN ('points', 'points_balance', 'total_points_earned', 'program_id')
    ORDER BY column_name;
    `
  },
  
  {
    name: "Check current loyalty cards and their points",
    query: `
    SELECT 
      lc.id as card_id,
      lc.customer_id,
      lc.program_id,
      lp.name as program_name,
      lc.points,
      lc.points_balance,
      lc.total_points_earned,
      lc.updated_at
    FROM loyalty_cards lc
    LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
    WHERE lc.is_active = TRUE
    ORDER BY lc.customer_id, lc.id;
    `
  },
  
  {
    name: "Check program_enrollments table",
    query: `
    SELECT 
      pe.customer_id,
      pe.program_id,
      lp.name as program_name,
      pe.current_points,
      pe.last_activity
    FROM program_enrollments pe
    LEFT JOIN loyalty_programs lp ON pe.program_id = lp.id
    ORDER BY pe.customer_id, pe.program_id;
    `
  },
  
  {
    name: "Check card_activities for recent point transactions",
    query: `
    SELECT 
      ca.card_id,
      ca.activity_type,
      ca.points,
      ca.description,
      ca.created_at
    FROM card_activities ca
    WHERE ca.activity_type = 'EARN_POINTS'
    ORDER BY ca.created_at DESC
    LIMIT 10;
    `
  }
];

const immediateFixQueries = [
  {
    name: "STEP 1: Add missing columns if they don't exist",
    query: `
    ALTER TABLE loyalty_cards 
    ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;
    `
  },
  
  {
    name: "STEP 2: Fix NULL or inconsistent points values",
    query: `
    UPDATE loyalty_cards 
    SET 
      points = COALESCE(points, 0),
      points_balance = COALESCE(points_balance, points, 0),
      total_points_earned = COALESCE(total_points_earned, points, 0)
    WHERE points IS NULL OR points_balance IS NULL OR total_points_earned IS NULL;
    `
  },
  
  {
    name: "STEP 3: Sync points from program_enrollments if cards have 0 but enrollments have points",
    query: `
    UPDATE loyalty_cards lc
    SET 
      points = pe.current_points,
      points_balance = pe.current_points,
      total_points_earned = pe.current_points,
      updated_at = NOW()
    FROM program_enrollments pe
    WHERE lc.customer_id::VARCHAR = pe.customer_id
    AND lc.program_id = pe.program_id
    AND lc.points = 0
    AND pe.current_points > 0;
    `
  },
  
  {
    name: "STEP 4: Create the award_points_to_card function",
    query: `
    CREATE OR REPLACE FUNCTION award_points_to_card(
      p_card_id INTEGER,
      p_points INTEGER,
      p_source VARCHAR(50) DEFAULT 'MANUAL',
      p_description TEXT DEFAULT ''
    ) RETURNS TABLE(success BOOLEAN, new_points INTEGER, message TEXT) AS $$
    DECLARE
      v_customer_id INTEGER;
      v_program_id INTEGER;
      v_current_points INTEGER;
      v_new_points INTEGER;
    BEGIN
      -- Get card details
      SELECT customer_id, program_id, COALESCE(points, 0)
      INTO v_customer_id, v_program_id, v_current_points
      FROM loyalty_cards
      WHERE id = p_card_id AND is_active = TRUE;
      
      -- Check if card exists
      IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'Card not found or inactive';
        RETURN;
      END IF;
      
      -- Calculate new points
      v_new_points := v_current_points + p_points;
      
      -- Update card points
      UPDATE loyalty_cards
      SET 
        points = v_new_points,
        points_balance = v_new_points,
        total_points_earned = GREATEST(total_points_earned, v_new_points),
        updated_at = NOW()
      WHERE id = p_card_id;
      
      -- Record activity
      INSERT INTO card_activities (
        card_id,
        activity_type,
        points,
        description,
        created_at
      ) VALUES (
        p_card_id,
        'EARN_POINTS',
        p_points,
        COALESCE(p_description, 'Points awarded via ' || p_source),
        NOW()
      );
      
      -- Update program_enrollments too
      UPDATE program_enrollments
      SET current_points = v_new_points,
          last_activity = NOW()
      WHERE customer_id = v_customer_id::VARCHAR 
      AND program_id = v_program_id;
      
      RETURN QUERY SELECT TRUE, v_new_points, 'Successfully awarded ' || p_points || ' points. Total: ' || v_new_points;
    END;
    $$ LANGUAGE plpgsql;
    `
  }
];

const testQueries = [
  {
    name: "TEST: Award 10 points to first available card",
    query: `
    SELECT * FROM award_points_to_card(
      (SELECT id FROM loyalty_cards WHERE is_active = TRUE LIMIT 1),
      10,
      'TEST',
      'Testing point awarding system'
    );
    `
  },
  
  {
    name: "VERIFY: Check cards after test",
    query: `
    SELECT 
      lc.id,
      lc.customer_id,
      lp.name as program_name,
      lc.points,
      lc.points_balance,
      lc.updated_at
    FROM loyalty_cards lc
    LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
    WHERE lc.is_active = TRUE
    ORDER BY lc.updated_at DESC
    LIMIT 5;
    `
  }
];

console.log('\n🔍 DIAGNOSTIC QUERIES TO RUN:');
console.log('Copy and paste these into your database to understand the current state:\n');

diagnosticQueries.forEach((item, index) => {
  console.log(`-- ${index + 1}. ${item.name}`);
  console.log(item.query);
  console.log('');
});

console.log('\n🔧 IMMEDIATE FIX QUERIES:');
console.log('Run these in order to fix the zero points issue:\n');

immediateFixQueries.forEach((item, index) => {
  console.log(`-- ${item.name}`);
  console.log(item.query);
  console.log('');
});

console.log('\n🧪 TEST QUERIES:');
console.log('Run these to test if the fix worked:\n');

testQueries.forEach((item, index) => {
  console.log(`-- ${item.name}`);
  console.log(item.query);
  console.log('');
});

console.log('\n📋 QUICK ACTION PLAN:');
console.log('1. Run the DIAGNOSTIC queries first to see current state');
console.log('2. Run the IMMEDIATE FIX queries in order');  
console.log('3. Run the TEST queries to verify it works');
console.log('4. Try scanning QR and awarding points again');
console.log('5. Check customer dashboard - points should appear!');

console.log('\n🎯 MOST LIKELY ISSUE:');
console.log('The database columns might not exist or have NULL values.');
console.log('The fix queries will create missing columns and sync existing data.');

console.log('\n✅ After running these fixes:');
console.log('- Cards will show actual points instead of 0');
console.log('- Point awarding will accumulate properly'); 
console.log('- Customer dashboard will refresh with correct data'); 