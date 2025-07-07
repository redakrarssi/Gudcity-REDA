import sql from './db';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { CustomerService } from '../services/customerService';
import { toast } from 'react-hot-toast';

/**
 * A utility to diagnose and fix point awarding issues
 * Can be called directly from the application to test the point awarding process
 */
export const testPointAwarding = async (
  customerId: string,
  businessId: string,
  programId?: string,
  pointsToAward: number = 5
): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  console.log('=== QR Code Points System Test ===');
  console.log(`Testing with Customer ID: ${customerId}, Business ID: ${businessId}`);
  
  try {
    // Step 1: Verify customer exists
    console.log('\n1. Verifying customer...');
    const customer = await sql`
      SELECT id, name, email, user_type FROM users 
      WHERE id = ${customerId} AND user_type = 'customer'
    `;
    
    if (customer.length === 0) {
      return { success: false, message: 'Customer not found' };
    }
    
    console.log(`✅ Customer found: ${customer[0].name}`);
    
    // Step 2: Verify business exists
    console.log('\n2. Verifying business...');
    const business = await sql`
      SELECT id, name FROM users 
      WHERE id = ${businessId} AND user_type = 'business'
    `;
    
    if (business.length === 0) {
      return { success: false, message: 'Business not found' };
    }
    
    console.log(`✅ Business found: ${business[0].name}`);
    
    // Step 3: Check loyalty programs
    console.log('\n3. Checking loyalty programs...');
    const programs = await sql`
      SELECT id, name, description, status
      FROM loyalty_programs
      WHERE business_id = ${businessId} AND status = 'active'
    `;
    
    if (programs.length === 0) {
      return { success: false, message: 'No active loyalty programs found for this business' };
    }
    
    console.log(`✅ Found ${programs.length} active loyalty programs`);
    
    // Use specified program ID or first available program
    const selectedProgramId = programId || programs[0].id;
    console.log(`Using program ID: ${selectedProgramId}`);
    
    // Step 4: Check enrollment status
    console.log('\n4. Checking enrollment status...');
    const enrollmentStatus = await CustomerService.getCustomerEnrollmentStatus(customerId, businessId);
    console.log('Enrollment status:', enrollmentStatus);
    
    let cardId = null;
    let enrollmentCreated = false;
    let cardCreated = false;
    
    // Step 5: Check if customer has a card for this program
    console.log('\n5. Checking for loyalty card...');
    let card = await LoyaltyCardService.getCustomerCard(customerId, businessId);
    
    // If no card found with the standard method, try a direct query
    if (!card) {
      console.log('No card found with standard method, trying direct query...');
      const cardResults = await sql`
        SELECT * FROM loyalty_cards
        WHERE customer_id = ${customerId}
        AND business_id = ${businessId}
        AND program_id = ${selectedProgramId}
        AND is_active = true
      `;
      
      if (cardResults.length > 0) {
        cardId = cardResults[0].id;
        console.log(`✅ Found card with direct query, ID: ${cardId}`);
      } else {
        console.log('No card found with direct query either');
      }
    } else {
      cardId = card.id;
      console.log(`✅ Found card, ID: ${cardId}`);
    }
    
    // Step 6: If not enrolled, create enrollment
    if (!enrollmentStatus.isEnrolled) {
      console.log('\n6. Creating enrollment...');
      try {
        await sql`
          INSERT INTO program_enrollments (
            customer_id, program_id, status, 
            current_points, total_points_earned, 
            created_at, updated_at
          )
          VALUES (
            ${customerId}, ${selectedProgramId}, 'ACTIVE',
            0, 0,
            NOW(), NOW()
          )
          ON CONFLICT (customer_id, program_id) 
          DO UPDATE SET 
            status = 'ACTIVE',
            updated_at = NOW()
        `;
        console.log('✅ Enrollment created successfully');
        enrollmentCreated = true;
      } catch (error) {
        console.error('❌ Failed to create enrollment:', error);
        return { 
          success: false, 
          message: 'Failed to create enrollment',
          details: error 
        };
      }
    }
    
    // Step 7: If no card, create one
    if (!cardId) {
      console.log('\n7. Creating loyalty card...');
      try {
        // Generate a unique card number
        const cardNumber = `GC-${Math.floor(100000 + Math.random() * 900000)}-C`;
        
        const cardResult = await sql`
          INSERT INTO loyalty_cards (
            customer_id, business_id, program_id, card_number,
            points, points_balance, total_points_earned,
            tier, is_active, created_at, updated_at
          ) VALUES (
            ${customerId}, ${businessId}, ${selectedProgramId}, ${cardNumber},
            0, 0, 0, 'STANDARD', true, NOW(), NOW()
          ) RETURNING id
        `;
        
        if (cardResult.length > 0) {
          cardId = cardResult[0].id;
          console.log(`✅ Card created, ID: ${cardId}`);
          cardCreated = true;
        } else {
          console.error('❌ Failed to create card - no ID returned');
          return { 
            success: false, 
            message: 'Failed to create loyalty card' 
          };
        }
      } catch (error) {
        console.error('❌ Failed to create card:', error);
        return { 
          success: false, 
          message: 'Failed to create loyalty card',
          details: error 
        };
      }
    }
    
    // Step 8: Award points
    if (cardId) {
      console.log(`\n8. Awarding ${pointsToAward} points to card ${cardId}...`);
      
      try {
        // Try using the service method first
        const success = await LoyaltyCardService.awardPointsToCard(
          cardId.toString(),
          pointsToAward,
          'TEST',
          'Test points awarded by diagnostic tool',
          `test-${Date.now()}`,
          businessId
        );
        
        if (success) {
          console.log('✅ Points awarded successfully via service');
        } else {
          console.log('❌ Service method failed, trying direct SQL approach');
          
          // Try direct SQL approach as fallback
          const transaction = await sql.begin();
          
          try {
            // Update card points balance
            await transaction`
              UPDATE loyalty_cards
              SET 
                points_balance = points_balance + ${pointsToAward},
                points = points + ${pointsToAward},
                total_points_earned = total_points_earned + ${pointsToAward},
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
                ${pointsToAward},
                'TEST',
                'Test points awarded by diagnostic tool',
                NOW()
              )
            `;
            
            // Commit transaction
            await transaction.commit();
            console.log('✅ Points awarded successfully via direct SQL');
            
            return {
              success: true,
              message: `Successfully awarded ${pointsToAward} points to customer`,
              details: {
                customerId,
                businessId,
                programId: selectedProgramId,
                cardId,
                points: pointsToAward,
                enrollmentCreated,
                cardCreated
              }
            };
          } catch (error) {
            await transaction.rollback();
            throw error;
          }
        }
        
        return {
          success: true,
          message: `Successfully awarded ${pointsToAward} points to customer`,
          details: {
            customerId,
            businessId,
            programId: selectedProgramId,
            cardId,
            points: pointsToAward,
            enrollmentCreated,
            cardCreated
          }
        };
      } catch (error) {
        console.error('❌ Error awarding points:', error);
        return { 
          success: false, 
          message: 'Failed to award points', 
          details: error
        };
      }
    } else {
      return { 
        success: false, 
        message: 'No valid card ID available for awarding points' 
      };
    }
  } catch (error) {
    console.error('Test failed with error:', error);
    return { 
      success: false, 
      message: 'Test failed with error', 
      details: error 
    };
  }
}; 