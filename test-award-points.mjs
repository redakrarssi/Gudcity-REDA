// Test script for the award points functionality
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection
const sql = neon(process.env.DATABASE_URL);

// Mock the CustomerNotificationService
const CustomerNotificationService = {
  async createNotification(notification) {
    console.log('Creating notification:', notification);
    return { id: 'test-notification-' + Date.now() };
  }
};

// Mock the createCardSyncEvent function
const createCardSyncEvent = (cardId, customerId, businessId, operation, data) => {
  console.log('Creating card sync event:', { cardId, customerId, businessId, operation, data });
};

// Simplified version of the awardPointsToCard function
async function awardPointsToCard(
  cardId,
  points,
  source = 'TEST',
  description = 'Test points award',
  transactionRef = `test-${Date.now()}`,
  businessId = ''
) {
  if (!cardId) {
    console.error('Error awarding points: No card ID provided');
    return { success: false, error: 'No card ID provided' };
  }

  if (points <= 0) {
    console.warn('Invalid points value:', points);
    return { success: false, error: 'Points must be greater than zero' };
  }

  const diagnosticData = { 
    cardId, 
    points, 
    source, 
    transactionRef,
    timestamp: new Date().toISOString() 
  };

  try {
    console.log(`Starting point award process for card ${cardId}, points: ${points}, source: ${source}`);

    // Start transaction
    const transaction = await sql.begin();

    try {
      // First get card details to get customer_id and program info
      console.log('Retrieving card details for ID:', cardId);
      const cardDetails = await transaction`
        SELECT 
          lc.*,
          lp.name as program_name,
          u.name as business_name,
          c.name as customer_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN users u ON lp.business_id = u.id
        LEFT JOIN customers c ON lc.customer_id = c.id
        WHERE lc.id = ${cardId}
      `;

      if (!cardDetails.length) {
        await transaction.rollback();
        console.error('Card not found:', cardId);
        return { success: false, error: `Card not found with ID: ${cardId}` };
      }

      const card = cardDetails[0];
      const customerId = card.customer_id;
      const programId = card.program_id;
      const programName = card.program_name || 'Loyalty Program';
      const businessName = card.business_name || 'Business';
      const customerName = card.customer_name || 'Customer';

      diagnosticData.cardDetails = {
        customerId,
        programId,
        programName,
        businessName,
        customerName
      };

      console.log('Card found, details:', {
        cardId,
        customerId,
        programId,
        programName
      });

      // Update card points balance
      console.log(`Updating points balance for card ${cardId}, adding ${points} points`);
      
      // Try updating with all possible column combinations
      let updateResult;
      
      try {
        // First try with all standard columns
        updateResult = await transaction`
          UPDATE loyalty_cards
          SET 
            points = COALESCE(points, 0) + ${points},
            points_balance = COALESCE(points_balance, 0) + ${points},
            total_points_earned = COALESCE(total_points_earned, 0) + ${points},
            updated_at = NOW()
          WHERE id = ${cardId}
          RETURNING id, points, points_balance, total_points_earned
        `;
      } catch (columnError) {
        console.warn('Column error in first update attempt:', columnError);
        diagnosticData.firstUpdateError = columnError instanceof Error ? columnError.message : String(columnError);
        
        try {
          // Try with just points and points_balance
          updateResult = await transaction`
            UPDATE loyalty_cards
            SET 
              points = COALESCE(points, 0) + ${points},
              points_balance = COALESCE(points_balance, 0) + ${points},
              updated_at = NOW()
            WHERE id = ${cardId}
            RETURNING id, points, points_balance
          `;
        } catch (secondError) {
          console.warn('Column error in second update attempt:', secondError);
          diagnosticData.secondUpdateError = secondError instanceof Error ? secondError.message : String(secondError);
          
          // Last resort - just update points
          updateResult = await transaction`
            UPDATE loyalty_cards
            SET 
              points = COALESCE(points, 0) + ${points}
            WHERE id = ${cardId}
            RETURNING id, points
          `;
        }
      }

      if (!updateResult || updateResult.length === 0) {
        await transaction.rollback();
        console.error('Failed to update card points. No rows affected.');
        return { 
          success: false, 
          error: 'Failed to update card points. No rows affected.',
          diagnostics: diagnosticData
        };
      }

      diagnosticData.pointsUpdated = {
        id: updateResult[0].id,
        points: updateResult[0].points,
        points_balance: updateResult[0].points_balance,
        total_points_earned: updateResult[0].total_points_earned
      };

      console.log('Points update successful:', updateResult[0]);

      // Record the transaction - try different table schemas
      console.log('Recording points transaction');
      let txId;
      
      try {
        // First try with all fields
        txId = await transaction`
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
            ${source},
            ${description || 'Points awarded'},
            ${transactionRef || `scan-${Date.now()}`},
            ${businessId || card.business_id},
            NOW(),
            ${customerId},
            ${programId}
          )
          RETURNING id
        `;
      } catch (txError) {
        console.warn('Error in first transaction record attempt:', txError);
        diagnosticData.firstTxError = txError instanceof Error ? txError.message : String(txError);
        
        try {
          // Try with minimal fields
          txId = await transaction`
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
              ${points},
              ${source},
              ${description || 'Points awarded'},
              NOW()
            )
            RETURNING id
          `;
        } catch (secondTxError) {
          console.warn('Error in second transaction record attempt:', secondTxError);
          diagnosticData.secondTxError = secondTxError instanceof Error ? secondTxError.message : String(secondTxError);
          
          // If transaction table doesn't exist or has issues, try card_activities as fallback
          try {
            const activityId = await transaction`
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
                ${description || 'Points awarded'},
                ${transactionRef || `scan-${Date.now()}`},
                NOW()
              )
              RETURNING id
            `;
            
            txId = activityId;
            diagnosticData.usedCardActivities = true;
          } catch (activityError) {
            // Log but continue - points were already awarded
            console.warn('Failed to record activity:', activityError);
            diagnosticData.activityError = activityError instanceof Error ? activityError.message : String(activityError);
          }
        }
      }

      if (txId && txId.length > 0) {
        diagnosticData.transactionId = txId[0].id;
      } else {
        console.warn('No transaction ID returned, but continuing');
        diagnosticData.noTransactionId = true;
      }

      // Commit transaction - points have been awarded
      await transaction.commit();
      console.log('Transaction committed successfully');
      
      // After successful transaction, send notification to customer
      try {
        console.log('Sending notification to customer:', customerId);
        
        // Create notification in customer notification system
        const notification = await CustomerNotificationService.createNotification({
          customerId: customerId.toString(),
          businessId: (businessId || card.business_id).toString(),
          type: 'POINTS_ADDED',
          title: 'Points Added',
          message: `You've received ${points} points from ${businessName} in ${programName}`,
          data: {
            points: points,
            cardId: cardId,
            programId: programId.toString(),
            programName: programName,
            source: source,
            transactionId: diagnosticData.transactionId
          },
          requiresAction: false,
          actionTaken: false,
          isRead: false
        });

        diagnosticData.notificationCreated = !!notification;
        diagnosticData.notificationId = notification?.id;

        // Create sync event
        try {
          createCardSyncEvent(
            cardId,
            customerId.toString(),
            (businessId || card.business_id).toString(),
            'UPDATE',
            {
              points: points,
              programName: programName
            }
          );
          diagnosticData.syncEventCreated = true;
        } catch (syncError) {
          console.warn('Error creating sync event:', syncError);
          diagnosticData.syncError = syncError instanceof Error ? syncError.message : String(syncError);
        }
        
        console.log('Notification and sync events created successfully');
      } catch (notificationError) {
        console.error('Failed to send points notification:', notificationError);
        diagnosticData.notificationError = notificationError instanceof Error ? notificationError.message : String(notificationError);
        // Continue even if notification fails - the points were already awarded
      }

      return { success: true, diagnostics: diagnosticData };
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error('Transaction error in awardPointsToCard:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error',
        diagnostics: {
          ...diagnosticData,
          transactionError: error instanceof Error ? error.message : String(error)
        }
      };
    }
  } catch (error) {
    console.error('Error awarding points to card:', error);
    
    // Check if error is related to foreign key constraint
    const errorString = String(error);
    let errorMessage = 'Unknown error awarding points';
    
    if (errorString.includes('foreign key constraint') || errorString.includes('violates foreign key')) {
      errorMessage = 'Foreign key constraint violation. This may indicate a problem with customer, program, or card IDs.';
    } else if (errorString.includes('column') && errorString.includes('does not exist')) {
      errorMessage = 'Database schema issue. A required column does not exist.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Try direct update as fallback when all else fails
    try {
      console.log('Attempting direct update as fallback');
      const directUpdate = await sql`
        UPDATE loyalty_cards
        SET points = points + ${points}
        WHERE id = ${cardId}
        RETURNING id, points
      `;
      
      if (directUpdate && directUpdate.length > 0) {
        console.log('Direct update successful:', directUpdate[0]);
        
        // Try to create notification
        try {
          const cardInfo = await sql`
            SELECT 
              lc.*,
              lp.name as program_name,
              u.name as business_name
            FROM loyalty_cards lc
            JOIN loyalty_programs lp ON lc.program_id = lp.id
            JOIN users u ON lp.business_id = u.id
            WHERE lc.id = ${cardId}
          `;
          
          if (cardInfo && cardInfo.length > 0) {
            const card = cardInfo[0];
            const customerId = card.customer_id;
            const programName = card.program_name || 'Loyalty Program';
            const businessName = card.business_name || 'Business';
            
            // Create notification
            await CustomerNotificationService.createNotification({
              customerId: customerId.toString(),
              businessId: (businessId || card.business_id).toString(),
              type: 'POINTS_ADDED',
              title: 'Points Added',
              message: `You've received ${points} points from ${businessName} in ${programName}`,
              data: {
                points: points,
                cardId: cardId,
                programId: card.program_id.toString(),
                programName: programName,
                source: source
              },
              requiresAction: false,
              actionTaken: false,
              isRead: false
            });
          }
        } catch (notifError) {
          console.warn('Error creating notification in fallback:', notifError);
        }
        
        return { 
          success: true, 
          diagnostics: { 
            usedDirectFallback: true,
            points,
            cardId,
            updatedPoints: directUpdate[0].points
          }
        };
      }
    } catch (directError) {
      console.error('Direct update fallback failed:', directError);
    }
    
    return { 
      success: false, 
      error: errorMessage,
      diagnostics: { error: errorString, cardId, points, source }
    };
  }
}

// Main test function
async function testAwardPoints() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const cardId = args[0] || '17'; // Default to card ID 17
    const points = parseInt(args[1] || '100'); // Default to 100 points
    
    console.log(`Testing award points for card ID ${cardId} with ${points} points...`);
    
    // Award points
    const result = await awardPointsToCard(
      cardId,
      points,
      'TEST',
      'Test award points script',
      `test-${Date.now()}`,
      ''
    );
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ Successfully awarded ${points} points to card ${cardId}`);
    } else {
      console.log(`❌ Failed to award points: ${result.error}`);
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the test
testAwardPoints(); 