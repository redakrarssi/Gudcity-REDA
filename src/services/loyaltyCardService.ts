import sql from '../utils/db';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { QrCodeStorageService } from './qrCodeStorageService';
import { createStandardLoyaltyCardQRCode } from '../utils/standardQrCodeGenerator';
import { queryClient, queryKeys } from '../utils/queryClient';
import { emitPromoCodeGeneratedEvent, emitEnrollmentEvent, emitPointsRedeemedEvent } from '../utils/loyaltyEvents';
import * as serverFunctions from '../server';
import { CustomerNotificationService } from './customerNotificationService';
import { LoyaltyProgramService } from './loyaltyProgramService';
import { formatPoints, validateCardData } from '../utils/validators';
import { logger } from '../utils/logger';
import { createCardSyncEvent, createNotificationSyncEvent } from '../utils/realTimeSync';
import type { LoyaltyCard } from '../types/loyalty';

// Define the card benefit type
export type CardBenefit = string;

// Define the LoyaltyCard interface that matches our database schema
export interface LoyaltyCard {
  id: string;
  customerId: string;
  businessId: string;
  programId: string;
  cardType: string;
  tier: string;
  points: number;
  pointsMultiplier: number;
  promoCode: string | null;
  nextReward: string | null;
  pointsToNext: number | null;
  expiryDate: string | null;
  benefits: string[];
  lastUsed: string | null;
  isActive: boolean;
  availableRewards: Reward[];
  createdAt: string;
  updatedAt: string;
  businessName?: string;
  programName?: string;
  cardNumber: string;
  status: string;
}

// Define the Reward interface
export interface Reward {
  name: string;
  points: number;
  description: string;
  imageUrl?: string;
  isRedeemable?: boolean;
  id: string;
  programId: string;
  isActive: boolean;
}

// Define the RedemptionResult interface
export interface RedemptionResult {
  success: boolean;
  message: string;
  updatedCard?: LoyaltyCard;
  reward?: Reward;
}

// Define the CardTierRequirement interface
export interface CardTierRequirement {
  tier: string;
  pointsRequired: number;
  benefits: string[];
  pointsMultiplier: number;
}

// Define the CardActivity interface
export interface CardActivity {
  id: string;
  cardId: string;
  type: string;
  points: number;
  balance: number;
  description: string;
  createdAt: string;
  businessName?: string;
}

// Define the CustomerInfo interface
export interface CustomerInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

/**
 * Service for managing loyalty cards and rewards
 */
export class LoyaltyCardService {
  // Card tier requirements
  private static readonly cardTiers: CardTierRequirement[] = [
    {
      tier: 'STANDARD',
      pointsRequired: 0,
      benefits: ['Basic rewards', 'Birthday gift'],
      pointsMultiplier: 1.0
    },
    {
      tier: 'SILVER',
      pointsRequired: 1000,
      benefits: ['Basic rewards', 'Birthday gift', '5% discount'],
      pointsMultiplier: 1.25
    },
    {
      tier: 'GOLD',
      pointsRequired: 2500,
      benefits: ['All Silver benefits', '10% discount', 'Free item monthly'],
      pointsMultiplier: 1.5
    },
    {
      tier: 'PLATINUM',
      pointsRequired: 5000,
      benefits: ['All Gold benefits', '15% discount', 'Priority service', 'Exclusive events'],
      pointsMultiplier: 2.0
    }
  ];

  /**
   * Get a customer's loyalty card for a specific business
   */
  static async getCustomerCard(customerId: string, businessId: string): Promise<LoyaltyCard | null> {
    try {
      const cards = await sql`
        SELECT * 
        FROM loyalty_cards
        WHERE customer_id = ${customerId}
        AND business_id = ${businessId}
        AND is_active = true
      `;
      
      if (!cards.length) {
        return null;
      }
      
      return this.formatCard(cards[0]);
    } catch (error) {
      console.error('Error fetching customer loyalty card:', error);
      return null;
    }
  }

