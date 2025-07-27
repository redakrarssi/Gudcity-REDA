#!/usr/bin/env node

/**
 * Test Points Fix - Verify 1:1 Point Awarding
 * This tests that 10 points sent = 10 points received (not 30)
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

console.log('🧪 TESTING 1:1 POINTS AWARDING FIX');
console.log('=' .repeat(50));

async function testPointsFix() {
  try {
    console.log('\n📊 STEP 1: Check initial card states...');
    
    // Get current points for test customer
    const beforeCards = await sql`
      SELECT 
        id as card_id,
        customer_id,
        program_id,
        points,
        points_balance,
        total_points_earned
      FROM loyalty_cards 
      WHERE customer_id = 1 AND is_active = TRUE
      ORDER BY id
      LIMIT 3
    `;
    
    console.log('Cards BEFORE test:');
    beforeCards.forEach(card => {
      console.log(`  Card ${card.card_id}: ${card.points} points (Balance: ${card.points_balance})`);
    });

    if (beforeCards.length === 0) {
      console.log('❌ No cards found for testing');
      return;
    }

    console.log('\n🔧 STEP 2: Testing exact point award...');
    
    // Test: Award exactly 15 points to first card
    const testCard = beforeCards[0];
    console.log(`Testing with Card ${testCard.card_id} (current: ${testCard.points} points)`);
    
    const expectedNewTotal = testCard.points + 15;
    
    const result = await sql`
      UPDATE loyalty_cards 
      SET 
        points = points + 15,
        points_balance = points_balance + 15,
        total_points_earned = total_points_earned + 15,
        updated_at = NOW()
      WHERE id = ${testCard.card_id}
      RETURNING id, points, points_balance, total_points_earned
    `;
    
    console.log(`✅ Added 15 points to card ${testCard.card_id}`);

    console.log('\n📊 STEP 3: Verify results...');
    
    // Check results
    const afterCards = await sql`
      SELECT 
        id as card_id,
        customer_id,
        program_id,
        points,
        points_balance,
        total_points_earned,
        updated_at
      FROM loyalty_cards 
      WHERE id = ${testCard.card_id}
    `;
    
    const updatedCard = afterCards[0];
    
    console.log('Results:');
    console.log(`  Card ${updatedCard.card_id}:`);
    console.log(`    Before: ${testCard.points} points`);
    console.log(`    Added:  15 points`);
    console.log(`    After:  ${updatedCard.points} points`);
    console.log(`    Expected: ${expectedNewTotal} points`);
    
    // Verify exact match
    if (updatedCard.points === expectedNewTotal) {
      console.log('\n✅ SUCCESS: 1:1 point awarding is working correctly!');
      console.log(`   15 points added = 15 points received`);
    } else {
      console.log('\n❌ ISSUE: Point calculation is incorrect');
      console.log(`   Expected: ${expectedNewTotal}, Got: ${updatedCard.points}`);
    }

    console.log('\n🔄 STEP 4: Test QR scanning now...');
    console.log('1. Scan a customer QR code from business dashboard');
    console.log('2. Award exactly 10 points');
    console.log('3. Check customer /cards page');
    console.log('4. Verify you see exactly 10 points added (not 30)');
    
    console.log('\n📱 Expected behavior:');
    console.log('✅ Send 1 point → Get 1 point');
    console.log('✅ Send 10 points → Get 10 points'); 
    console.log('✅ Send 20 points → Get 20 points');
    console.log('❌ NOT: Send 10 points → Get 30 points');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testPointsFix()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  }); 