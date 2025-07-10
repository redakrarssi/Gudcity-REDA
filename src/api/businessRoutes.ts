import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { validateBusinessId, validateUserId } from '../utils/sqlSafety';
import { Business, BusinessListItem, BusinessWithoutSensitiveData, UserRole } from '../types/business';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { logger } from '../utils/logger';
import sql from '../utils/db';
import { CustomerService } from '../services/customerService';

const router = Router();

// Middleware for all routes in this file
router.use((req: Request, res: Response, next: NextFunction) => {
  // Add any middleware specific to business routes here
  next();
});

/**
 * Award points to a customer's loyalty card
 */
router.post('/award-points', auth, async (req: Request, res: Response) => {
  // Debug log for 405 error
  console.log('ROUTE ACCESSED: POST /api/businesses/award-points');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  const { customerId, programId, points, description, source, transactionRef: clientTxRef } = req.body;
  const businessIdStr = String(req.user!.id);
  const customerIdStr = String(customerId);
  const programIdStr = String(programId);
  
  const fullData: any = {
    customerId: customerIdStr,
    programId: programIdStr,
    points,
    timestamp: new Date().toISOString()
  };

  try {
    // Log request details for debugging the 405 issue
    console.log(`Award points request: customer=${customerIdStr}, program=${programIdStr}, points=${points}, business=${businessIdStr}`);
    
    // 1. Validate inputs
    if (!customerId || !programId || !points) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // 2. Get customer name with expanded fallback logic
    let customerName = "Customer #" + customerIdStr; // Default name in case no name is found
    let customerFound = false;
    
    // Try multiple tables to find customer with comprehensive checks
    fullData.customerLookup = {};
    
    // First try users table with customer type
    let customerResult = await sql`
      SELECT id, name FROM users WHERE id = ${customerIdStr} AND user_type = 'customer'
    `;

    if (customerResult.length > 0) {
      customerName = String(customerResult[0].name || customerName);
      fullData.customerSource = 'users';
      customerFound = true;
    } else {
      // Try users table without type restriction
      customerResult = await sql`
        SELECT id, name FROM users WHERE id = ${customerIdStr}
      `;
      
      if (customerResult.length > 0) {
        customerName = String(customerResult[0].name || customerName);
        fullData.customerSource = 'users_no_type';
        customerFound = true;
      } else {
        // Try customers table
        const customerFallback = await sql`
          SELECT id, name FROM customers WHERE id = ${customerIdStr}
        `;
        
        if (customerFallback.length > 0) {
          customerName = String(customerFallback[0].name || customerName);
          fullData.customerSource = 'customers_table';
          customerFound = true;
        } else {
          // Last resort - check if they exist in loyalty_cards
          const cardFallback = await sql`
            SELECT DISTINCT customer_id FROM loyalty_cards 
            WHERE customer_id = ${customerIdStr} LIMIT 1
          `;
          
          if (cardFallback.length > 0) {
            fullData.customerSource = 'loyalty_cards_only';
            customerFound = true;
          } else {
            // Check one last place - customer_programs table
            const programFallback = await sql`
              SELECT DISTINCT customer_id FROM customer_programs
              WHERE customer_id = ${customerIdStr} LIMIT 1
            `;
            
            if (programFallback.length > 0) {
              fullData.customerSource = 'customer_programs_only';
              customerFound = true;
            }
          }
        }
      }
    }
    
    // Return error if customer not found anywhere
    if (!customerFound) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found in any tables', 
        details: fullData
      });
    }
    
    fullData.customerName = customerName;

    // 3. Verify program ownership
    const programResult = await sql`
      SELECT id, name FROM loyalty_programs 
      WHERE id = ${programIdStr} AND business_id = ${businessIdStr}
    `;

    if (programResult.length === 0) {
      return res.status(403).json({ 
        success: false,
        error: 'Program does not belong to this business',
        code: 'PROGRAM_OWNERSHIP_ERROR'
      });
    }
    
    const programName = programResult[0].name;
    fullData.programName = programName;
    
    // Get business name
    const businessResult = await sql`
      SELECT name FROM users WHERE id = ${businessIdStr}
    `;
    const businessName = businessResult.length ? businessResult[0].name : 'Business';
    fullData.businessName = businessName;

    // 4. Find or create a card for this customer in this program
    try {
      let cardId: string;
      
      // Check if customer is enrolled with more thorough query
      const enrollmentCheck = await sql`
        SELECT EXISTS (
          SELECT 1 FROM customer_programs 
          WHERE customer_id = ${customerIdStr}
          AND program_id = ${programIdStr}
        ) AS is_enrolled
      `;
      
      const isEnrolled = enrollmentCheck[0]?.is_enrolled === true;
      fullData.isEnrolled = isEnrolled;

      if (!isEnrolled) {
        // Not enrolled, so enroll them and create a card
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
          const { handlePointsAwarded } = require('../utils/notificationHandler');
          
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
    
    let errorMessage = 'Failed to award points to customer';
    let errorCode = 'POINTS_AWARD_ERROR';
    
    if (error instanceof Error) {
      errorMessage = error.message;
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
    const { password_hash, ...businessWithoutPassword } = business;
    
    res.json(businessWithoutPassword as BusinessWithoutSensitiveData);
  } catch (error) {
    console.error('Error fetching business:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get customers enrolled in a business's programs
 */
interface BusinessEnrollmentResult {
  id: string;
  name: string;
}
router.get('/businesses/:id/enrolled-customers', auth, async (req: Request, res: Response) => {
  try {
    const { id: businessId } = req.params;
    const { programId } = req.query;
    
    if (!businessId || !programId) {
      return res.status(400).json({ error: 'Missing businessId or programId' });
    }
    
    const results = await sql<BusinessEnrollmentResult[]>`
      SELECT u.id, u.name
      FROM users u
      JOIN customer_enrollments ce ON u.id = ce.customer_id
      JOIN loyalty_programs lp ON ce.program_id = lp.id
      WHERE lp.business_id = ${businessId}
      AND u.user_type = 'customer'
      AND ce.program_id = ${programId as string}
    `;
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching enrolled customers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Endpoint to get all business for admin dashboard
 */
router.get('/businesses', auth, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const businesses = await sql<BusinessListItem[]>`
      SELECT id, name, email, created_at 
      FROM users 
      WHERE user_type = 'business'
    `;
    
    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * Get user roles
 */
router.get('/config/roles', auth, async (req: Request, res: Response) => {
  try {
    const roles = await sql<UserRole[]>`SELECT DISTINCT user_type FROM users`;
    res.json(roles.map(r => r.user_type));
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all businesses for config
 */
router.get('/config/businesses', auth, async (req: Request, res: Response) => {
  try {
    const businesses = await sql<Business[]>`SELECT id, name FROM users WHERE user_type = 'business'`;
    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 