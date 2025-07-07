import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 10
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test script for verifying QR code point awarding system
 * 
 * This script performs the following tests:
 * 1. Verify customer exists
 * 2. Verify business exists
 * 3. Verify loyalty programs exist
 * 4. Check enrollment status
 * 5. Create enrollment if needed
 * 6. Verify loyalty card exists
 * 7. Create loyalty card if needed
 * 8. Test awarding points
 */
async function main() {
  try {
    // Configuration
    const TEST_CUSTOMER_ID = process.argv[2] || '4';
    const TEST_BUSINESS_ID = process.argv[3] || '2';
    const TEST_PROGRAM_ID = process.argv[4];
    
    console.log('=== QR Code Points System Verification ===');
    console.log(`Testing with Customer ID: ${TEST_CUSTOMER_ID}, Business ID: ${TEST_BUSINESS_ID}`);
    
    // Step 1: Verify customer exists
    console.log('\n1. Verifying customer...');
    const customer = await sql`
      SELECT id, name, email, user_type FROM users 
      WHERE id = ${TEST_CUSTOMER_ID} AND user_type = 'customer'
    `;
    
    if (customer.length === 0) {
      console.error('❌ Customer not found!');
      return;
    }
    
    console.log(`✅ Customer found: ${customer[0].name} (${customer[0].email})`);
    
    // Step 2: Verify business exists
    console.log('\n2. Verifying business...');
    const business = await sql`
      SELECT id, name, email FROM users 
      WHERE id = ${TEST_BUSINESS_ID} AND user_type = 'business'
    `;
    
    if (business.length === 0) {
      console.error('❌ Business not found!');
      return;
    }
    
    console.log(`✅ Business found: ${business[0].name}`);
    
    // Step 3: Check loyalty programs
    console.log('\n3. Checking loyalty programs...');
    const programs = await sql`
      SELECT id, name, description, status, welcome_points
      FROM loyalty_programs
      WHERE business_id = ${TEST_BUSINESS_ID} AND status = 'active'
    `;
    
    if (programs.length === 0) {
      console.error('❌ No active loyalty programs found for this business!');
      return;
    }
    
    console.log(`✅ Found ${programs.length} active loyalty programs:`);
    programs.forEach(program => {
      console.log(`   - ${program.name} (ID: ${program.id})`);
    });
    
    // Use first program if none specified
    const programId = TEST_PROGRAM_ID || programs[0].id;
    console.log(`\nUsing program ID: ${programId}`);
    
    // Step 4: Check enrollment status
    console.log('\n4. Checking enrollment status...');
    const enrollments = await sql`
      SELECT * FROM program_enrollments
      WHERE customer_id = ${TEST_CUSTOMER_ID}
      AND program_id = ${programId}
      AND status = 'ACTIVE'
    `;
    
    let isEnrolled = enrollments.length > 0;
    console.log(`Enrollment status: ${isEnrolled ? '✅ Enrolled' : '❌ Not enrolled'}`);
    
    // Step 5: Create enrollment if needed
    if (!isEnrolled) {
      console.log('\n5. Creating enrollment...');
      try {
        await sql`
          INSERT INTO program_enrollments (
            customer_id, program_id, status, 
            current_points, total_points_earned, 
            created_at, updated_at
          )
          VALUES (
            ${TEST_CUSTOMER_ID}, ${programId}, 'ACTIVE',
            0, 0,
            NOW(), NOW()
          )
          ON CONFLICT (customer_id, program_id) 
          DO UPDATE SET 
            status = 'ACTIVE',
            updated_at = NOW()
        `;
        console.log('✅ Enrollment created or updated successfully');
        isEnrolled = true;
      } catch (error) {
        console.error('❌ Failed to create enrollment:', error.message);
      }
    } else {
      console.log('\n5. Enrollment already exists, skipping creation');
    }
    
    // Step 6: Check for loyalty card
    console.log('\n6. Checking loyalty card...');
    const cards = await sql`
      SELECT * FROM loyalty_cards
      WHERE customer_id = ${TEST_CUSTOMER_ID}
      AND business_id = ${TEST_BUSINESS_ID}
      AND program_id = ${programId}
      AND is_active = true
    `;
    
    let cardId = null;
    if (cards.length > 0) {
      cardId = cards[0].id;
      console.log(`✅ Loyalty card exists, ID: ${cardId}`);
      console.log(`   Current points: ${cards[0].points_balance || cards[0].points || 0}`);
    } else {
      console.log('❌ No active loyalty card found');
    }
    
    // Step 7: Create card if needed
    if (!cardId) {
      console.log('\n7. Creating loyalty card...');
      try {
        // Generate a unique card number
        const cardNumber = `TEST-${Math.floor(100000 + Math.random() * 900000)}-QR`;
        
        const cardResult = await sql`
          INSERT INTO loyalty_cards (
            customer_id, business_id, program_id, card_number,
            points, points_balance, total_points_earned,
            tier, is_active, created_at, updated_at
          ) VALUES (
            ${TEST_CUSTOMER_ID}, ${TEST_BUSINESS_ID}, ${programId}, ${cardNumber},
            0, 0, 0, 'STANDARD', true, NOW(), NOW()
          ) RETURNING id
        `;
        
        if (cardResult.length > 0) {
          cardId = cardResult[0].id;
          console.log(`✅ Loyalty card created, ID: ${cardId}`);
        } else {
          console.error('❌ Failed to create loyalty card - no ID returned');
        }
      } catch (error) {
        console.error('❌ Failed to create loyalty card:', error.message);
      }
    } else {
      console.log('\n7. Card already exists, skipping creation');
    }
    
    // Step 8: Test awarding points
    if (cardId) {
      console.log('\n8. Testing point awarding...');
      const testPoints = 5;
      
      try {
        // Start transaction
        const transaction = await sql.begin();
        
        try {
          // Update card points balance
          await transaction`
            UPDATE loyalty_cards
            SET 
              points_balance = points_balance + ${testPoints},
              points = points + ${testPoints},
              total_points_earned = total_points_earned + ${testPoints},
              updated_at = NOW()
            WHERE id = ${cardId}
          `;

          // Record the transaction
          await transaction`
            INSERT INTO loyalty_transactions (
              card_id,
              transaction_type,
              points,
              source,
              description,
              created_at
            )
            VALUES (
              ${cardId},
              'CREDIT',
              ${testPoints},
              'SCAN',
              'Test QR code scan points',
              NOW()
            )
          `;

          // Commit transaction
          await transaction.commit();
          console.log(`✅ Successfully awarded ${testPoints} points to card ${cardId}`);
          
          // Verify updated balance
          const updatedCard = await sql`
            SELECT points_balance, points FROM loyalty_cards WHERE id = ${cardId}
          `;
          
          if (updatedCard.length > 0) {
            console.log(`   New points balance: ${updatedCard[0].points_balance || updatedCard[0].points || 0}`);
          }
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      } catch (error) {
        console.error(`❌ Error awarding points:`, error.message);
      }
    } else {
      console.error('\n8. Cannot test point awarding - no valid card ID');
    }
    
    // Final status
    console.log('\n=== Summary ===');
    console.log(`Customer: ${customer[0].name} (ID: ${TEST_CUSTOMER_ID})`);
    console.log(`Business: ${business[0].name} (ID: ${TEST_BUSINESS_ID})`);
    console.log(`Program ID: ${programId}`);
    console.log(`Card ID: ${cardId || 'None'}`);
    console.log(`Enrollment Status: ${isEnrolled ? 'Enrolled' : 'Not enrolled'}`);
    
    if (cardId) {
      // Final card check
      const finalCard = await sql`
        SELECT points_balance, points, total_points_earned
        FROM loyalty_cards WHERE id = ${cardId}
      `;
      
      if (finalCard.length > 0) {
        console.log(`Points Balance: ${finalCard[0].points_balance || finalCard[0].points || 0}`);
        console.log(`Total Points Earned: ${finalCard[0].total_points_earned || 0}`);
      }
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Close database connection
    await sql.end();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 