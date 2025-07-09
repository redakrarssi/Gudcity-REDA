// Import database connection
import { createPool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection
const sql = createPool({
  connectionString: process.env.VITE_DATABASE_URL || process.env.DATABASE_URL
});

/**
 * Direct SQL function to award points to a card
 */
async function awardPointsDirectSQL(cardId, points) {
  console.log(`Attempting to award ${points} points to card ${cardId} directly...`);
  
  try {
    // First check if the card exists
    const cardCheck = await sql`
      SELECT * FROM loyalty_cards WHERE id = ${cardId}
    `;
    
    if (!cardCheck || cardCheck.length === 0) {
      console.error(`Card ID ${cardId} not found in database`);
      return { success: false, error: 'Card not found' };
    }
    
    console.log('Card found:', cardCheck[0]);
    
    // Update card points
    const updateResult = await sql`
      UPDATE loyalty_cards
      SET 
        points = COALESCE(points, 0) + ${points},
        points_balance = COALESCE(points_balance, 0) + ${points},
        total_points_earned = COALESCE(total_points_earned, 0) + ${points},
        updated_at = NOW()
      WHERE id = ${cardId}
      RETURNING id, points, points_balance, total_points_earned
    `;
    
    if (!updateResult || updateResult.length === 0) {
      console.error('Failed to update card points');
      return { success: false, error: 'Failed to update points' };
    }
    
    console.log('Card updated:', updateResult[0]);
    
    // Try to record the transaction
    try {
      const transactionRef = `test-${Date.now()}`;
      const txResult = await sql`
        INSERT INTO loyalty_transactions (
          card_id,
          transaction_type,
          points,
          source,
          description,
          transaction_ref,
          created_at
        )
        VALUES (
          ${cardId},
          'CREDIT',
          ${points},
          'TEST',
          'Test points award',
          ${transactionRef},
          NOW()
        )
        RETURNING id
      `;
      
      console.log('Transaction recorded:', txResult[0]);
    } catch (txError) {
      console.warn('Failed to record transaction (non-critical):', txError);
      
      // Try card_activities as fallback
      try {
        const activityRef = `test-${Date.now()}`;
        await sql`
          INSERT INTO card_activities (
            card_id,
            activity_type,
            points,
            description,
            transaction_reference,
            created_at
          )
          VALUES (
            ${cardId},
            'EARN_POINTS',
            ${points},
            'Test points award',
            ${activityRef},
            NOW()
          )
        `;
        console.log('Card activity recorded');
      } catch (activityError) {
        console.warn('Failed to record card activity (non-critical):', activityError);
      }
    }
    
    return { 
      success: true, 
      cardId,
      points: updateResult[0].points,
      pointsBalance: updateResult[0].points_balance,
      totalPointsEarned: updateResult[0].total_points_earned
    };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Diagnose card relationships
 */
async function diagnoseCard(cardId, customerId, businessId, programId) {
  console.log(`Diagnosing card ${cardId} relationships...`);
  
  try {
    // Check if card exists
    const cardCheck = await sql`
      SELECT 
        lc.id, 
        lc.customer_id,
        lc.business_id,
        lc.program_id,
        lc.points,
        lc.points_balance,
        lc.total_points_earned,
        lp.name as program_name,
        u.name as business_name,
        c.name as customer_name
      FROM loyalty_cards lc
      LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
      LEFT JOIN customers c ON lc.customer_id = c.id
      LEFT JOIN users u ON lp.business_id = u.id
      WHERE lc.id = ${cardId}
    `;
    
    if (!cardCheck || cardCheck.length === 0) {
      console.error(`Card ID ${cardId} not found in database`);
      return { success: false, error: 'Card not found' };
    }
    
    const card = cardCheck[0];
    console.log('Card details:', card);
    
    // Check customer relationship
    const customerMatch = customerId ? 
      card.customer_id == customerId : true;
    
    // Check business relationship
    const businessMatch = businessId ? 
      card.business_id == businessId : true;
    
    // Check program relationship
    const programMatch = programId ? 
      card.program_id == programId : true;
    
    // Check enrollment
    let enrollmentCheck = null;
    if (customerId && programId) {
      try {
        enrollmentCheck = await sql`
          SELECT * FROM customer_programs 
          WHERE customer_id = ${customerId}
          AND program_id = ${programId}
        `;
        console.log('Enrollment check:', enrollmentCheck.length ? 'Enrolled' : 'Not enrolled');
      } catch (err) {
        console.error('Error checking enrollment:', err);
      }
    }
    
    return {
      success: customerMatch && businessMatch && programMatch,
      cardExists: true,
      customerMatch,
      businessMatch,
      programMatch,
      card: {
        id: card.id,
        customerId: card.customer_id,
        businessId: card.business_id,
        programId: card.program_id,
        points: card.points || 0,
        pointsBalance: card.points_balance || card.points || 0,
        totalPointsEarned: card.total_points_earned || 0
      }
    };
  } catch (error) {
    console.error('Error diagnosing card:', error);
    return { 
      success: false, 
      error: error.message || String(error) 
    };
  }
}

/**
 * Fix card relationship issues
 */
async function fixCardRelationship(cardId, customerId, businessId, programId) {
  console.log(`Attempting to fix card ${cardId} relationships...`);
  
  try {
    // First diagnose the issue
    const diagnosis = await diagnoseCard(cardId, customerId, businessId, programId);
    
    if (diagnosis.success) {
      console.log('No relationship issues found, card is correctly mapped');
      return { success: true, fixed: false, message: 'No fix needed' };
    }
    
    // Fix customer relationship if needed
    if (!diagnosis.customerMatch && customerId) {
      console.log(`Updating customer relationship: ${diagnosis.card.customerId} -> ${customerId}`);
      await sql`
        UPDATE loyalty_cards
        SET customer_id = ${customerId}
        WHERE id = ${cardId}
      `;
    }
    
    // Fix business relationship if needed
    if (!diagnosis.businessMatch && businessId) {
      console.log(`Updating business relationship: ${diagnosis.card.businessId} -> ${businessId}`);
      await sql`
        UPDATE loyalty_cards
        SET business_id = ${businessId}
        WHERE id = ${cardId}
      `;
    }
    
    // Fix program relationship if needed
    if (!diagnosis.programMatch && programId) {
      console.log(`Updating program relationship: ${diagnosis.card.programId} -> ${programId}`);
      await sql`
        UPDATE loyalty_cards
        SET program_id = ${programId}
        WHERE id = ${cardId}
      `;
    }
    
    // Verify the fix worked
    const verifyDiagnosis = await diagnoseCard(cardId, customerId, businessId, programId);
    
    return {
      success: verifyDiagnosis.success,
      fixed: verifyDiagnosis.success !== diagnosis.success,
      message: verifyDiagnosis.success ? 'Card relationships fixed' : 'Failed to fix card relationships'
    };
  } catch (error) {
    console.error('Error fixing card relationship:', error);
    return { 
      success: false, 
      fixed: false,
      error: error.message || String(error) 
    };
  }
}

/**
 * Main function to run tests
 */
async function main() {
  try {
    // Configuration
    const cardId = 17;
    const customerId = 4;
    const businessId = 3;
    const programId = 12;
    const pointsToAward = 5;
    
    console.log('=== CARD DIAGNOSTICS AND POINTS AWARD TEST ===');
    console.log(`Testing card ${cardId} for customer ${customerId}, business ${businessId}, program ${programId}`);
    
    // Step 1: Diagnose the card issue
    console.log('\n1. Running card diagnostics...');
    const diagnosis = await diagnoseCard(cardId, customerId, businessId, programId);
    console.log('Diagnosis result:', diagnosis);
    
    // Step 2: If there's an issue, try to fix it
    if (!diagnosis.success) {
      console.log('\n2. Card has relationship issues, attempting fix...');
      const fixResult = await fixCardRelationship(cardId, customerId, businessId, programId);
      console.log('Fix result:', fixResult);
    } else {
      console.log('\n2. Card relationships are correct, no fix needed');
    }
    
    // Step 3: Award points directly
    console.log('\n3. Attempting to award points...');
    const awardResult = await awardPointsDirectSQL(cardId, pointsToAward);
    console.log('Award result:', awardResult);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
main().catch(console.error); 