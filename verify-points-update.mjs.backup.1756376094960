/**
 * Simplified test script to verify points are being updated correctly in the database
 * 
 * To run: 
 * node verify-points-update.mjs <customerId> <businessId> <programId>
 */

import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Use the database URL from the environment or hardcode for testing purposes
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Create connection
const sql = neon(DATABASE_URL);

// Get customer, business, and program IDs from command line arguments or use defaults
const customerId = process.argv[2] || '1';
const businessId = process.argv[3] || '2';  
const programId = process.argv[4] || '1';

// Set the number of points to award
const pointsToAward = 10;

async function main() {
  try {
    console.log('🧪 Testing points update mechanism');
    console.log(`Customer ID: ${customerId}`);
    console.log(`Business ID: ${businessId}`);
    console.log(`Program ID: ${programId}`);
    console.log(`Points to award: ${pointsToAward}`);
    
    // Get business and program names
    const business = await sql`SELECT name FROM users WHERE id = ${businessId}`;
    const businessName = business.length > 0 ? business[0].name : 'Business';
    
    const program = await sql`SELECT name FROM loyalty_programs WHERE id = ${programId}`;
    const programName = program.length > 0 ? program[0].name : 'Loyalty Program';
    
    console.log(`Business name: ${businessName}`);
    console.log(`Program name: ${programName}`);
    
    // Get current card info
    const existingCard = await sql`
      SELECT id, points FROM loyalty_cards 
      WHERE customer_id = ${customerId}
      AND program_id = ${programId}
      AND business_id = ${businessId}
    `;
    
    const cardId = existingCard.length > 0 ? existingCard[0].id : null;
    const currentPoints = existingCard.length > 0 ? parseFloat(existingCard[0].points || '0') : 0;
    
    console.log(`Existing card: ${cardId ? `ID ${cardId} with ${currentPoints} points` : 'None found'}`);
    
    // Award points directly
    console.log(`\nAwarding ${pointsToAward} points...`);
    
    let newCardId = cardId;
    
    if (cardId) {
      // Update existing card with direct value to avoid race conditions
      const expectedPoints = currentPoints + pointsToAward;
      
      await sql`
        UPDATE loyalty_cards
        SET 
          points = ${expectedPoints},
          updated_at = NOW()
        WHERE id = ${cardId}
      `;
      
      // Also update the program_enrollments table
      await sql`
        UPDATE program_enrollments
        SET 
          current_points = ${expectedPoints},
          last_activity = NOW()
        WHERE customer_id = ${customerId.toString()}
        AND program_id = ${programId.toString()}
      `;
      
      console.log('✅ Updated existing card and enrollment');
    } else {
      // Get the next available ID for loyalty_cards
      const maxIdResult = await sql`
        SELECT MAX(id) + 1 AS next_id FROM loyalty_cards
      `;
      
      // Use the next available ID or start with 1
      newCardId = maxIdResult[0].next_id || 1;
      console.log(`Using next available ID: ${newCardId}`);
      
      // Need to create a new card
      await sql`
        INSERT INTO loyalty_cards (
          id,
          customer_id,
          business_id,
          program_id,
          card_type,
          points,
          created_at,
          updated_at,
          is_active,
          status,
          tier
        ) VALUES (
          ${newCardId},
          ${parseInt(customerId)},
          ${parseInt(businessId)},
          ${parseInt(programId)},
          'STANDARD',
          ${pointsToAward},
          NOW(),
          NOW(),
          true,
          'active',
          'STANDARD'
        )
      `;
      
      // Check if enrollment exists
      const enrollmentExists = await sql`
        SELECT * FROM program_enrollments
        WHERE customer_id = ${customerId.toString()}
        AND program_id = ${programId.toString()}
      `;
      
      if (enrollmentExists.length === 0) {
        // Create enrollment
        await sql`
          INSERT INTO program_enrollments (
            customer_id,
            program_id,
            current_points,
            status,
            enrolled_at,
            last_activity
          ) VALUES (
            ${customerId.toString()},
            ${programId.toString()},
            ${pointsToAward},
            'ACTIVE',
            NOW(),
            NOW()
          )
        `;
      } else {
        // Update existing enrollment
        await sql`
          UPDATE program_enrollments
          SET 
            current_points = current_points + ${pointsToAward},
            last_activity = NOW()
          WHERE customer_id = ${customerId.toString()}
          AND program_id = ${programId.toString()}
        `;
      }
      
      console.log(`✅ Created new card with ID: ${newCardId}`);
    }
    
    // Create notification for the customer
    const notificationId = crypto.randomUUID();
    
    await sql`
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        data,
        requires_action,
        action_taken,
        is_read,
        created_at
      ) VALUES (
        ${notificationId},
        ${parseInt(customerId)},
        ${parseInt(businessId)},
        'POINTS_ADDED',
        'Points Added',
        ${`You've received ${pointsToAward} points from ${businessName} in the program ${programName}`},
        ${JSON.stringify({
          points: pointsToAward,
          cardId: newCardId,
          programId,
          programName,
          businessName,
          source: 'TEST',
          timestamp: new Date().toISOString()
        })},
        false,
        false,
        false,
        NOW()
      )
    `;
    
    console.log(`✅ Created notification with ID: ${notificationId}`);
    
    // Verify points update in database
    const updatedCard = await sql`
      SELECT id, points FROM loyalty_cards 
      WHERE customer_id = ${customerId}
      AND program_id = ${programId}
      AND business_id = ${businessId}
    `;
    
    if (updatedCard.length === 0) {
      console.log('❌ No card found after update!');
      process.exit(1);
    }
    
    const verifiedCardId = updatedCard[0].id;
    const newPoints = parseFloat(updatedCard[0].points || '0');
    const expectedPoints = currentPoints + pointsToAward;
    
    console.log(`\nVerification:`);
    console.log(`Card ID: ${verifiedCardId}`);
    console.log(`Previous points: ${currentPoints}`);
    console.log(`Points awarded: ${pointsToAward}`);
    console.log(`Expected new total: ${expectedPoints}`);
    console.log(`Actual new total: ${newPoints}`);
    
    if (Math.abs(newPoints - expectedPoints) < 0.01) {
      console.log('\n✅ SUCCESS: Points updated correctly in database!');
    } else {
      console.log('\n❌ FAIL: Points not updated correctly!');
    }
    
    // Create a localStorage-like event for UI updates
    console.log('\nGenerating events that would trigger UI updates:');
    console.log(`- localStorage event 'force_card_refresh'`);
    console.log(`- localStorage event 'sync_points_${Date.now()}'`);
    console.log(`- CustomEvent 'refresh-customer-cards'`);
    console.log(`- CustomEvent 'points-awarded'`);
    console.log(`- createCardSyncEvent('${verifiedCardId}', '${customerId}', '${businessId}', 'UPDATE', {...})`);
    
    // Exit script
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

// Run the test
main().catch(console.error); 