import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

// Use the database URL from the environment or hardcode for testing purposes
// This is just for testing and follows the pattern in other files like fix-db-issues.mjs
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

// Create connection
const sql = neon(DATABASE_URL);

// Helper to generate a valid UUID
function generateUuid() {
  return crypto.randomUUID();
}

/**
 * Test points update functionality
 */
async function testPointsUpdate() {
  try {
    console.log("🧪 Testing points update functionality");
    
    // 1. Find an active customer and business
    console.log("\n1. Finding active customer and business...");
    const customer = await sql`
      SELECT id, name FROM users WHERE user_type = 'customer' LIMIT 1
    `;
    
    if (!customer.length) {
      console.error("❌ No customers found in database");
      process.exit(1);
    }
    
    const customerId = customer[0].id;
    console.log(`✅ Found customer: ${customer[0].name} (${customerId})`);
    
    const business = await sql`
      SELECT id, name FROM users WHERE user_type = 'business' LIMIT 1
    `;
    
    if (!business.length) {
      console.error("❌ No businesses found in database");
      process.exit(1);
    }
    
    const businessId = business[0].id;
    console.log(`✅ Found business: ${business[0].name} (${businessId})`);
    
    // 2. Find or create a loyalty program
    console.log("\n2. Finding or creating loyalty program...");
    let programId;
    let programName;
    
    const program = await sql`
      SELECT id, name FROM loyalty_programs 
      WHERE business_id = ${businessId} 
      LIMIT 1
    `;
    
    if (program.length) {
      programId = program[0].id;
      programName = program[0].name;
      console.log(`✅ Found existing program: ${programName} (${programId})`);
    } else {
      // Create a new program
      programName = `Test Program ${Date.now()}`;
      const newProgram = await sql`
        INSERT INTO loyalty_programs (
          business_id,
          name,
          description,
          type,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${businessId},
          ${programName},
          'Test program for points update',
          'POINTS',
          'ACTIVE',
          NOW(),
          NOW()
        ) RETURNING id
      `;
      
      programId = newProgram[0].id;
      console.log(`✅ Created new program: ${programName} (${programId})`);
    }
    
    // 3. Find or create a loyalty card
    console.log("\n3. Finding or creating loyalty card...");
    let cardId;
    
    const card = await sql`
      SELECT id, points FROM loyalty_cards
      WHERE customer_id = ${customerId}
      AND program_id = ${programId}
      LIMIT 1
    `;
    
    if (card.length) {
      cardId = card[0].id;
      const currentPoints = parseFloat(card[0].points) || 0;
      console.log(`✅ Found existing card: ${cardId} with ${currentPoints} points`);
    } else {
      // Create a new card
      // Get the next available ID for loyalty_cards
      const maxIdResult = await sql`
        SELECT MAX(id) + 1 AS next_id FROM loyalty_cards
      `;
      
      cardId = maxIdResult[0].next_id || 1;
      
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
          ${customerId},
          ${businessId},
          ${programId},
          'STANDARD',
          0,
          NOW(),
          NOW(),
          true,
          'active',
          'STANDARD'
        )
      `;
      console.log(`✅ Created new card: ${cardId} with 0 points`);
    }
    
    // 4. Check program enrollment
    console.log("\n4. Checking program enrollment...");
    
    const enrollment = await sql`
      SELECT * FROM program_enrollments
      WHERE customer_id = ${customerId.toString()}
      AND program_id = ${programId.toString()}
    `;
    
    if (enrollment.length) {
      const currentEnrollmentPoints = parseFloat(enrollment[0].current_points) || 0;
      console.log(`✅ Found existing enrollment with ${currentEnrollmentPoints} points`);
    } else {
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
          0,
          'ACTIVE',
          NOW(),
          NOW()
        )
      `;
      console.log(`✅ Created new enrollment with 0 points`);
    }
    
    // 5. Award points
    console.log("\n5. Awarding points...");
    const pointsToAward = 13; // The exact amount mentioned in the requirement
    
    // Update loyalty card
    await sql`
      UPDATE loyalty_cards
      SET 
        points = COALESCE(points, 0) + ${pointsToAward},
        updated_at = NOW()
      WHERE id = ${cardId}
    `;
    
    // Update enrollment
    await sql`
      UPDATE program_enrollments
      SET 
        current_points = current_points + ${pointsToAward},
        last_activity = NOW()
      WHERE customer_id = ${customerId.toString()}
      AND program_id = ${programId.toString()}
    `;
    
    console.log(`✅ Awarded ${pointsToAward} points`);
    
    // 6. Create notification
    console.log("\n6. Creating notification...");
    const notificationId = generateUuid();
    
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
        ${`You've received ${pointsToAward} points from ${business[0].name} in the program ${programName}`},
        ${JSON.stringify({
          points: pointsToAward,
          cardId,
          programId,
          programName,
          businessName: business[0].name,
          source: 'TEST',
          timestamp: new Date().toISOString()
        })},
        false,
        false,
        false,
        ${new Date().toISOString()}
      )
    `;
    
    console.log(`✅ Created notification: ${notificationId}`);
    
    // 7. Verify points were updated
    console.log("\n7. Verifying points update...");
    
    const updatedCard = await sql`
      SELECT points FROM loyalty_cards WHERE id = ${cardId}
    `;
    
    if (updatedCard.length) {
      const newPoints = parseFloat(updatedCard[0].points) || 0;
      console.log(`✅ Card now has ${newPoints} points`);
    } else {
      console.error("❌ Card not found after update");
    }
    
    const updatedEnrollment = await sql`
      SELECT current_points FROM program_enrollments
      WHERE customer_id = ${customerId.toString()}
      AND program_id = ${programId.toString()}
    `;
    
    if (updatedEnrollment.length) {
      const newEnrollmentPoints = parseFloat(updatedEnrollment[0].current_points) || 0;
      console.log(`✅ Enrollment now has ${newEnrollmentPoints} points`);
    } else {
      console.error("❌ Enrollment not found after update");
    }
    
    console.log("\n🎉 Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Run the test
testPointsUpdate().catch(console.error); 