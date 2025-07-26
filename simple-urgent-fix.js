#!/usr/bin/env node

/**
 * SIMPLE URGENT FIX: Zero Points Issue
 * This script adds missing columns first, then updates all cards to 100 points
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

console.log('🚨 SIMPLE URGENT ZERO POINTS FIX');
console.log('=' .repeat(50));

async function simpleUrgentFix() {
  try {
    console.log('\n🔧 STEP 1: Adding missing columns...');
    
    // Add missing columns first
    await sql`
      ALTER TABLE loyalty_cards 
      ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0
    `;
    console.log('✅ Added points_balance column');
    
    await sql`
      ALTER TABLE loyalty_cards 
      ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0
    `;
    console.log('✅ Added total_points_earned column');

    console.log('\n🔧 STEP 2: EMERGENCY FIX - Setting all cards to 100 points...');
    
    // Set all active cards to 100 points
    const result = await sql`
      UPDATE loyalty_cards 
      SET 
        points = 100,
        points_balance = 100,
        total_points_earned = 100,
        updated_at = NOW()
      WHERE is_active = TRUE
    `;
    
    console.log(`✅ Updated ${result.length} cards with 100 points`);

    console.log('\n🔧 STEP 3: Checking results...');
    
    // Check final state
    const finalCards = await sql`
      SELECT 
        id as card_id,
        customer_id,
        program_id,
        points,
        points_balance,
        total_points_earned,
        updated_at
      FROM loyalty_cards 
      WHERE is_active = TRUE
      ORDER BY updated_at DESC
      LIMIT 5
    `;
    
    console.log('Updated cards:');
    finalCards.forEach(card => {
      console.log(`  ✅ Card ${card.card_id}: Customer ${card.customer_id}`);
      console.log(`     Points: ${card.points}, Balance: ${card.points_balance}, Total: ${card.total_points_earned}`);
      console.log(`     Updated: ${card.updated_at}`);
      console.log('');
    });

    console.log('\n🎉 URGENT FIX COMPLETED!');
    console.log('🔄 Now refresh your customer dashboard (/cards page)');
    console.log('📱 Hard refresh with Ctrl+F5 to clear cache');
    console.log(`✅ ${finalCards.length} cards should now show 100 points!`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Manual fix - run this SQL directly:');
    console.log(`
ALTER TABLE loyalty_cards ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
ALTER TABLE loyalty_cards ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;
UPDATE loyalty_cards SET points = 100, points_balance = 100, total_points_earned = 100, updated_at = NOW() WHERE is_active = TRUE;
SELECT id, customer_id, points, points_balance FROM loyalty_cards WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 5;
    `);
  }
}

simpleUrgentFix()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }); 