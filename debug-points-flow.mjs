/**
 * COMPREHENSIVE POINTS FLOW DEBUGGER
 * This script traces the entire flow from awarding points to displaying them
 * to find exactly where the breakdown is happening
 */

import sql from './src/utils/db.ts';

async function debugPointsFlow() {
  console.log('🔍 COMPREHENSIVE POINTS FLOW DIAGNOSIS');
  console.log('=====================================\n');
  
  try {
    // Test with the specific case: Customer 4, Program 9, Card 22
    const customerId = '4';
    const programId = '9';
    const cardId = '22';
    const testPoints = 50; // Test amount
    
    console.log(`Testing with Customer ${customerId}, Program ${programId}, Card ${cardId}`);
    console.log(`Test points: ${testPoints}\n`);
    
    // STEP 1: Check initial state
    console.log('📊 STEP 1: INITIAL STATE CHECK');
    console.log('==============================');
    
    // Check loyalty_cards table
    const currentCard = await sql`
      SELECT * FROM loyalty_cards 
      WHERE (customer_id = ${customerId} OR customer_id = ${parseInt(customerId)})
      AND (program_id = ${programId} OR program_id = ${parseInt(programId)})
    `;
    
    console.log('Current card state:');
    if (currentCard.length > 0) {
      const card = currentCard[0];
      console.log(`  Card ID: ${card.id}`);
      console.log(`  Customer ID: ${card.customer_id} (${typeof card.customer_id})`);
      console.log(`  Program ID: ${card.program_id} (${typeof card.program_id})`);
      console.log(`  Points: ${card.points}`);
      console.log(`  Points Balance: ${card.points_balance || 'N/A'}`);
      console.log(`  Total Points Earned: ${card.total_points_earned || 'N/A'}`);
    } else {
      console.log('  ❌ No card found! This is the problem.');
      
      // Check what cards exist for this customer
      const customerCards = await sql`
        SELECT * FROM loyalty_cards 
        WHERE customer_id = ${customerId} OR customer_id = ${parseInt(customerId)}
      `;
      
      console.log(`\n  Customer ${customerId} has ${customerCards.length} cards:`);
      customerCards.forEach((card, index) => {
        console.log(`    Card ${index + 1}: ID=${card.id}, Program=${card.program_id}, Points=${card.points}`);
      });
    }
    
    // STEP 2: Award test points directly to database
    console.log('\n💰 STEP 2: AWARD TEST POINTS');
    console.log('=============================');
    
    const initialPoints = currentCard.length > 0 ? currentCard[0].points : 0;
    console.log(`Initial points: ${initialPoints}`);
    
    if (currentCard.length > 0) {
      const actualCardId = currentCard[0].id;
      
      // Direct database update
      const updateResult = await sql`
        UPDATE loyalty_cards
        SET 
          points = COALESCE(points, 0) + ${testPoints},
          points_balance = COALESCE(points_balance, points, 0) + ${testPoints},
          total_points_earned = COALESCE(total_points_earned, points, 0) + ${testPoints},
          updated_at = NOW()
        WHERE id = ${actualCardId}
        RETURNING *
      `;
      
      if (updateResult.length > 0) {
        const updatedCard = updateResult[0];
        console.log('✅ Points awarded successfully');
        console.log(`  New points: ${updatedCard.points}`);
        console.log(`  New points_balance: ${updatedCard.points_balance || 'N/A'}`);
        console.log(`  New total_points_earned: ${updatedCard.total_points_earned || 'N/A'}`);
      } else {
        console.log('❌ Failed to update card');
      }
    } else {
      console.log('❌ Cannot award points - no card found');
    }
    
    // STEP 3: Check what the customer dashboard query returns
    console.log('\n🖥️  STEP 3: CUSTOMER DASHBOARD QUERY TEST');
    console.log('=========================================');
    
    // This is the exact query from LoyaltyCardService.getCustomerCards
    const customerIdInt = parseInt(customerId.toString(), 10);
    const customerIdStr = customerId.toString();
    
    console.log(`Query parameters: customerIdInt=${customerIdInt}, customerIdStr="${customerIdStr}"`);
    
    const dashboardCards = await sql`
      SELECT 
        lc.*,
        lp.name as program_name,
        lp.description as program_description,
        lp.type as program_type,
        lp.points_per_dollar,
        lp.points_expiry_days,
        u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN users u ON lp.business_id = u.id
      WHERE (lc.customer_id = ${customerIdInt} OR lc.customer_id = ${customerIdStr})
      ORDER BY lc.created_at DESC
    `;
    
    console.log(`Dashboard query returned ${dashboardCards.length} cards:`);
    dashboardCards.forEach((card, index) => {
      console.log(`  Card ${index + 1}:`);
      console.log(`    ID: ${card.id}`);
      console.log(`    Program: ${card.program_name} (ID: ${card.program_id})`);
      console.log(`    Points: ${card.points}`);
      console.log(`    Points Balance: ${card.points_balance || 'N/A'}`);
      console.log(`    Customer ID: ${card.customer_id} (${typeof card.customer_id})`);
    });
    
    // Find the specific program 9 card
    const targetCard = dashboardCards.find(card => 
      card.program_id == programId || card.program_id == parseInt(programId)
    );
    
    if (targetCard) {
      console.log(`\n✅ Found target card for program ${programId}:`);
      console.log(`  Card ID: ${targetCard.id}`);
      console.log(`  Points: ${targetCard.points}`);
      console.log(`  This is what the customer dashboard should show`);
    } else {
      console.log(`\n❌ Target card for program ${programId} not found in dashboard query`);
    }
    
    // STEP 4: Check customer_programs table
    console.log('\n📋 STEP 4: CUSTOMER_PROGRAMS TABLE CHECK');
    console.log('========================================');
    
    const customerPrograms = await sql`
      SELECT * FROM customer_programs 
      WHERE customer_id = ${customerId} AND program_id = ${programId}
    `;
    
    if (customerPrograms.length > 0) {
      const program = customerPrograms[0];
      console.log('Customer program enrollment:');
      console.log(`  Customer ID: ${program.customer_id} (${typeof program.customer_id})`);
      console.log(`  Program ID: ${program.program_id} (${typeof program.program_id})`);
      console.log(`  Current Points: ${program.current_points || 'N/A'}`);
    } else {
      console.log('❌ Customer is not enrolled in this program');
    }
    
    // STEP 5: Check table schemas for type mismatches
    console.log('\n🔧 STEP 5: SCHEMA TYPE ANALYSIS');
    console.log('================================');
    
    const loyaltyCardsSchema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'loyalty_cards' 
      AND column_name IN ('id', 'customer_id', 'program_id', 'points', 'points_balance')
      ORDER BY column_name
    `;
    
    console.log('loyalty_cards table schema:');
    loyaltyCardsSchema.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // STEP 6: Recommendations
    console.log('\n💡 STEP 6: DIAGNOSIS & RECOMMENDATIONS');
    console.log('======================================');
    
    if (currentCard.length === 0) {
      console.log('🚨 ROOT CAUSE: No card found for this customer-program combination');
      console.log('   SOLUTION: Create the missing card or fix the customer-program mapping');
    } else if (targetCard && targetCard.points > 0) {
      console.log('✅ DATABASE: Points are correctly stored in the database');
      console.log('🚨 ISSUE: Problem is in the frontend refresh/query system');
    } else {
      console.log('🚨 DATABASE ISSUE: Points are not being properly stored or retrieved');
    }
    
    console.log('\n=== DIAGNOSIS COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error in diagnosis:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the diagnosis
debugPointsFlow(); 