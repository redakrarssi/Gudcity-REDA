/**
 * Direct Points Award Utility
 * This utility directly awards points to customers by accessing the database,
 * bypassing the problematic API endpoint.
 */

import sql from './db';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

/**
 * Award points to a customer directly via SQL
 * This bypasses the problematic API endpoint entirely
 */
// TEMPORARILY DISABLED - This function was causing cross-card interference and linter errors
// The main point awarding now happens through awardPointsWithCardCreation which is fixed
export async function directAwardPoints(
  customerId: string | number,
  programId: string | number,
  points: number,
  source: string = 'DIRECT',
  description: string = 'Points awarded directly',
  businessId?: string | number
): Promise<{
  success: boolean;
  cardId?: string;
  error?: string;
  diagnostics?: any;
}> {
  // Return early to avoid transaction issues
  return {
    success: false,
    error: 'directAwardPoints is temporarily disabled. Use awardPointsWithCardCreation instead.',
    diagnostics: {
      redirectTo: 'awardPointsWithCardCreation',
      reason: 'Prevented cross-card interference'
    }
  };

  /*
  // ORIGINAL FUNCTION BODY - COMMENTED OUT TO PREVENT ISSUES
  // Convert parameters to strings
  const customerIdStr = String(customerId);
  const programIdStr = String(programId);
  const businessIdStr = businessId ? String(businessId) : undefined;
  
  // Diagnostics data for troubleshooting
  const diagnostics: any = {
    method: 'directAwardPoints',
    timestamp: new Date().toISOString(),
    customerId: customerIdStr,
    programId: programIdStr,
    points,
    source,
    description
  };
  
  try {
    // Start transaction
    const transaction = await sql.begin();
    
    try {
      // 1. First find the business ID if not provided
      if (!businessIdStr) {
        const programResult = await sql`
          SELECT business_id FROM loyalty_programs WHERE id = ${programIdStr}
        `;
        
        if (programResult.length === 0) {
          return { 
            success: false, 
            error: `Program with ID ${programIdStr} not found`,
            diagnostics 
          };
        }
        
        diagnostics.businessId = programResult[0].business_id;
      } else {
        diagnostics.businessId = businessIdStr;
      }
      
      // 2. Find the loyalty card for this customer and program
      let cardResult = await transaction`
        SELECT id FROM loyalty_cards
        WHERE customer_id = ${customerIdStr}::integer
        AND program_id = ${programIdStr}::integer
        LIMIT 1
      `;
      
      let cardId: string;
      
      // 3. If card doesn't exist, create one
      if (cardResult.length === 0) {
        // Generate a new card ID
        cardId = uuidv4();
        diagnostics.cardCreated = true;
        
        await transaction`
          INSERT INTO loyalty_cards (
            id,
            customer_id,
            program_id,
            business_id,
            points,
            created_at,
            updated_at
          ) VALUES (
            ${cardId},
            ${customerIdStr}::integer,
            ${programIdStr}::integer,
            ${businessIdStr || diagnostics.businessId}::integer,
            ${points},
            NOW(),
            NOW()
          )
        `;
      } else {
        // Use existing card
        cardId = cardResult[0].id;
        diagnostics.cardExisted = true;
        
        // 4. Update the card points (FIXED: only main points column)
        await transaction`
          UPDATE loyalty_cards
          SET 
            points = COALESCE(points, 0) + ${points},
            updated_at = NOW()
          WHERE id = ${cardId}
        `;
      }
      
      // 5. Record the transaction
      const transactionRef = `direct-tx-${Date.now()}`;
      await transaction`
        INSERT INTO loyalty_transactions (
          card_id,
          customer_id,
          business_id,
          program_id,
          transaction_type,
          points,
          source,
          description,
          transaction_ref,
          created_at
        ) VALUES (
          ${cardId},
          ${customerIdStr}::integer,
          ${businessIdStr || diagnostics.businessId}::integer,
          ${programIdStr}::integer,
          'CREDIT',
          ${points},
          ${source},
          ${description},
          ${transactionRef},
          NOW()
        )
      `;
      
      // FIXED: Commented out customer_programs update to prevent cross-card interference
      // This was causing points awarded to one card to affect other cards for the same customer
      /*
      try {
        const enrollmentCheck = await sql`
          SELECT * FROM customer_programs 
          WHERE customer_id = ${customerIdStr}::integer
          AND program_id = ${programIdStr}::integer
        `;
        
        if (enrollmentCheck.length === 0) {
          // Customer is not enrolled yet, so enroll them
          await sql`
            INSERT INTO customer_programs (
              customer_id,
              program_id,
              current_points,
              enrolled_at
            ) VALUES (
              ${customerIdStr}::integer,
              ${programIdStr}::integer,
              ${points},
              NOW()
            )
          `;
          
          diagnostics.enrollmentCreated = true;
        } else {
          // Update existing enrollment
          await sql`
            UPDATE customer_programs
            SET 
              current_points = current_points + ${points},
              updated_at = NOW()
            WHERE customer_id = ${customerIdStr}::integer
            AND program_id = ${programIdStr}::integer
          `;
          
          diagnostics.enrollmentUpdated = true;
        }
      } catch (enrollmentError) {
        // Non-critical error, continue
        diagnostics.enrollmentError = enrollmentError instanceof Error ? 
          enrollmentError.message : String(enrollmentError);
      }
      */
      
      // Points are now tracked per individual card in loyalty_cards table only
      diagnostics.enrollmentSkipped = "customer_programs table not updated to prevent cross-card interference";
      console.log('✅ Skipped customer_programs update to keep cards separate');
      
      // 7. Create a customer notification
      try {
        // Get program and business names for the notification
        const namesResult = await transaction`
          SELECT 
            lp.name as program_name,
            u.name as business_name
          FROM loyalty_programs lp
          JOIN users u ON lp.business_id = u.id
          WHERE lp.id = ${programIdStr}::integer
        `;
        
        if (namesResult.length > 0) {
          const programName = namesResult[0].program_name || 'Loyalty Program';
          const businessName = namesResult[0].business_name || 'Business';
          
          // Create notification record
          await transaction`
            INSERT INTO customer_notifications (
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
              ${customerIdStr}::integer,
              ${businessIdStr || diagnostics.businessId}::integer,
              'POINTS_ADDED',
              'Points Added',
              ${`You've received ${points} points from ${businessName} in the program ${programName}`},
              ${JSON.stringify({
                points,
                cardId,
                programId: programIdStr,
                programName,
                businessName
              })},
              false,
              false,
              false,
              NOW()
            )
          `;
          
          diagnostics.notificationCreated = true;
        }
      } catch (notificationError) {
        // Non-critical error, continue
        diagnostics.notificationError = notificationError instanceof Error ? 
          notificationError.message : String(notificationError);
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Log success
      logger.info('Points awarded directly via SQL', {
        customerId: customerIdStr,
        programId: programIdStr,
        points,
        cardId
      });
      
      return { 
        success: true, 
        cardId,
        diagnostics 
      };
    } catch (error) {
      // Rollback transaction
      await transaction.rollback();
      
      // Log error
      logger.error('Failed to award points directly', { 
        error: error instanceof Error ? error.message : String(error),
        customerId: customerIdStr,
        programId: programIdStr,
        points
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during direct points award',
        diagnostics: {
          ...diagnostics,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  } catch (error) {
    // Log error starting transaction
    logger.error('Failed to start transaction for direct points award', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start database transaction',
      diagnostics: {
        ...diagnostics,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
} 