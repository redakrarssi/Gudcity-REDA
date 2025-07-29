/**
 * ENSURE CARD EXISTS UTILITY
 * 
 * This utility ensures that a loyalty card exists for any customer-program combination
 * before awarding points. This fixes the root cause of points not showing in customer dashboard.
 */

import sql from './db';
import { LoyaltyCardService } from '../services/loyaltyCardService';

export interface CardEnsureResult {
  success: boolean;
  cardId: string | null;
  created: boolean;
  error?: string;
}

/**
 * Ensures a loyalty card exists for a customer-program combination
 * Creates the card if it doesn't exist
 */
export async function ensureCardExists(
  customerId: string | number,
  programId: string | number,
  businessId?: string | number
): Promise<CardEnsureResult> {
  try {
    const customerIdStr = String(customerId);
    const programIdNum = parseInt(String(programId), 10);
    const customerIdNum = parseInt(customerIdStr, 10);
    
    console.log(`Ensuring card exists for customer ${customerIdStr}, program ${programIdNum}`);
    
    // Step 1: Check if card already exists
    const existingCards = await sql`
      SELECT id, customer_id, program_id, points, points_balance
      FROM loyalty_cards 
      WHERE (customer_id = ${customerIdNum} OR customer_id = ${customerIdStr})
      AND program_id = ${programIdNum}
      AND is_active = true
    `;
    
    if (existingCards.length > 0) {
      const card = existingCards[0];
      console.log(`✅ Card already exists: ID ${card.id}, Points: ${card.points || 0}`);
      return {
        success: true,
        cardId: card.id?.toString() || '',
        created: false
      };
    }
    
    console.log('⚠️ No card found, creating new card...');
    
    // Step 2: Get program details to create card
    const programDetails = await sql`
      SELECT id, business_id, name 
      FROM loyalty_programs 
      WHERE id = ${programIdNum}
    `;
    
    if (programDetails.length === 0) {
      return {
        success: false,
        cardId: null,
        created: false,
        error: `Program ${programIdNum} not found`
      };
    }
    
    const program = programDetails[0];
    const actualBusinessId = businessId || program?.business_id;
    
    // Step 3: Ensure customer is enrolled in the program
    await ensureCustomerEnrolled(customerIdStr, programIdNum);
    
    // Step 4: Create the loyalty card
    const newCards = await sql`
      INSERT INTO loyalty_cards (
        customer_id,
        business_id,
        program_id,
        points,
        points_balance,
        total_points_earned,
        card_type,
        is_active,
        status,
        tier,
        created_at,
        updated_at
      ) VALUES (
        ${customerIdNum},
        ${actualBusinessId},
        ${programIdNum},
        0,
        0,
        0,
        'STANDARD',
        true,
        'ACTIVE',
        'STANDARD',
        NOW(),
        NOW()
      )
      RETURNING id
    `;
    
    if (newCards.length > 0) {
      const newCardId = newCards[0]?.id?.toString() || '';
      console.log(`✅ Created new card: ID ${newCardId} for customer ${customerIdStr}, program ${programIdNum}`);
      
      return {
        success: true,
        cardId: newCardId,
        created: true
      };
    } else {
      return {
        success: false,
        cardId: null,
        created: false,
        error: 'Failed to create card'
      };
    }
    
  } catch (error) {
    console.error('Error ensuring card exists:', error);
    return {
      success: false,
      cardId: null,
      created: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Ensures customer is enrolled in the program
 */
async function ensureCustomerEnrolled(
  customerId: string,
  programId: number
): Promise<void> {
  try {
    // Check if enrollment exists
    const existingEnrollments = await sql`
      SELECT * FROM customer_programs 
      WHERE customer_id = ${customerId} 
      AND program_id = ${programId}
    `;
    
    if (existingEnrollments.length === 0) {
      console.log(`Enrolling customer ${customerId} in program ${programId}`);
      
      // Create enrollment
      await sql`
        INSERT INTO customer_programs (
          customer_id,
          program_id,
          current_points,
          enrolled_at,
          created_at
        ) VALUES (
          ${customerId},
          ${programId},
          0,
          NOW(),
          NOW()
        )
        ON CONFLICT (customer_id, program_id) DO NOTHING
      `;
      
      console.log(`✅ Customer ${customerId} enrolled in program ${programId}`);
    } else {
      console.log(`✅ Customer ${customerId} already enrolled in program ${programId}`);
    }
  } catch (error) {
    console.warn('Error ensuring customer enrollment:', error);
    // Don't throw - enrollment might not be required for card creation
  }
}

/**
 * Award points to a card, ensuring the card exists first
 */
export async function awardPointsWithCardCreation(
  customerId: string | number,
  programId: string | number,
  points: number,
  businessId?: string | number,
  description: string = 'Points awarded',
  source: string = 'DIRECT'
): Promise<{ success: boolean; cardId?: string; error?: string }> {
  try {
    console.log(`Awarding ${points} points to customer ${customerId}, program ${programId}`);
    
    // Step 1: Ensure card exists
    const cardResult = await ensureCardExists(customerId, programId, businessId);
    
    if (!cardResult.success || !cardResult.cardId) {
      return {
        success: false,
        error: cardResult.error || 'Failed to ensure card exists'
      };
    }
    
    const cardId = cardResult.cardId;
    console.log(`Using card ID: ${cardId}`);
    
    // Step 2: Award points to the card (FIXED: only main points column)
    const updateResult = await sql`
      UPDATE loyalty_cards
      SET 
        points = COALESCE(points, 0) + ${points},
        updated_at = NOW()
      WHERE id = ${cardId}
      RETURNING id, points
    `;
    
    if (updateResult.length > 0) {
      const updatedCard = updateResult[0];
      console.log(`✅ Points awarded successfully: Card ${cardId} now has ${updatedCard.points} points`);
      
      // Step 3: Update customer_programs table as well
      try {
        await sql`
          UPDATE customer_programs
          SET 
            current_points = COALESCE(current_points, 0) + ${points},
            updated_at = NOW()
          WHERE customer_id = ${String(customerId)}
          AND program_id = ${parseInt(String(programId), 10)}
        `;
        console.log('✅ Customer programs table updated');
      } catch (programUpdateError) {
        console.warn('Warning: Failed to update customer_programs table:', programUpdateError);
        // Don't fail the whole operation for this
      }
      
      return {
        success: true,
        cardId
      };
    } else {
      return {
        success: false,
        error: 'Failed to update card with points'
      };
    }
    
  } catch (error) {
    console.error('Error awarding points with card creation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 