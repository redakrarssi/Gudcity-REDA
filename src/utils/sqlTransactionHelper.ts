import sql from './db';

/**
 * Execute a transaction with proper error handling
 * @param callback Function to execute within the transaction
 * @returns Result of the callback
 */
export async function withTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  const tx = await sql.begin();
  try {
    const result = await callback(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

/**
 * Award points to a card using a direct SQL transaction
 */
export async function awardPointsDirectly(
  cardId: string,
  points: number,
  source: string,
  description: string = '',
  transactionRef: string = '',
  businessId: string = ''
): Promise<boolean> {
  try {
    return await withTransaction(async (transaction) => {
      // Update card points balance directly
      await transaction`
        UPDATE loyalty_cards
        SET 
          points = COALESCE(points, 0) + ${points},
          points_balance = COALESCE(points_balance, 0) + ${points},
          total_points_earned = COALESCE(total_points_earned, 0) + ${points},
          updated_at = NOW()
        WHERE id = ${cardId}
      `;
      
      // Record the transaction directly
      await transaction`
        INSERT INTO loyalty_transactions (
          card_id,
          transaction_type,
          points,
          source,
          description,
          transaction_ref,
          business_id,
          created_at
        )
        VALUES (
          ${cardId},
          'CREDIT',
          ${points},
          ${source},
          ${description},
          ${transactionRef},
          ${businessId || null},
          NOW()
        )
      `;
      
      return true;
    });
  } catch (error) {
    console.error('Error in awardPointsDirectly:', error);
    return false;
  }
} 