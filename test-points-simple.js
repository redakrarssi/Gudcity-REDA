/**
 * Simple test script for points update functionality
 * 
 * This script makes direct SQL updates to:
 * 1. Add points to a customer's card
 * 2. Add a notification in the notifications table
 * 
 * To run:
 * node test-points-simple.js <customerId> <businessId> <programId> <points>
 */

// Import DB
const { neon } = require('@neondatabase/serverless');

// Use the database URL from the environment or hardcode for testing purposes
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """;

// Create connection
const sql = neon(DATABASE_URL);

// Get parameters
const customerId = process.argv[2] || '1';
const businessId = process.argv[3] || '2';
const programId = process.argv[4] || '1';
const points = parseInt(process.argv[5] || '10');

async function main() {
  try {
    console.log('=== Simple Points Update Test ===');
    console.log(`Adding ${points} points to customer ${customerId} in program ${programId} from business ${businessId}`);
    
    // Get business and program names
    const business = await sql`SELECT name FROM users WHERE id = ${businessId}`;
    const program = await sql`SELECT name FROM loyalty_programs WHERE id = ${programId}`;
    
    const businessName = business[0]?.name || 'Business';
    const programName = program[0]?.name || 'Loyalty Program';
    
    console.log(`Business: ${businessName}`);
    console.log(`Program: ${programName}`);
    
    // Check if the customer has an existing card
    const card = await sql`
      SELECT id, points 
      FROM loyalty_cards 
      WHERE customer_id = ${customerId} 
      AND program_id = ${programId} 
      AND business_id = ${businessId}
    `;
    
    let cardId;
    let currentPoints = 0;
    
    if (card.length > 0) {
      // Card exists, update it
      cardId = card[0].id;
      currentPoints = parseFloat(card[0].points || '0');
      const newPoints = currentPoints + points;
      
      console.log(`Existing card found: ID ${cardId} with ${currentPoints} points`);
      console.log(`Updating to ${newPoints} points...`);
      
      await sql`
        UPDATE loyalty_cards
        SET points = ${newPoints}, updated_at = NOW()
        WHERE id = ${cardId}
      `;
    } else {
      // Create a new card
      // Get next available ID
      const maxId = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM loyalty_cards`;
      cardId = maxId[0].next_id;
      
      console.log(`No existing card found, creating new card with ID ${cardId} and ${points} points...`);
      
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
          ${cardId},
          ${parseInt(customerId)},
          ${parseInt(businessId)},
          ${parseInt(programId)},
          'STANDARD',
          ${points},
          NOW(),
          NOW(),
          true,
          'active',
          'STANDARD'
        )
      `;
    }
    
    // Update program enrollment
    const enrollment = await sql`
      SELECT * FROM program_enrollments
      WHERE customer_id = ${customerId.toString()}
      AND program_id = ${programId.toString()}
    `;
    
    if (enrollment.length > 0) {
      const newPoints = currentPoints + points;
      
      console.log(`Updating program enrollment to ${newPoints} points...`);
      
      await sql`
        UPDATE program_enrollments
        SET current_points = ${newPoints}, last_activity = NOW()
        WHERE customer_id = ${customerId.toString()}
        AND program_id = ${programId.toString()}
      `;
    } else {
      console.log(`Creating new program enrollment with ${points} points...`);
      
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
          ${points},
          'ACTIVE',
          NOW(),
          NOW()
        )
      `;
    }
    
    // Create notification
    console.log('Creating notification...');
    
    const uuid = require('crypto').randomUUID();
    
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
        ${uuid},
        ${parseInt(customerId)},
        ${parseInt(businessId)},
        'POINTS_ADDED',
        'Points Added',
        ${`You've received ${points} points from ${businessName} in the program ${programName}`},
        ${JSON.stringify({
          points,
          cardId,
          programId,
          programName,
          businessName,
          timestamp: new Date().toISOString()
        })},
        false,
        false,
        false,
        NOW()
      )
    `;
    
    console.log('Done! Points added successfully.');
    console.log(`Notification created with ID: ${uuid}`);
    
    // Verify the update
    const updated = await sql`
      SELECT points FROM loyalty_cards WHERE id = ${cardId}
    `;
    
    console.log(`\nVerification: Card now has ${updated[0].points} points.`);
    console.log('\nNow go to the customer dashboard to see if the update appears!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error); 