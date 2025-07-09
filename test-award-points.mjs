import { createPool } from '@vercel/postgres';
import { diagnoseCardIssue, attemptCardFix } from './src/utils/cardDiagnostics.js';

// Create database connection
const sql = createPool({
  connectionString: process.env.POSTGRES_URL
});

/**
 * Direct SQL function to award points to a card
 */
async function awardPointsDirectSQL(cardId, points, customerId, businessId, programId) {
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
    
    // Record transaction
    try {
      const txResult = await sql`
        INSERT INTO loyalty_transactions (
          card_id,
          transaction_type,
          points,
          source,
          description,
          transaction_ref,
          business_id,
          created_at,
          customer_id,
          program_id
        )
        VALUES (
          ${cardId},
          'CREDIT',
          ${points},
          'TEST',
          'Test points award',
          ${`test-${Date.now()}`},
          ${businessId},
          NOW(),
          ${customerId},
          ${programId}
        )
        RETURNING id
      `;
      
      console.log('Transaction recorded:', txResult[0]);
    } catch (txError) {
      console.warn('Failed to record transaction (non-critical):', txError.message);
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
    return { success: false, error: error.message };
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
    
    console.log('=== CARD DIAGNOSTICS TEST ===');
    console.log(`Testing card ${cardId} for customer ${customerId}, business ${businessId}, program ${programId}`);
    
    // Step 1: Diagnose the card issue
    console.log('\n1. Running card diagnostics...');
    const diagnosis = await diagnoseCardIssue(cardId, customerId, businessId, programId);
    console.log('Diagnosis result:', JSON.stringify(diagnosis, null, 2));
    
    // Step 2: If there's an issue, try to fix it
    if (!diagnosis.success) {
      console.log('\n2. Card has relationship issues, attempting fix...');
      const fixResult = await attemptCardFix(cardId, customerId, businessId, programId);
      console.log('Fix result:', JSON.stringify(fixResult, null, 2));
    } else {
      console.log('\n2. Card relationships are correct, no fix needed');
    }
    
    // Step 3: Award points directly
    console.log('\n3. Attempting to award points...');
    const awardResult = await awardPointsDirectSQL(cardId, pointsToAward, customerId, businessId, programId);
    console.log('Award result:', JSON.stringify(awardResult, null, 2));
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close database connection
    await sql.end();
  }
}

// Run the test
main().catch(console.error); 