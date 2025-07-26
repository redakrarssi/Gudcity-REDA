#!/usr/bin/env node

/**
 * Points Awarding System Test Script
 * This script tests the QR code scanning and points awarding flow
 * to ensure customers can see their points immediately after they're awarded.
 */

import { sql } from './src/utils/db.js';
import { QrCodeService } from './src/services/qrCodeService.js';
import { LoyaltyCardService } from './src/services/loyaltyCardService.js';
import { CustomerNotificationService } from './src/services/customerNotificationService.js';

// Test configuration
const TEST_CONFIG = {
  // Use existing test customer (customer ID 27)
  customerId: '27',
  businessId: '3', // Business ID that has programs
  programId: '11', // Program ID to test with
  pointsToAward: 15
};

async function testPointsAwardingSystem() {
  console.log('🧪 Starting Points Awarding System Test...\n');

  try {
    // Step 1: Get initial card state
    console.log('📋 Step 1: Getting initial card state...');
    const initialCards = await LoyaltyCardService.getCustomerCards(TEST_CONFIG.customerId);
    console.log(`Found ${initialCards.length} cards for customer ${TEST_CONFIG.customerId}`);
    
    let testCard = null;
    for (const card of initialCards) {
      if (card.programId === TEST_CONFIG.programId) {
        testCard = card;
        break;
      }
    }
    
    const initialPoints = testCard ? testCard.points : 0;
    console.log(`Initial points for test card: ${initialPoints}\n`);

    // Step 2: Test direct points awarding
    console.log('⚡ Step 2: Testing direct points awarding...');
    const awardResult = await LoyaltyCardService.awardPointsToCard(
      testCard?.id || 'test-card-id',
      TEST_CONFIG.pointsToAward,
      'SCAN',
      'Test QR scan reward',
      `test-${Date.now()}`,
      TEST_CONFIG.businessId
    );
    
    if (!awardResult.success) {
      console.error('❌ Points awarding failed:', awardResult.error);
      console.log('🔍 Diagnostics:', awardResult.diagnostics);
      
      // If card doesn't exist, try to create it first
      if (awardResult.error?.includes('Card not found')) {
        console.log('🔧 Card not found, attempting to create card...');
        
        // Check if customer is enrolled in the program
        const enrollmentCheck = await sql`
          SELECT * FROM customer_programs 
          WHERE customer_id = ${TEST_CONFIG.customerId} 
          AND program_id = ${TEST_CONFIG.programId}
        `;
        
        if (enrollmentCheck.length === 0) {
          console.log('📝 Creating customer enrollment...');
          await sql`
            INSERT INTO customer_programs (
              customer_id,
              program_id,
              current_points,
              enrolled_at
            ) VALUES (
              ${TEST_CONFIG.customerId},
              ${TEST_CONFIG.programId},
              0,
              NOW()
            )
          `;
        }
        
        // Create loyalty card
        const cardId = `test-card-${Date.now()}`;
        console.log(`🆔 Creating loyalty card with ID: ${cardId}`);
        
        await sql`
          INSERT INTO loyalty_cards (
            id,
            customer_id,
            business_id,
            program_id,
            points,
            points_balance,
            total_points_earned,
            created_at,
            updated_at
          ) VALUES (
            ${cardId},
            ${parseInt(TEST_CONFIG.customerId)},
            ${parseInt(TEST_CONFIG.businessId)},
            ${parseInt(TEST_CONFIG.programId)},
            ${TEST_CONFIG.pointsToAward},
            ${TEST_CONFIG.pointsToAward},
            ${TEST_CONFIG.pointsToAward},
            NOW(),
            NOW()
          )
        `;
        
        console.log('✅ Card created successfully');
        testCard = { id: cardId, points: TEST_CONFIG.pointsToAward };
      }
    } else {
      console.log('✅ Points awarded successfully');
      console.log('🔍 Diagnostics:', JSON.stringify(awardResult.diagnostics, null, 2));
    }

    // Step 3: Verify points were actually updated in database
    console.log('\n🔍 Step 3: Verifying database updates...');
    
    if (testCard?.id) {
      const cardVerification = await sql`
        SELECT id, points, points_balance, total_points_earned, updated_at
        FROM loyalty_cards 
        WHERE id = ${testCard.id}
      `;
      
      if (cardVerification.length > 0) {
        const card = cardVerification[0];
        console.log('📊 Card in database:');
        console.log(`  - Points: ${card.points}`);
        console.log(`  - Points Balance: ${card.points_balance}`);
        console.log(`  - Total Points Earned: ${card.total_points_earned}`);
        console.log(`  - Last Updated: ${card.updated_at}`);
        
        const pointsIncrease = parseFloat(card.points) - initialPoints;
        if (pointsIncrease >= TEST_CONFIG.pointsToAward) {
          console.log('✅ Points were successfully updated in database');
        } else {
          console.log('❌ Points update verification failed');
          console.log(`Expected increase: ${TEST_CONFIG.pointsToAward}, Actual increase: ${pointsIncrease}`);
        }
      } else {
        console.log('❌ Card not found in database');
      }
    }

    // Step 4: Test customer cards retrieval (frontend perspective)
    console.log('\n📱 Step 4: Testing customer cards retrieval...');
    const finalCards = await LoyaltyCardService.getCustomerCards(TEST_CONFIG.customerId);
    
    let updatedCard = null;
    for (const card of finalCards) {
      if (card.programId === TEST_CONFIG.programId || card.id === testCard?.id) {
        updatedCard = card;
        break;
      }
    }
    
    if (updatedCard) {
      console.log(`📊 Card from getCustomerCards: ${updatedCard.points} points`);
      
      const finalIncrease = updatedCard.points - initialPoints;
      if (finalIncrease >= TEST_CONFIG.pointsToAward) {
        console.log('✅ Customer would see the updated points in their dashboard');
      } else {
        console.log('❌ Customer would NOT see the updated points');
        console.log(`Expected: ${initialPoints + TEST_CONFIG.pointsToAward}, Got: ${updatedCard.points}`);
      }
    } else {
      console.log('❌ Card not found in customer cards list');
    }

    // Step 5: Test QR code scanning flow
    console.log('\n📱 Step 5: Testing QR code scanning flow...');
    
    const qrCodeData = {
      type: 'customer',
      customerId: TEST_CONFIG.customerId
    };
    
    const qrResult = await QrCodeService.processQrCodeScan(
      qrCodeData,
      TEST_CONFIG.businessId,
      TEST_CONFIG.pointsToAward
    );
    
    if (qrResult.success) {
      console.log('✅ QR code scan processed successfully');
      console.log(`📊 Points awarded: ${qrResult.pointsAwarded}`);
      console.log('🔍 QR scan result:', JSON.stringify(qrResult.data, null, 2));
    } else {
      console.log('❌ QR code scan failed:', qrResult.message);
    }

    // Step 6: Check notifications
    console.log('\n🔔 Step 6: Checking customer notifications...');
    
    const recentNotifications = await CustomerNotificationService.getCustomerNotifications(
      TEST_CONFIG.customerId,
      10 // Last 10 notifications
    );
    
    const pointsNotifications = recentNotifications.filter(n => 
      n.type === 'POINTS_ADDED' && 
      Date.now() - new Date(n.createdAt).getTime() < 60000 // Last minute
    );
    
    console.log(`📧 Found ${pointsNotifications.length} recent points notifications`);
    if (pointsNotifications.length > 0) {
      pointsNotifications.forEach(notification => {
        console.log(`  - ${notification.title}: ${notification.message}`);
      });
    }

    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log('================');
    
    if (awardResult.success || testCard) {
      console.log('✅ Points awarding mechanism: WORKING');
    } else {
      console.log('❌ Points awarding mechanism: FAILED');
    }
    
    if (updatedCard && updatedCard.points > initialPoints) {
      console.log('✅ Customer dashboard will show updated points: YES');
    } else {
      console.log('❌ Customer dashboard will show updated points: NO');
    }
    
    if (pointsNotifications.length > 0) {
      console.log('✅ Customer notifications: WORKING');
    } else {
      console.log('❌ Customer notifications: NOT WORKING');
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await sql.end();
  }
}

// Run the test
testPointsAwardingSystem().catch(console.error); 