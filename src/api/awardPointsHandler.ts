/**
 * Dedicated Award Points Handler
 * 
 * This file contains a standalone implementation of the award-points functionality
 * to ensure it works correctly regardless of route registration issues
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from '../utils/db';
import { normalizeCustomerId, normalizeProgramId, normalizeBusinessId } from '../utils/normalize';
import { logger } from '../utils/logger';

/**
 * Award points to a customer
 * This function can be called directly or mounted as an Express route
 */
export async function handleAwardPoints(req: Request, res: Response) {
  console.log('🎯 AWARD POINTS DIRECT HANDLER ACCESSED');
  console.log('🎯 Request method:', req.method);
  console.log('🎯 Request URL:', req.originalUrl);
  console.log('🎯 Request body:', req.body);

  // Extra debug information
  console.log('🎯 Request headers:', req.headers);
  
  try {
    // Extract request data
    const { customerId, programId, points, description, source, transactionRef: clientTxRef } = req.body;
    
    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      console.error('❌ Missing authentication or user ID');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const businessIdStr = String(req.user.id);
    
    // Validate required fields
    if (!customerId || !programId || !points) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        requiredFields: ['customerId', 'programId', 'points'],
        providedFields: Object.keys(req.body || {})
      });
    }
    
    // Normalize IDs to strict integers
    let customerIdInt: number;
    let programIdInt: number;
    let businessIdInt: number;
    try {
      customerIdInt = normalizeCustomerId(customerId);
      programIdInt = normalizeProgramId(programId);
      businessIdInt = normalizeBusinessId(businessIdStr);
    } catch (e: any) {
      return res.status(400).json({ success: false, error: e?.message || 'Invalid identifiers' });
    }
    const customerIdStr = String(customerIdInt);
    const programIdStr = String(programIdInt);
    
    // Validate points is a positive number
    if (isNaN(points) || points <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Points must be a positive number' 
      });
    }
    
    console.log(`Award points request: customer=${customerIdStr}, program=${programIdStr}, points=${points}, business=${businessIdStr}`);
    
    // 1. Check if program exists
    const programResult = await sql`
      SELECT p.*, b.name as business_name
      FROM loyalty_programs p
      JOIN users b ON p.business_id = b.id
      WHERE p.id = ${programIdStr}
    `;
    
    if (programResult.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `Program with ID ${programIdStr} not found` 
      });
    }
    
    const program = programResult[0];
    const programName = program.name;
    const businessName = program.business_name;
    
    // 2. Check if the program belongs to the business
    if (program.business_id !== businessIdInt) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to award points for this program' 
      });
    }
    
    // 3. Check if customer exists
    let customerName = "Customer #" + customerIdStr;
    const customerResult = await sql`
      SELECT id, name FROM users WHERE id = ${customerIdInt} AND user_type = 'customer'
    `;
    
    if (customerResult.length > 0) {
      customerName = customerResult[0].name;
    }
    
    // 4. Find or create loyalty card
    let cardId: string;
    
    const cardResult = await sql`
      SELECT id FROM loyalty_cards
      WHERE customer_id = ${customerIdInt}
      AND program_id = ${programIdInt}
      LIMIT 1
    `;
    
    if (cardResult.length === 0) {
      // Create new card
      const inserted = await sql`
        INSERT INTO loyalty_cards (
          customer_id,
          program_id,
          business_id,
          points,
          card_number,
          status,
          card_type,
          tier,
          points_multiplier,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${customerIdInt},
          ${programIdInt},
          ${businessIdInt},
          ${points},
          ${'GC-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')},
          'ACTIVE',
          'STANDARD',
          'STANDARD',
          1.0,
          TRUE,
          NOW(),
          NOW()
        ) RETURNING id
      `;
      cardId = inserted[0].id;
      
      console.log(`Created new card ${cardId} for customer ${customerIdStr} in program ${programIdStr}`);
    } else {
      // Update existing card
      cardId = cardResult[0].id;
      
      await sql`
        UPDATE loyalty_cards
        SET 
          points = points + ${points},
          updated_at = NOW()
        WHERE id = ${cardId}
      `;
      
      console.log(`Updated card ${cardId} for customer ${customerIdStr} in program ${programIdStr}`);
    }
    
    // 5. Record the transaction
    const transactionRef = clientTxRef || `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    await sql`
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
        ${customerIdInt},
        ${businessIdInt},
        ${programIdInt},
        'CREDIT',
        ${points},
        ${source || 'DIRECT_HANDLER'},
        ${description || `Points awarded by ${businessName}`},
        ${transactionRef},
        NOW()
      )
    `;
    
    console.log(`Recorded transaction ${transactionRef} for ${points} points`);
    
    // 6. Try to send notification (non-critical)
    try {
      // Create notification record
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
          ${customerIdInt},
          ${businessIdInt},
          'POINTS_ADDED',
          'Points Added',
          ${`You've received ${points} points from ${businessName} in the program ${programName}`},
          ${JSON.stringify({
            points: points,
            cardId: cardId,
            programId: programIdStr,
            programName: programName,
            source: source || 'DIRECT_HANDLER',
            timestamp: new Date().toISOString()
          })},
          ${String(cardId)},
          false,
          false,
          false,
          ${new Date().toISOString()}
        )
      `;
      
      console.log(`Created notification ${notificationId} for customer ${customerIdStr}`);
    } catch (notificationError) {
      console.warn('Failed to create notification, continuing anyway:', notificationError);
    }
    
    // 7. Return success response
    return res.status(200).json({
      success: true,
      message: `Successfully awarded ${points} points to customer ${customerName}`,
      data: {
        customerId: customerIdStr,
        programId: programIdStr,
        points,
        cardId,
        transactionRef,
        handler: 'direct-handler'
      }
    });
  } catch (error) {
    console.error('Error in award points direct handler:', error);
    
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'DIRECT_HANDLER_ERROR',
      handler: 'direct-handler'
    });
  }
}

/**
 * Create an express route handler for the award points functionality
 * This can be used to register the route directly
 */
export function createAwardPointsRoute(requireAuth: (req: Request, res: Response, next: Function) => void) {
  return [requireAuth, handleAwardPoints];
} 