  /**
   * Get all loyalty cards for a customer
   */
  static async getCustomerCards(customerId: string): Promise<LoyaltyCard[]> {
    try {
      // Ensure we have a valid customer ID
      if (!customerId) {
        console.error('Invalid customer ID');
        return [];
      }

      console.log(`Fetching loyalty cards for customer ${customerId}`);

      // Check if reward_tiers column exists
      const columnExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='loyalty_programs' AND column_name='reward_tiers'
        );
      `;
      
      let result;
      
      // FIXED: Handle both string and integer customer IDs for better compatibility
      const customerIdInt = parseInt(customerId.toString(), 10);
      const customerIdStr = customerId.toString();
      
      // Get all cards with program and business details - handle missing columns gracefully
      if (columnExists && columnExists[0] && columnExists[0].exists) {
        // Column exists, use original query with both ID formats
        result = await sql`
          SELECT 
            lc.*,
            lp.name as program_name,
            lp.description as program_description,
            lp.type as program_type,
            lp.points_per_dollar,
            lp.reward_tiers,
            lp.points_expiry_days,
            u.name as business_name
          FROM loyalty_cards lc
          JOIN loyalty_programs lp ON lc.program_id = lp.id
          JOIN users u ON lp.business_id = u.id
          WHERE (lc.customer_id = ${customerIdInt} OR lc.customer_id = ${customerIdStr})
          ORDER BY lc.created_at DESC
        `;
      } else {
        // Column doesn't exist, omit it from query with both ID formats  
        result = await sql`
          SELECT 
            lc.*,
            lp.name as program_name,
            lp.description as program_description,
            lp.type as program_type,
            lp.points_per_dollar,
            lp.points_expiry_days,
            u.name as business_name
          FROM loyalty_cards lc
          JOIN loyalty_programs lp ON lc.program_id = lp.id
          JOIN users u ON lp.business_id = u.id
          WHERE (lc.customer_id = ${customerIdInt} OR lc.customer_id = ${customerIdStr})
          ORDER BY lc.created_at DESC
        `;
      }

      if (!result.length) {
        console.log(`No loyalty cards found for customer ${customerId}`);
        return [];
      }

      console.log(`Found ${result.length} loyalty cards for customer ${customerId}`);

            // Map database results to our interface with CRITICAL POINTS FIX
      return result.map(card => {
        // CRITICAL FIX: Handle multiple points columns for data consistency
        // Priority: points_balance > points > total_points_earned > 0
        let actualPoints = parseFloat(card.points) || 0;
        
        // Check if points_balance has a higher value (this is often where points are actually stored)
        if (card.points_balance && parseFloat(card.points_balance) > actualPoints) {
          actualPoints = parseFloat(card.points_balance) || 0;
          console.log(`Using points_balance (${actualPoints}) instead of points (${card.points}) for card ${card.id}`);
        }
        
        // Check if total_points_earned has a higher value 
        if (card.total_points_earned && parseFloat(card.total_points_earned) > actualPoints) {
          actualPoints = parseFloat(card.total_points_earned) || 0;
          console.log(`Using total_points_earned (${actualPoints}) for card ${card.id}`);
        }
        
        return {
          id: card.id.toString(),
          customerId: card.customer_id.toString(),
          businessId: card.business_id.toString(),
          programId: card.program_id.toString(),
          programName: card.program_name,
          cardNumber: card.card_number,
          points: actualPoints, // FIXED: Use the maximum points value from available columns
          tier: card.tier || 'STANDARD',
          status: card.status || 'ACTIVE',
          expiryDate: card.expiry_date,
          createdAt: card.created_at,
          updatedAt: card.updated_at,
          cardType: card.card_type || 'STANDARD',
          businessName: card.business_name,
          pointsMultiplier: parseFloat(card.points_multiplier) || 1,
          pointsToNext: card.points_to_next_tier ? parseFloat(card.points_to_next_tier) : undefined,
          benefits: card.benefits || []
        };
      });
    } catch (error) {
      console.error('Error fetching customer cards:', error);
      return [];
    }
  }
  
  /**
   * Create or activate a loyalty card for a customer
   */
  static async enrollCustomerInProgram(
    customerId: string,
    businessId: string,
    programId: string
  ): Promise<LoyaltyCard | null> {
    let transaction;
    try {
      // Start a transaction to ensure atomicity
      transaction = await sql.begin();

      // Validate inputs first
      if (!customerId || !businessId || !programId) {
        throw new Error('Missing required parameters for enrollment');
      }

      // Validate customer exists
      const customerCheck = await transaction`
        SELECT id FROM users
        WHERE id = ${customerId}
        AND user_type = 'customer'
        AND status = 'active'
      `;

      if (customerCheck.length === 0) {
        throw new Error('Customer not found or not active');
      }

      // Validate business exists
      const businessCheck = await transaction`
        SELECT id FROM businesses
        WHERE id = ${businessId}
        AND status = 'active'
      `;

      if (businessCheck.length === 0) {
        throw new Error('Business not found or not active');
      }

      // Validate program exists
      const programCheck = await transaction`
        SELECT id, points_to_enroll FROM loyalty_programs
        WHERE id = ${programId}
        AND business_id = ${businessId}
        AND status = 'active'
      `;

      if (programCheck.length === 0) {
        throw new Error('Loyalty program not found or not active');
      }

      // Check if the customer already has a card for this program
      const existingCard = await transaction`
        SELECT id, status FROM loyalty_cards
        WHERE customer_id = ${customerId}
        AND program_id = ${programId}
      `;

      let cardId;
      let isNewCard = false;

      if (existingCard.length > 0) {
        // Card exists - update it if needed
        if (existingCard[0].status !== 'active') {
          await transaction`
            UPDATE loyalty_cards
            SET status = 'active', updated_at = NOW()
            WHERE id = ${existingCard[0].id}
          `;
        }
        cardId = existingCard[0].id;
      } else {
        // No card exists - create a new one
        isNewCard = true;
        
        // Generate a unique card number
        const cardNumber = await this.generateUniqueCardNumber(customerId, businessId);
        
        const cardInsert = await transaction`
          INSERT INTO loyalty_cards (
            customer_id, 
            business_id, 
            program_id, 
            card_number,
            points_balance, 
            total_points_earned,
            status,
            enrollment_date,
            created_at, 
            updated_at
          )
          VALUES (
            ${customerId}, 
            ${businessId}, 
            ${programId}, 
            ${cardNumber},
            0, 
            0,
            'active',
            NOW(),
            NOW(), 
            NOW()
          )
          RETURNING id
        `;
        
        if (!cardInsert || cardInsert.length === 0) {
          throw new Error('Failed to create loyalty card');
        }
        
        cardId = cardInsert[0].id;
        
        // Create a QR code for this card
        try {
          // Generate QR code data
          const customer = await transaction`
            SELECT name FROM users WHERE id = ${customerId}
          `;
          
          const customerName = customer.length > 0 ? customer[0].name : 'Customer';
          
          // Create the QR code for the loyalty card
          const qrImageUrl = await createStandardLoyaltyCardQRCode(
            cardId.toString(),
            programId,
            businessId,
            customerId
          );
          
          // Store the QR code in the database
          if (qrImageUrl) {
            const qrData = {
              type: 'LOYALTY_CARD',
              cardId: cardId,
              programId: programId,
              businessId: businessId,
              customerId: customerId,
              cardNumber: cardNumber,
              timestamp: Date.now(),
              qrUniqueId: uuidv4()
            };
            
            await QrCodeStorageService.createQrCode({
              customerId: customerId,
              businessId: businessId,
              qrType: 'LOYALTY_CARD',
              data: JSON.stringify(qrData),
              imageUrl: qrImageUrl,
              isPrimary: false,  // Not the primary customer QR code
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Valid for 1 year
            });
            
            // Update the card with the QR code URL
            await transaction`
              UPDATE loyalty_cards
              SET qr_code_url = ${qrImageUrl}
              WHERE id = ${cardId}
            `;
          }
        } catch (qrError) {
          console.error('Error creating QR code for loyalty card:', qrError);
          // Continue even if QR creation fails
        }
      }
      
      // Get the full card data
      const card = await transaction`
        SELECT 
          lc.*,
          lp.name as program_name,
          b.name as business_name
        FROM loyalty_cards lc
        LEFT JOIN loyalty_programs lp ON lc.program_id = lp.id
        LEFT JOIN businesses b ON lc.business_id = b.id
        WHERE lc.id = ${cardId}
      `;

      // Get program and business name
      const programInfo = await sql`
        SELECT p.*, b.name as business_name 
        FROM loyalty_programs p
        JOIN businesses b ON p.business_id = b.id
        WHERE p.id = ${programId} AND p.status = 'active'
      `;
      
      if (!programInfo.length) return null;

      // Commit the transaction
      await transaction.commit();

      // Format and return the card
      if (card.length > 0) {
        // If this is a new card enrollment, trigger any welcome actions
        if (isNewCard) {
          try {
            // This is non-blocking - don't await
            this.handleNewCardEnrollment(card[0].id, customerId, businessId, programId);
          } catch (welcomeError) {
            console.error('Error processing welcome actions:', welcomeError);
          }
        }
        
        // Broadcast update to customer's cards
        try {
          const storageKey = `cards_update_${customerId}`;
          localStorage.setItem(storageKey, Date.now().toString());
          setTimeout(() => localStorage.removeItem(storageKey), 5000);
        } catch (_) {}
        // Invalidate react-query caches
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.byId(customerId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.customerSummary(customerId) });
        
        // Emit enrollment event
        emitEnrollmentEvent(
          customerId,
          businessId,
          programInfo[0].business_name || 'Business',
          programId,
          programInfo[0].name || 'Loyalty Program',
          cardId
        );
        
        return this.formatCard(card[0]);
      }
      
      return null;
    } catch (error) {
      // Rollback transaction on error
      if (transaction) await transaction.rollback();
      console.error('Error enrolling customer in loyalty program:', error);
      throw error;
    }
  }
  
  /**
   * Generate a unique card number for a loyalty card
   */
  private static async generateUniqueCardNumber(customerId: string, businessId: string): Promise<string> {
    // Create a base pattern: BXXXX-CXXXX-YYYY
    // where B = business prefix, C = customer prefix, Y = random digits
    const businessPrefix = businessId.toString().padStart(4, '0').slice(-4);
    const customerPrefix = customerId.toString().padStart(4, '0').slice(-4);
    const randomPart = Math.floor(10000 + Math.random() * 90000).toString();
    
    const cardNumber = `${businessPrefix}-${customerPrefix}-${randomPart}`;
    
    // Check if this card number already exists
    const existingCard = await sql`
      SELECT id FROM loyalty_cards
      WHERE card_number = ${cardNumber}
    `;
    
    if (existingCard.length > 0) {
      // Recursive call to generate a different number if this one exists
      return this.generateUniqueCardNumber(customerId, businessId);
    }
    
    return cardNumber;
  }

  /**
   * Handle new card enrollment actions (e.g., welcome points)
   */
  private static async handleNewCardEnrollment(
    cardId: number,
    customerId: string,
    businessId: string,
    programId: string
  ): Promise<void> {
    try {
      // Check if program offers welcome points
      const program = await sql`
        SELECT welcome_points FROM loyalty_programs
        WHERE id = ${programId}
      `;
      
      if (program.length > 0 && program[0].welcome_points > 0) {
        // Award welcome points
        await this.awardPointsToCard(
          cardId.toString(),
          program[0].welcome_points,
          'WELCOME',
          'Welcome bonus for joining the program'
        );
      }
    } catch (error) {
      console.error('Error processing welcome actions:', error);
      // Don't throw, this is a non-critical operation
    }
  }

  /**
   * Award points to a loyalty card
   */
  static async awardPointsToCard(
    cardId: string,
    points: number,
    source: 'PURCHASE' | 'SCAN' | 'WELCOME' | 'PROMOTION' | 'MANUAL' | 'OTHER',
    description: string = '',
    transactionRef: string = '',
    businessId: string = ''
  ): Promise<{ success: boolean; error?: string; diagnostics?: any }> {
    if (!cardId) {
      console.error('Error awarding points: No card ID provided');
      return { success: false, error: 'No card ID provided' };
    }

    if (points <= 0) {
      console.warn('Invalid points value:', points);
      return { success: false, error: 'Points must be greater than zero' };
    }

    const diagnosticData: any = { 
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
        let cardDetails;
        
        try {
          cardDetails = await transaction`
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
        } catch (lookupError) {
          // Try alternative join if customers table is not available
          console.log('First join failed, trying alternative lookup');
          
          cardDetails = await transaction`
            SELECT 
              lc.*,
              lp.name as program_name,
              u.name as business_name,
              u2.name as customer_name
            FROM loyalty_cards lc
            JOIN loyalty_programs lp ON lc.program_id = lp.id
            JOIN users u ON lp.business_id = u.id
            JOIN users u2 ON lc.customer_id = u2.id AND u2.user_type = 'customer'
            WHERE lc.id = ${cardId}
          `;
        }

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

