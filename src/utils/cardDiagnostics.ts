import sql from './db';
// Import console logger instead of a custom logger
const logger = {
  info: console.info,
  warn: console.warn,
  error: console.error
};

/**
 * Diagnoses issues with a loyalty card by checking database relationships
 * @param cardId The ID of the card to diagnose
 * @param customerId The customer ID to verify
 * @param businessId The business ID to verify
 * @param programId The program ID to verify
 * @returns Diagnostic information about the card and its relationships
 */
export async function diagnoseCardIssue(
  cardId: string | number,
  customerId?: string | number,
  businessId?: string | number,
  programId?: string | number
): Promise<{
  success: boolean;
  cardExists: boolean;
  customerMatch: boolean;
  businessMatch: boolean;
  programMatch: boolean;
  details: any;
  error?: string;
}> {
  try {
    logger.info(`Diagnosing card issue for card ${cardId}`);
    
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
        lc.created_at,
        lc.updated_at,
        lp.name as program_name,
        lp.status as program_status,
        c.name as customer_name,
        c.email as customer_email,
        u.name as business_name
      FROM loyalty_cards lc
      LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
      LEFT JOIN customers c ON lc.customer_id = c.id
      LEFT JOIN users u ON lp.business_id = u.id
      WHERE lc.id = ${cardId}
    `;
    
    if (!cardCheck || cardCheck.length === 0) {
      return {
        success: false,
        cardExists: false,
        customerMatch: false,
        businessMatch: false,
        programMatch: false,
        details: { error: `Card ID ${cardId} not found in database` },
        error: `Card ID ${cardId} not found in database`
      };
    }
    
    const card = cardCheck[0];
    
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
      } catch (err) {
        logger.error('Error checking enrollment:', err);
      }
    }
    
    // Check transaction history
    let transactions: any[] = [];
    try {
      transactions = await sql`
        SELECT * FROM loyalty_transactions
        WHERE card_id = ${cardId}
        ORDER BY created_at DESC
        LIMIT 5
      `;
    } catch (err) {
      logger.warn('Error fetching transactions (table may not exist):', err);
      
      // Try card_activities as fallback
      try {
        transactions = await sql`
          SELECT * FROM card_activities
          WHERE card_id = ${cardId}
          ORDER BY created_at DESC
          LIMIT 5
        `;
      } catch (actErr) {
        logger.warn('Error fetching card activities:', actErr);
      }
    }
    
    // Check for duplicate transaction references
    let duplicateCheck = null;
    const transactionRef = `qr-scan-${Date.now()}`;
    try {
      duplicateCheck = await sql`
        SELECT EXISTS (
          SELECT 1 FROM loyalty_transactions
          WHERE transaction_ref LIKE 'qr-scan-%'
          AND card_id = ${cardId}
          AND created_at > NOW() - INTERVAL '1 day'
        ) as has_recent_transactions
      `;
    } catch (err) {
      logger.warn('Error checking for duplicate transactions:', err);
    }
    
    // Format the response
    return {
      success: customerMatch && businessMatch && programMatch,
      cardExists: true,
      customerMatch,
      businessMatch,
      programMatch,
      details: {
        card: {
          id: card.id,
          customerId: card.customer_id,
          businessId: card.business_id,
          programId: card.program_id,
          points: card.points || 0,
          pointsBalance: card.points_balance || card.points || 0,
          totalPointsEarned: card.total_points_earned || 0,
          createdAt: card.created_at,
          updatedAt: card.updated_at
        },
        program: {
          name: card.program_name,
          status: card.program_status
        },
        customer: {
          name: card.customer_name,
          email: card.customer_email
        },
        business: {
          name: card.business_name
        },
        enrollment: enrollmentCheck ? {
          exists: enrollmentCheck.length > 0,
          details: enrollmentCheck.length > 0 ? enrollmentCheck[0] : null
        } : null,
        transactions: {
          history: transactions,
          count: transactions.length,
          hasDuplicates: duplicateCheck ? duplicateCheck[0].has_recent_transactions : null
        }
      }
    };
  } catch (error) {
    logger.error('Error diagnosing card issue:', error);
    return {
      success: false,
      cardExists: false,
      customerMatch: false,
      businessMatch: false,
      programMatch: false,
      details: { error: error instanceof Error ? error.message : String(error) },
      error: error instanceof Error ? error.message : 'Unknown error diagnosing card issue'
    };
  }
}

/**
 * Attempts to fix common card issues
 * @param cardId The ID of the card to fix
 * @param customerId The customer ID to associate with the card
 * @param businessId The business ID to associate with the card
 * @param programId The program ID to associate with the card
 * @returns Result of the fix attempt
 */
export async function attemptCardFix(
  cardId: string | number,
  customerId: string | number,
  businessId: string | number,
  programId: string | number
): Promise<{
  success: boolean;
  fixed: boolean;
  action?: string;
  details?: any;
  error?: string;
}> {
  try {
    // First diagnose the issue
    const diagnosis = await diagnoseCardIssue(cardId, customerId, businessId, programId);
    
    if (!diagnosis.cardExists) {
      return {
        success: false,
        fixed: false,
        error: 'Card does not exist and cannot be fixed',
        details: diagnosis.details
      };
    }
    
    // If everything matches, no fix needed
    if (diagnosis.success) {
      return {
        success: true,
        fixed: false,
        action: 'No fix needed - all relationships are correct',
        details: diagnosis.details
      };
    }
    
    // Try to fix customer relationship if needed
    if (!diagnosis.customerMatch && customerId) {
      try {
        await sql`
          UPDATE loyalty_cards
          SET customer_id = ${customerId}
          WHERE id = ${cardId}
        `;
        return {
          success: true,
          fixed: true,
          action: 'Updated customer relationship',
          details: {
            ...diagnosis.details,
            fixApplied: 'customer_relationship'
          }
        };
      } catch (err) {
        logger.error('Error fixing customer relationship:', err);
        return {
          success: false,
          fixed: false,
          error: 'Failed to update customer relationship',
          details: {
            ...diagnosis.details,
            fixError: err instanceof Error ? err.message : String(err)
          }
        };
      }
    }
    
    // Try to fix program relationship if needed
    if (!diagnosis.programMatch && programId) {
      try {
        await sql`
          UPDATE loyalty_cards
          SET program_id = ${programId}
          WHERE id = ${cardId}
        `;
        return {
          success: true,
          fixed: true,
          action: 'Updated program relationship',
          details: {
            ...diagnosis.details,
            fixApplied: 'program_relationship'
          }
        };
      } catch (err) {
        logger.error('Error fixing program relationship:', err);
        return {
          success: false,
          fixed: false,
          error: 'Failed to update program relationship',
          details: {
            ...diagnosis.details,
            fixError: err instanceof Error ? err.message : String(err)
          }
        };
      }
    }
    
    // If we get here, we couldn't fix the issue
    return {
      success: false,
      fixed: false,
      error: 'Could not determine how to fix the card relationships',
      details: diagnosis.details
    };
  } catch (error) {
    logger.error('Error attempting card fix:', error);
    return {
      success: false,
      fixed: false,
      error: error instanceof Error ? error.message : 'Unknown error attempting card fix'
    };
  }
} 