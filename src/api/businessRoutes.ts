import { Router, Request, Response } from 'express';
import sql, { SqlRow } from '../utils/db';
import { auth } from '../middleware/auth';
import { validateBusinessId, validateUserId } from '../utils/sqlSafety';
import { Business, BusinessListItem, BusinessWithoutSensitiveData, UserRole } from '../types/business';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Award points to a customer's loyalty card
 */
router.post('/businesses/award-points', auth, async (req: Request, res: Response) => {
  try {
    // 1. Validate request parameters
    const { customerId, programId, points, description, source = 'API' } = req.body;
    const businessId = req.user?.id;
    
    if (!businessId) {
      return res.status(401).json({ error: 'Unauthorized. Business ID not found in token.', code: 'UNAUTHORIZED' });
    }
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required.', code: 'MISSING_CUSTOMER_ID' });
    }
    
    if (!programId) {
      return res.status(400).json({ error: 'Program ID is required.', code: 'MISSING_PROGRAM_ID' });
    }
    
    if (!points || points <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number.', code: 'INVALID_POINTS' });
    }
    
    // 2. Convert IDs to strings to ensure proper format
    const customerIdStr = String(customerId);
    const businessIdStr = String(businessId);
    const programIdStr = String(programId);
    
    logger.info('Awarding points via API', { 
      customerId: customerIdStr, 
      businessId: businessIdStr, 
      programId: programIdStr, 
      points 
    });
    
    // 3. Verify the business owns the program
    const programOwnership = await sql`
      SELECT id, name FROM loyalty_programs 
      WHERE id = ${programIdStr} 
      AND business_id = ${businessIdStr}
    `;
    
    if (!programOwnership.length) {
      logger.warn('Program ownership verification failed', { programId: programIdStr, businessId: businessIdStr });
      return res.status(403).json({ 
        error: 'Program not found or not owned by this business.', 
        code: 'PROGRAM_OWNERSHIP_ERROR' 
      });
    }
    
    const programName = programOwnership[0].name;
    
    // Get business name for notifications
    const businessInfo = await sql`
      SELECT name FROM users WHERE id = ${businessIdStr} AND user_type = 'business'
    `;
    
    const businessName = businessInfo.length ? businessInfo[0].name : 'Business';
    
    // Get customer name for notifications
    const customerInfo = await sql`
      SELECT name FROM users WHERE id = ${customerIdStr} AND user_type = 'customer'
    `;
    
    const customerName = customerInfo.length ? customerInfo[0].name : 'Customer';
    
    // 4. Find or create a card for this customer in this program
    try {
      // Check if customer is enrolled
      const enrollmentStatus = await sql`
        SELECT * FROM customer_programs
        WHERE customer_id = ${customerIdStr}
        AND program_id = ${programIdStr}
      `;
      
      let cardId: string;
      let fullData: any = {
        customerId: customerIdStr,
        businessId: businessIdStr,
        programId: programIdStr,
        points,
        source,
        timestamp: new Date().toISOString(),
        programName,
        businessName,
        customerName
      };
      
      if (!enrollmentStatus.length) {
        // Customer not enrolled, enroll them and create card
        logger.info('Customer not enrolled, creating enrollment and card', { 
          customerId: customerIdStr, 
          programId: programIdStr 
        });
        
        try {
          const card = await LoyaltyCardService.enrollCustomerInProgram(
            customerIdStr,
            businessIdStr,
            programIdStr
          );
          
          if (!card || !card.id) {
            throw new Error('Failed to create loyalty card for customer');
          }
          
          cardId = String(card.id);
          fullData.cardId = cardId;
          fullData.cardCreated = true;
          fullData.enrollmentCreated = true;
        } catch (enrollError) {
          logger.error('Failed to enroll customer', {
            error: enrollError instanceof Error ? enrollError.message : 'Unknown error',
            customerId: customerIdStr,
            programId: programIdStr
          });
          
          return res.status(500).json({
            success: false,
            error: 'Failed to enroll customer in the program',
            code: 'ENROLLMENT_ERROR',
            details: enrollError instanceof Error ? enrollError.message : 'Unknown error'
          });
        }
      } else {
        // Customer is enrolled, find card
        const cardResult = await sql`
          SELECT id FROM loyalty_cards
          WHERE customer_id = ${customerIdStr}
          AND program_id = ${programIdStr}
        `;
        
        if (!cardResult.length) {
          // Enrolled but no card, create a card
          logger.info('Customer enrolled but no card found, creating card', { 
            customerId: customerIdStr, 
            programId: programIdStr 
          });
          
          try {
            const card = await LoyaltyCardService.createCardForEnrolledCustomer(
              customerIdStr,
              businessIdStr,
              programIdStr
            );
            
            if (!card || !card.id) {
              throw new Error('Failed to create loyalty card for enrolled customer');
            }
            
            cardId = String(card.id);
            fullData.cardId = cardId;
            fullData.cardCreatedForEnrolled = true;
          } catch (cardError) {
            logger.error('Failed to create card for enrolled customer', {
              error: cardError instanceof Error ? cardError.message : 'Unknown error',
              customerId: customerIdStr,
              programId: programIdStr
            });
            
            // Try one more time with a direct insert
            try {
              const insertResult = await sql`
                INSERT INTO loyalty_cards (
                  customer_id, program_id, business_id, points, points_balance, created_at
                ) VALUES (
                  ${customerIdStr}, ${programIdStr}, ${businessIdStr}, 0, 0, NOW()
                ) RETURNING id
              `;
              
              if (insertResult && insertResult.length > 0) {
                cardId = String(insertResult[0].id);
                fullData.cardId = cardId;
                fullData.cardCreatedDirectly = true;
              } else {
                throw new Error('Direct card creation failed');
              }
            } catch (directError) {
              return res.status(500).json({
                success: false,
                error: 'Failed to create loyalty card for enrolled customer',
                code: 'CARD_CREATION_ERROR',
                details: directError instanceof Error ? directError.message : 'Unknown error'
              });
            }
          }
        } else {
          cardId = String(cardResult[0].id);
          fullData.cardId = cardId;
          fullData.cardFound = true;
        }
      }
      
      // 5. Award points to the card
      const transactionRef = `api-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      fullData.transactionRef = transactionRef;
      
      const result = await LoyaltyCardService.awardPointsToCard(
        cardId,
        points,
        source as any,
        description || `Points awarded by ${businessName}`,
        transactionRef,
        businessIdStr
      );
      
      fullData.awardingPoints = {
        cardId,
        points,
        source,
        description: description || `Points awarded by ${businessName}`,
        transactionRef,
        businessId: businessIdStr
      };
      
      if (result.success) {
        fullData.pointsAwarded = true;
        
        // Ensure notification is sent
        try {
          // Import at the top of the file
          const { handlePointsAwarded } = require('../utils/notificationHandler');
          
          // Create notification
          await handlePointsAwarded(
            customerIdStr,
            businessIdStr,
            programIdStr,
            programName,
            businessName,
            points,
            cardId,
            source
          );
          
          fullData.notificationSent = true;
          
          // Dispatch a custom event for real-time UI updates
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('points-awarded', {
              detail: {
                customerId: customerIdStr,
                businessId: businessIdStr,
                programId: programIdStr,
                programName,
                businessName,
                points,
                cardId,
                source
              }
            });
            window.dispatchEvent(event);
            fullData.eventDispatched = true;
          }
        } catch (notificationError) {
          logger.warn('Failed to send notification, but points were awarded', {
            error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
            cardId,
            customerId: customerIdStr
          });
          fullData.notificationError = notificationError instanceof Error ? notificationError.message : 'Unknown error';
        }
        
        return res.status(200).json({
          success: true,
          message: `Successfully awarded ${points} points to customer ${customerName}`,
          data: {
            ...fullData,
            diagnostics: result.diagnostics
          }
        });
      } else {
        fullData.pointsAwarded = false;
        fullData.error = result.error;
        fullData.diagnostics = result.diagnostics;
        
        logger.error('Failed to award points to card', { 
          error: result.error, 
          cardId, 
          customerId: customerIdStr
        });
        
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to award points to card',
          code: 'POINTS_AWARD_ERROR',
          diagnostics: fullData
        });
      }
    } catch (error) {
      logger.error('Error in point award process', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: customerIdStr,
        businessId: businessIdStr,
        programId: programIdStr
      });
      
      throw error;
    }
  } catch (error) {
    console.error('Error awarding points:', error);
    
    // Provide detailed error information based on the error type
    let errorMessage = 'Failed to award points to customer';
    let errorCode = 'POINTS_AWARD_ERROR';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error types
      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('violates foreign key')) {
        errorCode = 'DATABASE_CONSTRAINT_ERROR';
      } else if (errorMessage.includes('does not exist')) {
        errorCode = 'SCHEMA_ERROR';
      } else if (errorMessage.includes('connection')) {
        errorCode = 'DATABASE_CONNECTION_ERROR';
      }
    }
    
    return res.status(500).json({ 
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
});

/**
 * Get business information by ID
 */
router.get('/businesses/:id', auth, async (req: Request, res: Response) => {
  try {
    // Validate and sanitize the business ID
    const businessId = validateBusinessId(req.params.id);
    
    const businessResult = await sql<Business[]>`
      SELECT * FROM users
      WHERE id = ${businessId}
      AND user_type = 'business'
    `;
    
    if (!businessResult.length) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const business = businessResult[0];
    
    // Remove sensitive information
    const { password, ...businessWithoutPassword } = business;
    
    res.json(businessWithoutPassword as BusinessWithoutSensitiveData);
  } catch (error) {
    console.error('Error fetching business:', error);
    
    // Handle validation errors with a 400 response
    if (error instanceof Error && error.message.includes('Invalid business ID')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to fetch business information' });
  }
});

/**
 * Get default businesses for auto-enrollment in loyalty programs
 */
router.get('/businesses/default-for-enrollment', async (req: Request, res: Response) => {
  try {
    // Query for businesses with active loyalty programs
    interface BusinessEnrollmentResult {
      id: number | string;
      name: string;
      business_name?: string;
    }
    
    const businesses = await sql<BusinessEnrollmentResult[]>`
      SELECT DISTINCT u.id, u.name, u.business_name 
      FROM users u
      JOIN loyalty_programs lp ON u.id::text = lp.business_id
      WHERE u.user_type = 'business'
      AND u.status = 'active'
      AND lp.status = 'ACTIVE'
      LIMIT 5 -- Limit to 5 businesses for initial enrollment
    `;
    
    // Format the response
    const formattedBusinesses: BusinessListItem[] = businesses.map((business) => ({
      id: business.id.toString(),
      name: business.business_name || business.name || 'Unknown Business'
    }));
    
    res.json(formattedBusinesses);
  } catch (error) {
    console.error('Error fetching default businesses for enrollment:', error);
    res.status(500).json({ error: 'Failed to fetch default businesses' });
  }
});

/**
 * Get all businesses (admin only)
 */
router.get('/businesses', auth, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    const userId = validateUserId(req.user?.id);
    
    const userCheck = await sql<UserRole[]>`
      SELECT role FROM users
      WHERE id = ${userId}
    `;
    
    if (!userCheck.length || userCheck[0].role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    const businesses = await sql<Business[]>`
      SELECT * FROM users
      WHERE user_type = 'business'
    `;
    
    // Remove sensitive information
    const sanitizedBusinesses: BusinessWithoutSensitiveData[] = businesses.map((business) => {
      const { password, ...rest } = business;
      return rest as BusinessWithoutSensitiveData;
    });
    
    res.json(sanitizedBusinesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    
    // Handle validation errors with a 400 response
    if (error instanceof Error && (error.message.includes('Invalid user ID') || error.message.includes('required'))) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

export default router; 