        // Update card points balance - make sure we handle both points and points_balance
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
          console.error('Card update failed, no rows affected');
          return { 
            success: false, 
            error: 'Card update failed, no rows affected',
            diagnostics: diagnosticData 
          };
        }
        
        console.log('Card updated successfully:', updateResult[0]);
        diagnosticData.cardUpdated = true;
        diagnosticData.updatedCard = updateResult[0];
        
        // Record transaction in loyalty_transactions
        try {
          const transactionResult = await transaction`
            INSERT INTO loyalty_transactions (
              card_id,
              transaction_type,
              points,
              source,
              description,
              transaction_ref,
              business_id,
              created_at
            ) VALUES (
              ${cardId},
              'CREDIT',
              ${points},
              ${source},
              ${description || `Points awarded by ${businessName}`},
              ${transactionRef || `tx-${Date.now()}`},
              ${businessId || card.business_id},
              NOW()
            ) RETURNING id
          `;
          
          diagnosticData.transactionId = transactionResult[0]?.id;
          diagnosticData.transactionCreated = true;
          
          console.log('Transaction recorded with ID:', diagnosticData.transactionId);
        } catch (transactionError) {
          console.warn('Failed to record transaction:', transactionError);
          diagnosticData.transactionError = transactionError instanceof Error ? 
            transactionError.message : String(transactionError);
          
          // Continue even if transaction recording fails
        }
        
        // Also try to update customer_programs (or program_enrollments) table
        try {
          // Check if customer is enrolled in program
          const enrollmentCheck = await transaction`
            SELECT * FROM customer_programs 
            WHERE customer_id = ${customerId} 
            AND program_id = ${programId}
          `;
          
          if (enrollmentCheck.length === 0) {
            // Customer is not enrolled yet, so enroll them
            await transaction`
              INSERT INTO customer_programs (
                customer_id,
                program_id,
                current_points,
                enrolled_at
              ) VALUES (
                ${customerId},
                ${programId},
                ${points},
                NOW()
              )
            `;
            
            diagnosticData.enrollmentCreated = true;
            console.log('New enrollment created');
          } else {
            // Update existing enrollment
            await transaction`
              UPDATE customer_programs
              SET 
                current_points = current_points + ${points},
                updated_at = NOW()
              WHERE customer_id = ${customerId}
              AND program_id = ${programId}
            `;
            
            diagnosticData.enrollmentUpdated = true;
            console.log('Existing enrollment updated');
          }
        } catch (enrollmentError) {
          console.warn('Failed to update enrollment:', enrollmentError);
          diagnosticData.enrollmentError = enrollmentError instanceof Error ? 
            enrollmentError.message : String(enrollmentError);
          
          // Try alternative table name (program_enrollments) if customer_programs failed
          try {
            const enrollmentCheck = await transaction`
              SELECT * FROM program_enrollments 
              WHERE customer_id = ${customerId} 
              AND program_id = ${programId}
            `;
            
            if (enrollmentCheck.length === 0) {
              await transaction`
                INSERT INTO program_enrollments (
                  customer_id,
                  program_id,
                  current_points,
                  enrolled_at
                ) VALUES (
                  ${customerId},
                  ${programId},
                  ${points},
                  NOW()
                )
              `;
              
              diagnosticData.alternativeEnrollmentCreated = true;
            } else {
              await transaction`
                UPDATE program_enrollments
                SET 
                  current_points = current_points + ${points},
                  updated_at = NOW()
                WHERE customer_id = ${customerId}
                AND program_id = ${programId}
              `;
              
              diagnosticData.alternativeEnrollmentUpdated = true;
            }
          } catch (altEnrollmentError) {
            console.warn('Failed to update alternative enrollment:', altEnrollmentError);
            diagnosticData.alternativeEnrollmentError = altEnrollmentError instanceof Error ? 
              altEnrollmentError.message : String(altEnrollmentError);
            
            // Continue even if enrollment update fails
          }
        }
        
        // Commit the transaction
        await transaction.commit();
        console.log('Transaction committed successfully');
        
        // After successful transaction, send notification to customer
        try {
          console.log('Sending notification to customer:', customerId);
          
          // Import notification handler
          const { handlePointsAwarded } = await import('../utils/notificationHandler');
          
          // Send notification
          await handlePointsAwarded(
            customerId.toString(),
            (businessId || card.business_id).toString(),
            programId.toString(),
            programName,
            businessName,
            points,
            cardId,
            source
          );
          
          diagnosticData.notificationSent = true;
        } catch (notificationError) {
          console.warn('Failed to send notification:', notificationError);
          diagnosticData.notificationError = notificationError instanceof Error ? 
            notificationError.message : String(notificationError);
          
          // Create notification in customer notification system directly as fallback
          try {
            const { CustomerNotificationService } = await import('./customerNotificationService');
            
            // Create notification
            const notification = await CustomerNotificationService.createNotification({
              customerId: customerId.toString(),
              businessId: (businessId || card.business_id).toString(),
              type: 'POINTS_ADDED',
              title: 'Points Added',
              message: `You've received ${points} points from ${businessName} in the program ${programName}`,
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

            diagnosticData.fallbackNotificationCreated = !!notification;
            diagnosticData.fallbackNotificationId = notification?.id;
          } catch (fallbackNotificationError) {
            console.warn('Failed to create fallback notification:', fallbackNotificationError);
            diagnosticData.fallbackNotificationError = fallbackNotificationError instanceof Error ? 
              fallbackNotificationError.message : String(fallbackNotificationError);
          }
        }
        
        // Return success
        return {
          success: true,
          diagnostics: diagnosticData
        };
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
              
              // Import notification handler
              const { handlePointsAwarded } = await import('../utils/notificationHandler');
          
              // Send notification
              await handlePointsAwarded(
                customerId.toString(),
                (businessId || card.business_id).toString(),
                card.program_id.toString(),
                programName,
                businessName,
                points,
                cardId,
                source
              );
            }
            
            return { 
              success: true, 
              diagnostics: { 
                directUpdateSuccessful: true, 
                cardId, 
                points 
              } 
            };
          } catch (notificationError) {
            // Return success even if notification fails
            console.warn('Failed to send notification after direct update:', notificationError);
            return { 
              success: true, 
              diagnostics: { 
                directUpdateSuccessful: true, 
                notificationFailed: true,
                cardId, 
                points 
              } 
            };
          }
        }
      } catch (directUpdateError) {
        console.error('Direct update also failed:', directUpdateError);
      }
      
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
      
      return { 
        success: false, 
        error: errorMessage,
        diagnostics: {
          ...diagnosticData,
          error: errorString
        } 
      };
    }
  }

  /**
   * Add points to a loyalty card
   */
  static async addPoints(
    cardId: string,
    points: number,
    description: string = 'Points added'
  ): Promise<{ success: boolean; message?: string; newBalance?: number }> {
    try {
      // Validate inputs
      if (points <= 0) {
        return { success: false, message: 'Points must be greater than 0' };
      }
      
      // Format points to 2 decimal places
      const formattedPoints = Number(points.toFixed(2));
      
      // Get the card details
      const cardResult = await sql`
        SELECT 
          lc.*,
          lp.name as program_name,
          b.name as business_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN users b ON lc.business_id = b.id
        WHERE lc.id = ${cardId}
      `;
      
      if (!cardResult.length) {
        return { success: false, message: 'Card not found' };
      }
      
      const card = cardResult[0];
      
      // Calculate new balance
      const currentPoints = parseFloat(card.points) || 0;
      const newBalance = Number((currentPoints + formattedPoints).toFixed(2));
      
      // Update card points
      await sql`
        UPDATE loyalty_cards
        SET 
          points = ${newBalance},
          updated_at = NOW()
        WHERE id = ${cardId}
        RETURNING *
      `;
      
      // Record the transaction
      await sql`
        INSERT INTO loyalty_transactions (
          card_id,
          customer_id,
          business_id,
          program_id,
          points_change,
          points_before,
          points_after,
          transaction_type,
          description,
          created_at
        )
        VALUES (
          ${cardId},
          ${card.customer_id},
          ${card.business_id},
          ${card.program_id},
          ${formattedPoints},
          ${currentPoints},
          ${newBalance},
          'POINTS_ADDED',
          ${description},
          NOW()
        )
      `;

      // Send real-time notification to the customer
      try {
        // Create notification in customer notification system
        const notification = await CustomerNotificationService.createNotification({
          customerId: card.customer_id.toString(),
          businessId: card.business_id.toString(),
          type: 'POINTS_ADDED',
          title: 'Points Added',
          message: `You've received ${formattedPoints} points from ${card.business_name} in the program ${card.program_name}`,
          data: {
            points: formattedPoints,
            cardId: cardId,
            programId: card.program_id.toString(),
            programName: card.program_name
          },
          requiresAction: false,
          actionTaken: false,
          isRead: false
        });

        // Use localStorage to trigger UI updates on the customer side
        // This will work even if socket connections aren't functioning
        localStorage.setItem(`sync_points_${Date.now()}`, JSON.stringify({
          customerId: card.customer_id.toString(),
          businessId: card.business_id.toString(),
          cardId: cardId,
          programId: card.program_id.toString(),
          points: formattedPoints,
          timestamp: new Date().toISOString(),
          type: 'POINTS_ADDED'
        }));

        // Create sync event for React Query invalidation
        createCardSyncEvent(
          cardId,
          card.customer_id.toString(),
          card.business_id.toString(),
          'UPDATE',
          {
            points: newBalance,
            pointsAdded: formattedPoints,
            programName: card.program_name
          }
        );
      } catch (notificationError) {
        console.error('Failed to send points notification:', notificationError);
        // Continue even if notification fails
      }

      return { 
        success: true, 
        message: `Added ${formattedPoints} points to card ${cardId}`, 
        newBalance 
      };
    } catch (error) {
      console.error('Error adding points to card:', error);
      return { success: false, message: 'Database error while adding points' };
    }
  }
  
  /**
   * Redeem a reward
   */
  static async redeemReward(
    cardId: string,
    rewardName: string
  ): Promise<RedemptionResult> {
    try {
      // Get card details including business name
      const cardResult = await sql`
        SELECT 
          lc.*,
          u.name as business_name,
          lp.name as program_name,
          c.name as customer_name,
          c.email as customer_email
        FROM loyalty_cards lc
        JOIN users u ON lc.business_id = u.id
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        JOIN customers c ON lc.customer_id = c.id
        WHERE lc.id = ${cardId}
      `;
      
      if (cardResult.length === 0) {
        return { success: false, message: 'Card not found' };
      }
      
      const card = cardResult[0];
      
      // Get available rewards for this program
      const programRewards = await sql`
        SELECT * FROM loyalty_rewards 
        WHERE program_id = ${card.program_id} 
        AND is_active = true
      `;
      
      // Find the specific reward by name
      const reward = programRewards.find((r: any) => r.name === rewardName);
      
      if (!reward) {
        return { success: false, message: 'Reward not found' };
      }
      
      if (reward.is_redeemable === false) {
        return { success: false, message: 'This reward cannot be redeemed' };
      }
      
      // If sufficient points, redeem the reward
      const currentPoints = parseFloat(card.points) || 0;
      const requiredPoints = parseFloat(reward.points) || 0;
      
      if (currentPoints >= requiredPoints) {
        // Start transaction
        const transaction = await sql.begin();
        
        try {
        // Deduct points from card
          await transaction`
          UPDATE loyalty_cards
          SET 
              points = points - ${requiredPoints},
              points_balance = COALESCE(points_balance, 0) - ${requiredPoints},
              total_points_spent = COALESCE(total_points_spent, 0) + ${requiredPoints},
            updated_at = NOW()
          WHERE id = ${cardId}
        `;
          
          // Generate a unique redemption reference
          const redemptionId = uuidv4();
          const customerId = String(card.customer_id);
          const businessId = String(card.business_id);
          const programId = String(card.program_id);
          const programName = String(card.program_name || '');
          const customerName = String(card.customer_name || 'Customer');
          const businessName = String(card.business_name || 'Business');
        
        // Record redemption activity
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
              ${card.customer_id},
              ${card.business_id},
              ${card.program_id},
              'REDEEM',
              ${requiredPoints},
              'CUSTOMER',
              ${`Redeemed reward: ${rewardName}`},
              ${redemptionId},
            NOW()
          )
        `;
          
          await transaction.commit();
          
          // Send notification to customer
          try {
            await CustomerNotificationService.createNotification({
              customerId: customerId,
              businessId: businessId,
              type: 'REWARD_REDEEMED',
              title: 'Reward Redeemed',
              message: `You successfully redeemed your reward: ${rewardName}`,
              data: {
                rewardName: rewardName,
                points: requiredPoints,
                cardId: cardId,
                programId: programId,
                programName: programName
              },
              requiresAction: false,
              actionTaken: true,
              isRead: false
            });
            
            // Send notification to business owner
            await CustomerNotificationService.createNotification({
              customerId: businessId, // Using business ID as recipient
              businessId: businessId,
              type: 'BUSINESS_REWARD_REDEMPTION',
              title: 'Reward Redemption',
              message: `Customer ${customerName} has redeemed a ${rewardName}. Please fulfill the reward.`,
              data: {
                rewardName: rewardName,
                points: requiredPoints,
                cardId: cardId,
                programId: programId,
                programName: programName,
                customerName: customerName,
                customerId: customerId,
                redemptionId: redemptionId
              },
              requiresAction: true,
              actionTaken: false,
              isRead: false
            });
          } catch (notificationError) {
            console.error('Error sending redemption notifications:', notificationError);
            // Continue even if notification fails
          }
        
        // Emit points redeemed event
          try {
        emitPointsRedeemedEvent(
          card.customer_id,
          card.business_id,
              businessName,
              requiredPoints,
          cardId,
          rewardName
        );
            
            // Create sync event for React Query invalidation
            createCardSyncEvent(
              cardId,
              customerId,
              businessId,
              'UPDATE',
              {
                points: currentPoints - requiredPoints,
                rewardRedeemed: rewardName,
                redemptionId: redemptionId
              }
            );
            
            // Use localStorage to trigger UI updates
            localStorage.setItem(`reward_redeemed_${Date.now()}`, JSON.stringify({
              customerId: customerId,
              businessId: businessId,
              cardId: cardId,
              programId: programId,
              rewardName: rewardName,
              points: requiredPoints,
              timestamp: new Date().toISOString()
            }));
          } catch (eventError) {
            console.error('Error emitting redemption events:', eventError);
            // Continue even if event emission fails
          }
        
        // Get updated card
          const updatedCard = await this.getCustomerCard(customerId, businessId);
        
        return {
          success: true,
            message: `Successfully redeemed ${rewardName} for ${requiredPoints} points`,
          updatedCard,
            reward: {
              id: reward.id,
              name: reward.name,
              description: reward.description,
              points: parseFloat(reward.points),
              programId: reward.program_id,
              isActive: reward.is_active,
              imageUrl: reward.image_url,
              isRedeemable: reward.is_redeemable
            }
          };
        } catch (txError) {
          await transaction.rollback();
          throw txError;
        }
      } else {
        return { 
          success: false, 
          message: `Not enough points. You need ${requiredPoints - currentPoints} more points to redeem this reward.`
        };
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      return { success: false, message: 'An error occurred while redeeming the reward' };
    }
  }

  /**
   * Redeem a promo code
   */
  static async redeemPromoCode(
    businessId: string,
    promoCode: string,
    customerId: string
  ): Promise<RedemptionResult> {
    try {
      // Find card with this promo code
      const cardResult = await sql`
        SELECT * FROM loyalty_cards 
        WHERE promo_code = ${promoCode} 
        AND business_id = ${businessId}
      `;
      
      if (!cardResult.length) {
        return { success: false, message: 'Invalid promo code' };
      }
      
      const card = cardResult[0];
      
      // If this is not the customer's own promo code
      if (card.customer_id !== customerId) {
        // Award bonus points to both card owner and person redeeming
        const bonusPoints = 100;
        
        // Add points to promo code owner
        await this.addPoints(card.id, bonusPoints, 'PROMO_CODE_REFERRAL');
        
        // Find redeemer's card
        const redeemerCardResult = await sql`
          SELECT * FROM loyalty_cards 
          WHERE customer_id = ${customerId}
          AND business_id = ${businessId} 
          AND is_active = true
        `;
        
        // If redeemer has a card, add points to it
        if (redeemerCardResult.length > 0) {
          await this.addPoints(redeemerCardResult[0].id, bonusPoints, 'PROMO_CODE_REDEMPTION');
          
          return {
            success: true,
            message: `Successfully redeemed promo code for ${bonusPoints} bonus points!`,
            updatedCard: await this.getCustomerCard(customerId, businessId)
          };
        } else {
          // Create a card for the redeemer
          const newCard = await this.enrollCustomerInProgram(
            customerId,
            businessId,
            cardResult[0].program_id
          );
          
          if (newCard) {
            await this.addPoints(newCard.id, bonusPoints, 'PROMO_CODE_REDEMPTION');
            
            return {
              success: true,
              message: `Successfully joined program and received ${bonusPoints} bonus points!`,
              updatedCard: await this.getCustomerCard(customerId, businessId)
            };
          }
        }
      } else {
        return { success: false, message: 'You cannot redeem your own promo code' };
      }
      
      return { success: false, message: 'Error redeeming promo code' };
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      return { success: false, message: 'An error occurred while redeeming the promo code' };
    }
  }

  /**
   * Get loyalty card activities
   */
  static async getCardActivities(cardId: string, limit: number = 10): Promise<any[]> {
    try {
      const activities = await sql`
        SELECT * FROM card_activities
        WHERE card_id = ${cardId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      
      return activities.map((activity: any) => ({
        id: activity.id,
        cardId: activity.card_id,
        activityType: activity.activity_type,
        points: activity.points,
        description: activity.description,
        transactionReference: activity.transaction_reference,
        createdAt: activity.created_at
      }));
    } catch (error) {
      console.error('Error fetching card activities:', error);
      return [];
    }
  }
  
  /**
   * Get business card statistics
   */
  static async getBusinessCardStats(businessId: string): Promise<any> {
    try {
      // Get total active cards
      const cardsResult = await sql`
        SELECT 
          COUNT(*) as total_cards,
          SUM(CASE WHEN tier = 'STANDARD' THEN 1 ELSE 0 END) as standard_cards,
          SUM(CASE WHEN tier = 'SILVER' THEN 1 ELSE 0 END) as silver_cards,
          SUM(CASE WHEN tier = 'GOLD' THEN 1 ELSE 0 END) as gold_cards, 
          SUM(CASE WHEN tier = 'PLATINUM' THEN 1 ELSE 0 END) as platinum_cards
        FROM loyalty_cards
        WHERE business_id = ${businessId}
        AND is_active = true
      `;
      
      // Get redemption stats
      const redemptionsResult = await sql`
        SELECT COUNT(*) as total_redemptions
        FROM card_activities ca
        JOIN loyalty_cards lc ON ca.card_id = lc.id
        WHERE lc.business_id = ${businessId}
        AND ca.activity_type = 'REDEEM_REWARD'
      `;
      
      return {
        totalCards: parseInt(cardsResult[0]?.total_cards || '0'),
        tierBreakdown: {
          standard: parseInt(cardsResult[0]?.standard_cards || '0'),
          silver: parseInt(cardsResult[0]?.silver_cards || '0'),
          gold: parseInt(cardsResult[0]?.gold_cards || '0'),
          platinum: parseInt(cardsResult[0]?.platinum_cards || '0')
        },
        totalRedemptions: parseInt(redemptionsResult[0]?.total_redemptions || '0')
      };
    } catch (error) {
      console.error('Error fetching business card stats:', error);
      return {
        totalCards: 0,
        tierBreakdown: { standard: 0, silver: 0, gold: 0, platinum: 0 },
        totalRedemptions: 0
      };
    }
  }

  /**
   * Check and update card tier if needed
   */
  private static async checkAndUpdateTier(cardId: string): Promise<boolean> {
    try {
      const cardResult = await sql`
        SELECT * FROM loyalty_cards WHERE id = ${cardId}
      `;
      
      if (!cardResult.length) {
        return false;
      }
      
      const card = cardResult[0];
      const points = parseInt(card.points);
      
      // Find appropriate tier based on points
      let newTier = 'STANDARD';
      let tierData = this.cardTiers[0];
      
      for (let i = this.cardTiers.length - 1; i >= 0; i--) {
        const tier = this.cardTiers[i];
        if (points >= tier.pointsRequired) {
          newTier = tier.tier;
          tierData = tier;
          break;
        }
      }
      
      // If tier changed, update card
      if (newTier !== card.tier) {
        // Find next tier requirements
        const nextTierIndex = this.cardTiers.findIndex(t => t.tier === newTier) + 1;
        const pointsToNext = nextTierIndex < this.cardTiers.length 
          ? this.cardTiers[nextTierIndex].pointsRequired - points
          : null;
        
        await sql`
          UPDATE loyalty_cards
          SET 
            tier = ${newTier},
            card_type = ${newTier},
            benefits = ${tierData.benefits},
            points_multiplier = ${tierData.pointsMultiplier},
            points_to_next = ${pointsToNext},
            available_rewards = ${JSON.stringify(this.getDefaultRewards(newTier))},
            updated_at = NOW()
          WHERE id = ${cardId}
        `;
        
        // Record tier upgrade activity
        await sql`
          INSERT INTO card_activities (
            card_id,
            activity_type,
            points,
            description,
            created_at
          ) VALUES (
            ${cardId},
            'TIER_CHANGE',
            0,
            ${`Upgraded to ${newTier} tier`},
            NOW()
          )
        `;
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking and updating tier:', error);
      return false;
    }
  }

  /**
   * Generate a unique promo code
   */
  private static async generateUniquePromoCode(businessId: string, customerId: string): Promise<string> {
    // Create a base code
    const businessPrefix = `B${businessId}`.substring(0, 3);
    const customerPart = `C${customerId}`.substring(0, 3);
    
    let promoCode: string;
    let isUnique = false;
    
    // Keep generating until a unique code is found
    do {
      // Generate random part (6 characters)
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      promoCode = `${businessPrefix}-${customerPart}-${randomPart}`;
      
      // Check if code exists
      const exists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM loyalty_cards 
          WHERE promo_code = ${promoCode}
        ) as exists
      `;
      
      isUnique = !exists[0].exists;
    } while (!isUnique);
    
    return promoCode;
  }

  /**
   * Get default rewards for a tier
   */
  private static getDefaultRewards(tier: string): Reward[] {
    switch (tier) {
      case 'PLATINUM':
        return [
          { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
          { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
          { name: 'Free Lunch', points: 500, description: 'Enjoy a free lunch item' },
          { name: 'Premium Reward', points: 1000, description: 'Special premium reward' },
          { name: '15% Discount', points: 0, description: 'Automatic 15% discount on all purchases', isRedeemable: false },
          { name: 'Priority Service', points: 0, description: 'Priority service at all locations', isRedeemable: false },
          { name: 'Free Monthly Item', points: 0, description: 'One free item each month', isRedeemable: false },
          { name: 'Exclusive Events', points: 0, description: 'Access to exclusive member events', isRedeemable: false },
          { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
        ];
      case 'GOLD':
        return [
          { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
          { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
          { name: 'Free Lunch', points: 500, description: 'Enjoy a free lunch item' },
          { name: '10% Discount', points: 0, description: 'Automatic 10% discount on all purchases', isRedeemable: false },
          { name: 'Free Monthly Item', points: 0, description: 'One free item each month', isRedeemable: false },
          { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
        ];
      case 'SILVER':
        return [
          { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
          { name: 'Free Pastry', points: 200, description: 'One free pastry of your choice' },
          { name: '5% Discount', points: 0, description: 'Automatic 5% discount on all purchases', isRedeemable: false },
          { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
        ];
      case 'STANDARD':
      default:
        return [
          { name: 'Free Coffee', points: 100, description: 'Enjoy a free coffee of your choice' },
          { name: 'Birthday Gift', points: 0, description: 'Special gift on your birthday', isRedeemable: false }
        ];
    }
  }

  /**
   * Get customer ID by user ID
   */
  static async getCustomerIdByUserId(userId: number | string): Promise<string | null> {
    try {
      const result = await sql`
        SELECT id FROM customers
        WHERE user_id = ${userId}
      `;
      
      if (result && result.length > 0) {
        return result[0].id.toString();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting customer ID by user ID:', error);
      return null;
    }
  }

  /**
   * Get customer information by customer ID
   */
  static async getCustomerInfo(customerId: string): Promise<CustomerInfo | null> {
    try {
      if (!customerId) {
        return null;
      }

      const result = await sql`
        SELECT 
          id, 
          name, 
          email, 
          phone, 
          created_at
        FROM customers
        WHERE id = ${customerId}
      `;

      if (!result.length) {
        return null;
      }

      return {
        id: result[0].id.toString(),
        name: result[0].name || 'Customer',
        email: result[0].email,
        phone: result[0].phone,
        createdAt: result[0].created_at
      };
    } catch (error) {
      console.error('Error fetching customer info:', error);
      return null;
    }
  }

  /**
   * Format a loyalty card from database to API format
   */
  private static formatCard(card: any): LoyaltyCard {
    return {
      id: card.id,
      customerId: card.customer_id,
      businessId: card.business_id,
      programId: card.program_id,
      cardType: card.card_type,
      tier: card.tier || 'STANDARD',
      points: parseInt(card.points) || 0,
      pointsMultiplier: parseFloat(card.points_multiplier) || 1.0,
      promoCode: card.promo_code,
      nextReward: card.next_reward,
      pointsToNext: card.points_to_next ? parseInt(card.points_to_next) : null,
      expiryDate: card.expiry_date,
      benefits: card.benefits || [],
      lastUsed: card.last_used,
      isActive: card.is_active,
      availableRewards: card.available_rewards || this.getDefaultRewards(card.tier || 'STANDARD'),
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      businessName: card.business_name,
      programName: card.program_name,
      cardNumber: card.card_number,
      status: card.status || 'ACTIVE'
    };
  }

  /**
   * Generate a promo code for a specific loyalty card
   */
  static async generatePromoCodeForCard(cardId: string): Promise<{ success: boolean; promoCode?: string; message: string }> {
    try {
      // Get card info
      const cardResult = await sql`
        SELECT 
          lc.*, 
          b.name as business_name
        FROM loyalty_cards lc
        JOIN businesses b ON lc.business_id = b.id
        WHERE lc.id = ${cardId}
      `;
      
      if (!cardResult.length) {
        return { success: false, message: 'Card not found' };
      }
      
      const card = cardResult[0];
      
      // Check if card already has a promo code
      if (card.promo_code) {
        return { success: true, promoCode: card.promo_code, message: 'Existing promo code retrieved' };
      }
      
      // Generate new promo code
      const promoCode = await this.generateUniquePromoCode(card.business_id, card.customer_id);
      
      // Update the card with the promo code
      await sql`
        UPDATE loyalty_cards
        SET promo_code = ${promoCode}, updated_at = NOW()
        WHERE id = ${cardId}
      `;
      
      // Emit promo code generated event
      emitPromoCodeGeneratedEvent(
        card.customer_id,
        card.business_id,
        card.business_name || 'Business',
        cardId,
        promoCode
      );
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.points(card.customer_id) });
      
      return { success: true, promoCode, message: 'Promo code generated successfully' };
    } catch (error) {
      console.error('Error generating promo code for card:', error);
      return { success: false, message: 'An error occurred while generating the promo code' };
    }
  }

  /**
   * Get count of enrollments in program_id=4 for a customer
   */
  static async getProgram4EnrollmentCount(customerId: string): Promise<number> {
    try {
      // Using SQL's casting to handle both string and numeric program_id values
      const result = await sql`
        SELECT COUNT(*) as count
        FROM loyalty_cards
        WHERE customer_id = ${customerId}
        AND (program_id = '4' OR program_id = 4)
        AND is_active = true
      `;
      
      return parseInt(result[0]?.count || '0', 10);
    } catch (error) {
      console.error('Error getting program 4 enrollment count:', error);
      return 0;
    }
  }

  /**
   * Grant a promo code to a customer's loyalty card (for business owners only)
   */
  static async grantPromoCodeToCustomer(
    businessId: string,
    cardId: string,
    customerId: string
  ): Promise<{ success: boolean; promoCode?: string; message: string }> {
    try {
      // Check if card belongs to the customer and business
      const cardResult = await sql`
        SELECT c.*, b.name as business_name
        FROM loyalty_cards c
        JOIN businesses b ON c.business_id = b.id
        WHERE c.id = ${cardId}
        AND c.customer_id = ${customerId}
        AND c.business_id = ${businessId}
        AND c.is_active = true
      `;
      
      if (!cardResult.length) {
        return { success: false, message: 'Card not found or does not belong to this customer and business' };
      }
      
      const card = cardResult[0];
      
      // Check if card already has a promo code
      if (card.promo_code) {
        return { success: true, promoCode: card.promo_code, message: 'Card already has a promo code' };
      }
      
      // Generate new promo code
      const promoCode = await this.generateUniquePromoCode(businessId, customerId);
      
      // Update the card with the promo code
      await sql`
        UPDATE loyalty_cards
        SET promo_code = ${promoCode}, updated_at = NOW()
        WHERE id = ${cardId}
      `;
      
      // Emit promo code generated event
      emitPromoCodeGeneratedEvent(
        customerId,
        businessId,
        card.business_name || 'Business',
        cardId,
        promoCode
      );
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.points(customerId) });
      
      return { success: true, promoCode, message: 'Promo code granted successfully' };
    } catch (error) {
      console.error('Error granting promo code to customer:', error);
      return { success: false, message: 'An error occurred while granting the promo code' };
    }
  }

  /**
   * Synchronize loyalty cards with program enrollments
   * This ensures every enrolled program with status 'ACTIVE' has a corresponding card
   * @param customerId The customer ID
   * @returns Array of created card IDs
   */
  static async syncEnrollmentsToCards(customerId: string): Promise<string[]> {
    try {
      // Find all active program enrollments without corresponding cards
      const missingCardEnrollments = await sql`
        SELECT 
          pe.id as enrollment_id,
          pe.customer_id,
          pe.program_id,
          lp.business_id,
          lp.name as program_name,
          u.name as business_name,
          COALESCE(pe.current_points, 0) as current_points
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        JOIN users u ON lp.business_id = u.id
        LEFT JOIN loyalty_cards lc ON 
          pe.customer_id = lc.customer_id AND 
          pe.program_id = lc.program_id
        WHERE pe.customer_id = ${customerId}
        AND pe.status = 'ACTIVE'
        AND lc.id IS NULL
      `;
      
      if (!missingCardEnrollments.length) {
        return [];
      }
      
      logger.info(`Found ${missingCardEnrollments.length} enrollments without cards for customer ${customerId}`);
      
      // Create cards for each missing enrollment
      const createdCardIds: string[] = [];
      
      for (const enrollment of missingCardEnrollments) {
        try {
          // Generate a unique card number
          const cardNumber = await this.generateUniqueCardNumber(
            String(enrollment.customer_id), 
            String(enrollment.program_id)
          );
          
          // Create the loyalty card
          const cardResult = await sql`
            INSERT INTO loyalty_cards (
              customer_id,
              business_id,
              program_id,
              card_number,
              card_type,
              tier,
              points,
              points_multiplier,
              status,
              created_at,
              updated_at
            ) VALUES (
              ${enrollment.customer_id},
              ${enrollment.business_id},
              ${enrollment.program_id},
              ${cardNumber},
              'STANDARD',
              'STANDARD',
              ${enrollment.current_points || 0},
              1.0,
              'ACTIVE',
              NOW(),
              NOW()
            ) RETURNING id
          `;
          
          if (cardResult.length > 0) {
            const cardId = cardResult[0].id.toString();
            createdCardIds.push(cardId);
            
            // Create card sync event to update UI
            createCardSyncEvent(
              cardId, 
              String(enrollment.customer_id), 
              String(enrollment.business_id), 
              'INSERT', 
              { 
                programId: String(enrollment.program_id), 
                programName: enrollment.program_name,
                businessName: enrollment.business_name
              }
            );
            
            // Create notification for the customer
            const notification = await CustomerNotificationService.createNotification({
              customerId: String(enrollment.customer_id),
              businessId: String(enrollment.business_id),
              type: 'ENROLLMENT',
              title: 'Loyalty Card Created',
              message: `Your loyalty card for ${enrollment.program_name} at ${enrollment.business_name} is ready`,
              requiresAction: false,
              actionTaken: false,
              isRead: false,
              referenceId: String(enrollment.program_id),
              data: {
                programId: String(enrollment.program_id),
                programName: enrollment.program_name,
                businessName: enrollment.business_name,
                cardId
              }
            });
            
            if (notification) {
              // Emit real-time notification using server functions
              try {
                // Check if serverFunctions is available (it might not be in some environments)
                if (typeof serverFunctions !== 'undefined' && serverFunctions.emitNotification) {
                  serverFunctions.emitNotification(String(enrollment.customer_id), notification);
                }
              } catch (emitError) {
                logger.error('Error emitting notification:', emitError);
                // Non-critical error, continue with next enrollment
              }
              
              // Also create a notification sync event
              createNotificationSyncEvent(
                notification.id,
                String(enrollment.customer_id),
                String(enrollment.business_id),
                'INSERT',
                {
                  type: 'ENROLLMENT',
                  programName: enrollment.program_name,
                  businessName: enrollment.business_name,
                  cardId
                }
              );
            }
            
            // Emit enrollment event for analytics and other systems
            try {
              emitEnrollmentEvent(
                String(enrollment.customer_id),
                String(enrollment.business_id),
                String(enrollment.program_id),
                enrollment.program_name,
                enrollment.business_name
              );
            } catch (eventError) {
              logger.error('Error emitting enrollment event:', eventError);
              // Non-critical error, continue with next enrollment
            }
            
            logger.info(`Created loyalty card ${cardId} for enrollment ${enrollment.enrollment_id}`);
          }
        } catch (error) {
          logger.error(`Error creating card for enrollment ${enrollment.enrollment_id}:`, error);
          // Continue with next enrollment
        }
      }
      
      return createdCardIds;
    } catch (error) {
      logger.error('Error synchronizing enrollments to cards:', error);
      return [];
    }
  }

  /**
   * Create a loyalty card for a customer who is already enrolled in a program
   * but doesn't have a card yet
   */
  static async createCardForEnrolledCustomer(
    customerId: string,
    businessId: string,
    programId: string
  ): Promise<LoyaltyCard | null> {
    try {
      console.log(`Creating card for enrolled customer: Customer=${customerId}, Business=${businessId}, Program=${programId}`);
      
      // Verify customer is enrolled in this program
      console.log(`Verifying enrollment for customer ${customerId} in program ${programId}`);
      
      let enrollmentCheck;
      try {
        // Try customer_programs table first
        enrollmentCheck = await sql`
          SELECT * FROM customer_programs 
          WHERE customer_id = ${parseInt(customerId.toString())}
          AND program_id = ${parseInt(programId.toString())}
        `;
      } catch (e) {
        console.warn('Error checking customer_programs table:', e);
        
        // Fallback to program_enrollments table
        try {
          enrollmentCheck = await sql`
            SELECT * FROM program_enrollments
            WHERE customer_id = ${parseInt(customerId.toString())}
            AND program_id = ${parseInt(programId.toString())}
          `;
        } catch (e2) {
          console.warn('Error checking program_enrollments table:', e2);
          
          // Last resort: assume enrollment is valid and proceed
          console.log('Proceeding with card creation despite enrollment check failure');
          enrollmentCheck = [{ id: 1 }]; // Mock enrollment object
        }
      }
      
      if (!enrollmentCheck || !enrollmentCheck.length) {
        console.error('Customer is not enrolled in this program');
        
        // Auto-create enrollment if it doesn't exist
        try {
          console.log('Attempting to create enrollment record first');
          await sql`
            INSERT INTO customer_programs (
              customer_id, program_id, enrollment_date, status, created_at, updated_at
            ) VALUES (
              ${parseInt(customerId.toString())}, 
              ${parseInt(programId.toString())}, 
              NOW(), 
              'ACTIVE',
              NOW(), 
              NOW()
            )
          `;
          console.log('Enrollment record created successfully');
        } catch (enrollError) {
          console.error('Failed to create enrollment record:', enrollError);
          // Continue anyway and try to create the card
        }
      }
      
      console.log('Enrollment verified or created, generating card number');
      
      // Generate unique card number
      const cardNumber = await this.generateUniqueCardNumber(customerId, businessId);
      
      console.log(`Generated card number: ${cardNumber}`);
      
      // Prepare insert fields
      const fieldsToInsert: any = {
        customer_id: parseInt(customerId.toString()),
        business_id: parseInt(businessId.toString()),
        program_id: parseInt(programId.toString()),
        card_number: cardNumber,
        tier: 'STANDARD',
        status: 'ACTIVE',
        is_active: true
      };
      
      // Try to create card with flexible columns based on schema
      let cardId;
      try {
        // First try with all standard fields
        cardId = await sql`
          INSERT INTO loyalty_cards ${sql(fieldsToInsert, 
            'customer_id', 
            'business_id', 
            'program_id', 
            'card_number', 
            'points', 
            'points_balance',
            'tier',
            'status',
            'is_active',
            'created_at', 
            'updated_at'
          )}
          VALUES (
            ${fieldsToInsert.customer_id}, 
            ${fieldsToInsert.business_id}, 
            ${fieldsToInsert.program_id}, 
            ${fieldsToInsert.card_number},
            0, 
            0,
            ${fieldsToInsert.tier},
            ${fieldsToInsert.status},
            ${fieldsToInsert.is_active},
            NOW(), 
            NOW()
          )
          RETURNING *
        `;
      } catch (insertError) {
        console.error('Error inserting loyalty card with standard fields:', insertError);
        
        // Fallback to minimal fields
        try {
          console.log('Trying minimal fields insert');
          cardId = await sql`
            INSERT INTO loyalty_cards (
              customer_id, 
              business_id, 
              program_id, 
              card_number,
              tier,
              status,
              created_at, 
              updated_at
            )
            VALUES (
              ${fieldsToInsert.customer_id}, 
              ${fieldsToInsert.business_id}, 
              ${fieldsToInsert.program_id}, 
              ${fieldsToInsert.card_number},
              ${fieldsToInsert.tier},
              ${fieldsToInsert.status},
              NOW(), 
              NOW()
            )
            RETURNING *
          `;
        } catch (fallbackError) {
          console.error('Error with fallback insert:', fallbackError);
          
          // Last resort with absolute minimum fields
          console.log('Trying absolute minimum fields');
          cardId = await sql`
            INSERT INTO loyalty_cards (
              customer_id, 
              business_id, 
              program_id, 
              card_number
            )
            VALUES (
              ${fieldsToInsert.customer_id}, 
              ${fieldsToInsert.business_id}, 
              ${fieldsToInsert.program_id}, 
              ${fieldsToInsert.card_number}
            )
            RETURNING *
          `;
        }
      }
      
      if (!cardId || !cardId.length) {
        console.error('Failed to create card for enrolled customer');
        return null;
      }
      
      console.log(`Card created successfully with ID ${cardId[0].id}`);
      
      // Format and return the newly created card
      return this.formatCard(cardId[0]);
    } catch (error) {
      console.error('Error creating card for enrolled customer:', error);
      return null;
    }
  }

  /**
   * Get a customer's loyalty card for a specific program
   * @param customerId ID of the customer
   * @param programId ID of the loyalty program
   * @returns The customer's loyalty card for the program or null if not found
   */
  static async getCustomerCardForProgram(
    customerId: string,
    programId: string
  ): Promise<LoyaltyCard | null> {
    try {
      // Convert IDs to strings to ensure proper format
      const customerIdStr = String(customerId);
      const programIdStr = String(programId);
      
      const cards = await sql`
        SELECT 
          lc.*,
          lp.name as program_name,
          lp.business_id,
          b.name as business_name
        FROM loyalty_cards lc
        JOIN loyalty_programs lp ON lc.program_id = lp.id
        LEFT JOIN users b ON lp.business_id = b.id
        WHERE lc.customer_id = ${customerIdStr}
        AND lc.program_id = ${programIdStr}
      `;
      
      if (!cards.length) {
        return null;
      }
      
      const card = cards[0];
      
      return {
        id: card.id.toString(),
        customerId: card.customer_id.toString(),
        programId: card.program_id.toString(),
        businessId: card.business_id?.toString() || '',
        cardNumber: card.card_number || '',
        points: parseInt(card.points || '0', 10),
        pointsBalance: parseInt(card.points_balance || '0', 10),
        tier: card.tier || 'STANDARD',
        status: card.status || 'ACTIVE',
        programName: card.program_name || '',
        businessName: card.business_name || '',
        createdAt: card.created_at ? new Date(card.created_at).toISOString() : new Date().toISOString(),
        updatedAt: card.updated_at ? new Date(card.updated_at).toISOString() : new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching customer card for program:', error);
      return null;
    }
  }
}

export default LoyaltyCardService; 