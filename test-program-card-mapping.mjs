/**
 * Test script to verify program-to-card mapping fix
 * This tests that when points are awarded to a program, 
 * the correct card ID is found and the customer dashboard is updated
 */

import { LoyaltyCardService } from './src/services/loyaltyCardService.js';

async function testProgramCardMapping() {
  console.log('=== TESTING PROGRAM-TO-CARD MAPPING ===');
  
  try {
    // Test case: Customer 4, Program 9 (from the user's notification)
    const customerId = '4';
    const programId = '9';
    
    console.log(`\nTesting mapping for Customer ${customerId}, Program ${programId}:`);
    
    // Get the card for this program
    const customerCard = await LoyaltyCardService.getCustomerCardForProgram(customerId, programId);
    
    if (customerCard) {
      console.log(`✅ Found card ID: ${customerCard.id}`);
      console.log(`   Current points: ${customerCard.points || customerCard.pointsBalance || 0}`);
      console.log(`   Program ID: ${customerCard.programId}`);
      console.log(`   Customer ID: ${customerCard.customerId}`);
      console.log(`   Program Name: ${customerCard.programName}`);
      console.log(`   Business Name: ${customerCard.businessName}`);
      
      // Verify the mapping
      if (customerCard.programId === programId && customerCard.customerId === customerId) {
        console.log('✅ Program-to-card mapping is CORRECT');
        
        // Test what happens when we trigger a refresh
        console.log('\nTesting refresh mechanism...');
        
        if (typeof window !== 'undefined') {
          // Simulate the notification update
          const updateData = {
            type: 'POINTS_ADDED',
            customerId,
            programId,
            programName: customerCard.programName,
            cardId: customerCard.id,
            points: 103, // From the user's notification
            timestamp: new Date().toISOString(),
            source: 'QR_AWARD'
          };
          
          // Set the localStorage flags that would be set by the notification system
          localStorage.setItem(`program_${programId}_points_updated`, JSON.stringify({
            customerId,
            cardId: customerCard.id,
            points: 103,
            timestamp: new Date().toISOString()
          }));
          
          localStorage.setItem(`card_${customerCard.id}_points_updated`, JSON.stringify({
            customerId,
            programId,
            points: 103,
            timestamp: new Date().toISOString()
          }));
          
          console.log('✅ localStorage flags set for program and card');
          console.log(`   Program flag: program_${programId}_points_updated`);
          console.log(`   Card flag: card_${customerCard.id}_points_updated`);
          
          // Trigger the events
          const events = [
            'program-points-updated',
            'card-update-required',
            'loyalty-cards-refresh'
          ];
          
          events.forEach(eventType => {
            const event = new CustomEvent(eventType, {
              detail: updateData
            });
            window.dispatchEvent(event);
            console.log(`✅ Dispatched ${eventType} event`);
          });
          
        } else {
          console.log('⚠️  Running in Node.js environment - cannot test browser events');
        }
        
      } else {
        console.log('❌ Program-to-card mapping is INCORRECT');
        console.log(`   Expected: Customer ${customerId}, Program ${programId}`);
        console.log(`   Got: Customer ${customerCard.customerId}, Program ${customerCard.programId}`);
      }
      
    } else {
      console.log(`❌ No card found for Customer ${customerId}, Program ${programId}`);
      
      // Let's see what cards this customer does have
      console.log('\nChecking all cards for this customer...');
      const allCards = await LoyaltyCardService.getCustomerCards(customerId);
      
      if (allCards.length > 0) {
        console.log(`Found ${allCards.length} cards for customer ${customerId}:`);
        allCards.forEach((card, index) => {
          console.log(`  Card ${index + 1}:`);
          console.log(`    ID: ${card.id}`);
          console.log(`    Program ID: ${card.programId}`);
          console.log(`    Program Name: ${card.programName}`);
          console.log(`    Points: ${card.points || 0}`);
        });
        
        // Check if program 9 exists in any of these cards
        const targetCard = allCards.find(card => card.programId === programId);
        if (targetCard) {
          console.log(`✅ Found target card! ID: ${targetCard.id}, Program: ${targetCard.programId}`);
        } else {
          console.log(`❌ Program ${programId} not found in customer's cards`);
        }
        
      } else {
        console.log(`❌ No cards found for customer ${customerId}`);
      }
    }
    
    console.log('\n=== TEST COMPLETED ===');
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Run the test
testProgramCardMapping(); 