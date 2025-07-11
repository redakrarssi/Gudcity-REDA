import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { validateBusinessId, validateUserId } from '../utils/sqlSafety';
import { Business, BusinessListItem, BusinessWithoutSensitiveData, UserRole } from '../types/business';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { logger } from '../utils/logger';
import sql from '../utils/db';
import { CustomerService } from '../services/customerService';
import { v4 as uuidv4 } from 'uuid';

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

  // Set a timeout to ensure we always respond
  const responseTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('Response timeout triggered for award-points endpoint');
      return res.status(500).json({
        success: false,
        error: 'Server processing timed out',
        code: 'RESPONSE_TIMEOUT',
        diagnostics: { 
          ...fullData,
          timeoutTriggered: true
        }
      });
    }
  }, 8000); // 8 second timeout

  try {
    // Log request details for debugging
    console.log(`Award points request: customer=${customerIdStr}, program=${programIdStr}, points=${points}, business=${businessIdStr}`);
    
    // 1. Validate inputs
    if (!customerId || !programId || !points) {
      clearTimeout(responseTimeout);
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    if (isNaN(points) || points <= 0) {
      clearTimeout(responseTimeout);
      return res.status(400).json({ 
        success: false, 
        error: 'Points must be a positive number' 
      });
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
      customerName = customerResult[0].name;
      customerFound = true;
      fullData.customerLookup.usersTable = true;
    } else {
      // Try customers table as fallback
      try {
        customerResult = await sql`SELECT id, name FROM customers WHERE id = ${customerIdStr}`;
        
        if (customerResult.length > 0) {
          customerName = customerResult[0].name;
          customerFound = true;
          fullData.customerLookup.customersTable = true;
        }
      } catch (customerLookupError) {
        // Continue even if this lookup fails
        console.warn('Customer lookup in customers table failed:', customerLookupError);
        fullData.customerLookup.customersTableError = true;
      }
    }
    
    if (!customerFound) {
      console.warn(`Customer with ID ${customerIdStr} not found in any table`);
      fullData.customerLookup.found = false;
      // We'll continue anyway, just using the default name
    } else {
      fullData.customerLookup.found = true;
      fullData.customerLookup.name = customerName;
    }
    
    // 3. Get program details
    const programResult = await sql`
      SELECT p.*, b.name as business_name
      FROM loyalty_programs p
      JOIN users b ON p.business_id = b.id
      WHERE p.id = ${programIdStr}
    `;
    
    if (programResult.length === 0) {
      clearTimeout(responseTimeout);
      return res.status(404).json({ 
        success: false, 
        error: `Program with ID ${programIdStr} not found` 
      });
    }
    
    const program = programResult[0];
    const programName = program.name;
    const businessName = program.business_name;
    
    // 4. Check if the program belongs to the business
    if (program.business_id !== parseInt(businessIdStr)) {
      clearTimeout(responseTimeout);
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to award points for this program' 
      });
    }
    
    // 5. Find customer card for this program or create one if needed
    let cardId: string;
    let cardExists = true;
    
    const cardResult = await sql`
      SELECT id FROM loyalty_cards
      WHERE customer_id = ${customerIdStr}::integer
      AND program_id = ${programIdStr}::integer
      LIMIT 1
    `;
    
    if (cardResult.length === 0) {
      // No card exists, create one
      cardExists = false;
      
      // Generate a UUID for the new card
      const newCardId = uuidv4();
      
      try {
        await sql`
          INSERT INTO loyalty_cards (
            id,
            customer_id,
            program_id,
            business_id,
            points,
            points_balance,
            total_points_earned,
            created_at,
            updated_at
          ) VALUES (
            ${newCardId},
            ${customerIdStr}::integer,
            ${programIdStr}::integer,
            ${businessIdStr}::integer,
            0,
            0,
            0,
            NOW(),
            NOW()
          )
        `;
        
        cardId = newCardId;
        fullData.cardCreated = true;
      } catch (cardCreationError) {
        console.error('Failed to create loyalty card:', cardCreationError);
        clearTimeout(responseTimeout);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create loyalty card for customer', 
          code: 'CARD_CREATION_ERROR',
          details: cardCreationError instanceof Error ? cardCreationError.message : String(cardCreationError)
        });
      }
    } else {
      // Card exists
      cardId = cardResult[0].id;
      fullData.cardExists = true;
    }
    
    // 6. Award points to the card
    const transactionRef = clientTxRef || `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    fullData.awardingPoints = {
      cardId,
      points,
      source,
      description: description || `Points awarded by ${businessName}`,
      transactionRef,
      businessId: businessIdStr
    };
    
    // Use the LoyaltyCardService to award points
    const { LoyaltyCardService } = await import('../services/loyaltyCardService');
    
    const result = await LoyaltyCardService.awardPointsToCard(
      cardId,
      points,
      source || 'MANUAL',
      description || `Points awarded by ${businessName}`,
      transactionRef,
      businessIdStr
    );
    
    if (result.success) {
      fullData.pointsAwarded = true;
      
      // Ensure notification is sent
      try {
        const { handlePointsAwarded } = await import('../utils/notificationHandler');
        
        await handlePointsAwarded(
          customerIdStr,
          businessIdStr,
          programIdStr,
          programName,
          businessName,
          points,
          cardId,
          source || 'MANUAL'
        );
        
        fullData.notificationSent = true;
      } catch (notificationError) {
        logger.warn('Failed to send notification, but points were awarded', {
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
          cardId,
          customerId: customerIdStr
        });
        fullData.notificationError = notificationError instanceof Error ? notificationError.message : 'Unknown error';
        
        // Try a direct notification insertion as a fallback
        try {
          const notificationId = uuidv4();
          
          await sql`
            INSERT INTO customer_notifications (
              id,
              customer_id,
              business_id,
              type,
              title,
              message,
              data,
              reference_id,
              requires_action,
              action_taken,
              is_read,
              created_at
            ) VALUES (
              ${notificationId},
              ${parseInt(customerIdStr)},
              ${parseInt(businessIdStr)},
              'POINTS_ADDED',
              'Points Added',
              ${`You've received ${points} points from ${businessName} in ${programName}`},
              ${JSON.stringify({
                points: points,
                cardId: cardId,
                programId: programIdStr,
                programName: programName,
                source: source || 'MANUAL',
                timestamp: new Date().toISOString()
              })},
              ${cardId},
              false,
              false,
              false,
              ${new Date().toISOString()}
            )
          `;
          
          fullData.directNotificationCreated = true;
        } catch (directNotificationError) {
          console.error('Failed to create direct notification:', directNotificationError);
          fullData.directNotificationError = directNotificationError instanceof Error ? 
            directNotificationError.message : 'Unknown error';
        }
      }
      
      clearTimeout(responseTimeout);
      return res.status(200).json({
        success: true,
        message: `Successfully awarded ${points} points to customer ${customerName}`,
        data: {
          customerId: customerIdStr,
          programId: programIdStr,
          points,
          cardId,
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
      
      clearTimeout(responseTimeout);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to award points to card',
        code: 'POINTS_AWARD_ERROR',
        diagnostics: fullData
      });
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
    
    clearTimeout(responseTimeout);
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