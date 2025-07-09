import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database URL - use a placeholder for testing
// In a real environment, this would come from environment variables
const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || 
  'postgres://neondb_owner:password@ep-cool-forest-123456.us-east-2.aws.neon.tech/neondb';

console.log('Using database URL:', DATABASE_URL.substring(0, 20) + '...');

// Create SQL executor
const sql = neon(DATABASE_URL);

/**
 * Fix card relationships for card 17
 */
async function fixCardRelationship() {
  try {
    const cardId = 17;
    const customerId = 4;
    const businessId = 3;
    const programId = 12;
    
    console.log(`Fixing card ${cardId} relationships...`);
    
    // First check if the card exists
    const cardCheck = await sql`
      SELECT * FROM loyalty_cards WHERE id = ${cardId}
    `;
    
    if (!cardCheck || cardCheck.length === 0) {
      console.error(`Card ID ${cardId} not found in database`);
      return;
    }
    
    console.log('Card found:', cardCheck[0]);
    
    // Update card relationships
    const updateResult = await sql`
      UPDATE loyalty_cards
      SET 
        customer_id = ${customerId},
        business_id = ${businessId},
        program_id = ${programId}
      WHERE id = ${cardId}
      RETURNING id, customer_id, business_id, program_id
    `;
    
    console.log('Card relationships updated:', updateResult[0]);
    
    // Now try to award points
    const pointsToAward = 5;
    
    const pointsResult = await sql`
      UPDATE loyalty_cards
      SET 
        points = COALESCE(points, 0) + ${pointsToAward},
        points_balance = COALESCE(points_balance, 0) + ${pointsToAward},
        total_points_earned = COALESCE(total_points_earned, 0) + ${pointsToAward}
      WHERE id = ${cardId}
      RETURNING id, points, points_balance, total_points_earned
    `;
    
    console.log('Points awarded:', pointsResult[0]);
    
    // Try to record the transaction
    try {
      const transactionRef = `fix-${Date.now()}`;
      const txResult = await sql`
        INSERT INTO loyalty_transactions (
          card_id,
          transaction_type,
          points,
          source,
          description,
          transaction_ref,
          business_id,
          customer_id,
          program_id,
          created_at
        )
        VALUES (
          ${cardId},
          'CREDIT',
          ${pointsToAward},
          'FIX',
          'Points awarded by fix script',
          ${transactionRef},
          ${businessId},
          ${customerId},
          ${programId},
          NOW()
        )
        RETURNING id
      `;
      
      console.log('Transaction recorded:', txResult[0]);
    } catch (txError) {
      console.warn('Failed to record transaction (non-critical):', txError);
    }
    
    console.log('Fix completed successfully!');
  } catch (error) {
    console.error('Error fixing card relationship:', error);
  }
}

// Run the fix
fixCardRelationship().catch(console.error); 