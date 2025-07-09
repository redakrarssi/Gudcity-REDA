import sql from './db';

/**
 * Execute a transaction with proper error handling
 * @param callback Function to execute within the transaction
 * @returns Result of the callback
 */
export async function withTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  // The type of tx is based on the SQL library being used
  // It should have commit and rollback methods
  const tx = await sql.begin();
  try {
    const result = await callback(tx);
    // Only call commit if tx has a commit method
    if (tx && typeof tx.commit === 'function') {
      await tx.commit();
    }
    return result;
  } catch (error) {
    // Only call rollback if tx has a rollback method
    if (tx && typeof tx.rollback === 'function') {
      await tx.rollback();
    }
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
): Promise<{ success: boolean; error?: string; details?: any }> {
  const diagnostics: any = {
    cardId,
    points,
    source,
    transactionRef,
    businessId,
    method: 'direct_sql',
    timestamp: new Date().toISOString()
  };
  
  try {
    // First verify that the card exists and has proper relationships
    try {
      const cardCheck = await sql`
        SELECT 
          lc.id, 
          lc.customer_id, 
          lc.business_id, 
          lc.program_id,
          lc.points,
          lc.points_balance
        FROM loyalty_cards lc
        WHERE lc.id = ${cardId}
      `;
      
      if (!cardCheck || cardCheck.length === 0) {
        const error = `Card ID ${cardId} not found in database`;
        console.error(error);
        return {
          success: false,
          error,
          details: { ...diagnostics, checkPerformed: 'card_existence' }
        };
      }
      
      diagnostics.cardDetails = {
        foundCard: true,
        customerId: cardCheck[0].customer_id,
        businessId: cardCheck[0].business_id,
        programId: cardCheck[0].program_id,
        currentPoints: cardCheck[0].points || 0,
        pointsBalance: cardCheck[0].points_balance || 0
      };
      
      // Verify business relationship if businessId is provided
      if (businessId && cardCheck[0].business_id != businessId) {
        const error = `Card ${cardId} belongs to business ${cardCheck[0].business_id}, not ${businessId}`;
        console.error(error);
        return {
          success: false,
          error,
          details: { ...diagnostics, checkPerformed: 'business_relationship' }
        };
      }
    } catch (verifyError) {
      console.error('Error verifying card relationships:', verifyError);
      diagnostics.verificationError = verifyError instanceof Error ? verifyError.message : String(verifyError);
      
      // Continue anyway - we'll try the update as a last resort
    }
    
    // Attempt the transaction
    try {
      const updateResult = await withTransaction(async (transaction) => {
        // First check if we can update the card
        const updateCheck = await transaction`
          SELECT EXISTS (
            SELECT 1 FROM loyalty_cards WHERE id = ${cardId}
          ) as exists_check
        `;
        
        if (!updateCheck[0].exists_check) {
          throw new Error(`Card ID ${cardId} not found during transaction`);
        }
        
        // Update card points balance directly
        const updateResult = await transaction`
          UPDATE loyalty_cards
          SET 
            points = COALESCE(points, 0) + ${points},
            points_balance = COALESCE(points_balance, 0) + ${points},
            total_points_earned = COALESCE(total_points_earned, 0) + ${points},
            updated_at = NOW()
          WHERE id = ${cardId}
          RETURNING id, points, points_balance
        `;
        
        if (!updateResult || updateResult.length === 0) {
          throw new Error('Card update failed - no rows affected');
        }
        
        diagnostics.updateResult = {
          id: updateResult[0].id,
          newPoints: updateResult[0].points,
          newPointsBalance: updateResult[0].points_balance
        };
        
        // Check if transaction table exists
        const tableCheck = await transaction`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'loyalty_transactions'
          ) as exists_check
        `;
        
        // Use the appropriate transaction table
        if (tableCheck[0].exists_check) {
          try {
            // Record the transaction directly
            const txResult = await transaction`
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
                ${transactionRef || `direct-${Date.now()}`},
                ${businessId || null},
                NOW()
              )
              RETURNING id
            `;
            
            diagnostics.transactionId = txResult[0]?.id;
          } catch (txError) {
            console.error('Failed to record transaction, but points were awarded:', txError);
            diagnostics.transactionError = txError instanceof Error ? txError.message : String(txError);
            // Continue anyway - the points were already awarded
          }
        } else {
          // Try card_activities as fallback
          try {
            await transaction`
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
                ${description},
                ${transactionRef || `direct-${Date.now()}`},
                NOW()
              )
            `;
            diagnostics.activityRecorded = true;
          } catch (activityError) {
            console.error('Failed to record card activity:', activityError);
            diagnostics.activityError = activityError instanceof Error ? activityError.message : String(activityError);
            // Continue anyway - the points were already awarded
          }
        }
        
        return true;
      });
      
      return {
        success: true,
        details: diagnostics
      };
    } catch (txError) {
      console.error('Transaction error in awardPointsDirectly:', txError);
      
      // Check for specific error types
      const errorMsg = txError instanceof Error ? txError.message : String(txError);
      let errorType = 'unknown';
      
      if (errorMsg.includes('foreign key constraint') || errorMsg.includes('violates foreign key')) {
        errorType = 'foreign_key_violation';
      } else if (errorMsg.includes('duplicate key') || errorMsg.includes('unique constraint')) {
        errorType = 'duplicate_key';
      } else if (errorMsg.includes('column') && errorMsg.includes('does not exist')) {
        errorType = 'schema_mismatch';
      } else if (errorMsg.includes('permission denied')) {
        errorType = 'permission_denied';
      }
      
      return {
        success: false,
        error: errorMsg,
        details: { 
          ...diagnostics, 
          errorType,
          sqlState: (txError as any)?.sqlState,
          code: (txError as any)?.code
        }
      };
    }
  } catch (error) {
    console.error('Unexpected error in awardPointsDirectly:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in awardPointsDirectly',
      details: { 
        ...diagnostics, 
        unexpectedError: true,
        stack: error instanceof Error ? error.stack : undefined
      }
    };
  }
} 