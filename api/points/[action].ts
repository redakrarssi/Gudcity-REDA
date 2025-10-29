import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  withCors, 
  withErrorHandler, 
  withAuth,
  withRateLimit,
  sendSuccess, 
  sendError,
  sendCreated,
  getPaginationParams,
  sql,
  sanitizeInput,
  withTransaction,
  AuthenticatedRequest
} from '../_middleware/index.js';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  const { action } = req.query;
  
  switch (action) {
    case 'award':
      return handleAwardPoints(req, res);
    case 'redeem':
      return handleRedeemPoints(req, res);
    case 'history':
      return handlePointsHistory(req, res);
    case 'balance':
      return handlePointsBalance(req, res);
    case 'calculate':
      return handleCalculatePoints(req, res);
    case 'transfer':
      return handleTransferPoints(req, res);
    default:
      return sendError(res, 'Invalid action', 404);
  }
}

// Award points to customer
async function handleAwardPoints(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { customerId, programId, points, description = 'Points awarded', source = 'API' } = sanitizeInput(req.body);
    
    if (!customerId || !programId || !points) {
      return sendError(res, 'Customer ID, program ID, and points are required', 400);
    }
    
    if (points <= 0) {
      return sendError(res, 'Points must be greater than 0', 400);
    }
    
    // Verify program exists and user has access
    const programs = await sql`
      SELECT lp.*, b.owner_id, b.name as business_name
      FROM loyalty_programs lp
      JOIN businesses b ON lp.business_id = b.id
      WHERE lp.id = ${programId} AND lp.status = 'ACTIVE'
    `;
    
    if (programs.length === 0) {
      return sendError(res, 'Program not found or inactive', 404);
    }
    
    const program = programs[0];
    
    // Check access (owner, staff, or admin)
    if (req.user?.role !== 'ADMIN' && program.owner_id !== req.user?.userId) {
      const staffAccess = await sql`
        SELECT 1 FROM business_staff 
        WHERE business_id = ${program.business_id} AND user_id = ${req.user?.userId} AND status = 'ACTIVE'
      `;
      
      if (staffAccess.length === 0) {
        return sendError(res, 'Insufficient permissions', 403);
      }
    }
    
    // Use transaction for points awarding
    const result = await withTransaction(async (trxSql) => {
      // Check if customer is enrolled in program
      let enrollment = await trxSql`
        SELECT * FROM program_enrollments 
        WHERE customer_id = ${customerId} AND program_id = ${programId}
      ` as any[];
      
      if (enrollment.length === 0) {
        // Auto-enroll customer
        await trxSql`
          INSERT INTO program_enrollments (customer_id, program_id, current_points, status, enrolled_at)
          VALUES (${customerId}, ${programId}, 0, 'ACTIVE', NOW())
        `;
        
        enrollment = await trxSql`
          SELECT * FROM program_enrollments 
          WHERE customer_id = ${customerId} AND program_id = ${programId}
        ` as any[];
      }
      
      // Award points
      const updatedEnrollment = await trxSql`
        UPDATE program_enrollments 
        SET current_points = current_points + ${points}, 
            total_points_earned = total_points_earned + ${points},
            last_activity = NOW()
        WHERE customer_id = ${customerId} AND program_id = ${programId}
        RETURNING *
      ` as any[];
      
      // Record transaction
      const transaction = await trxSql`
        INSERT INTO point_transactions (
          customer_id, program_id, business_id, transaction_type, points, 
          description, source, performed_by, created_at
        )
        VALUES (
          ${customerId}, ${programId}, ${program.business_id}, 'EARN', ${points},
          ${description}, ${source}, ${req.user?.userId}, NOW()
        )
        RETURNING *
      ` as any[];
      
      return { enrollment: updatedEnrollment[0], transaction: transaction[0] };
    });
    
    return sendCreated(res, result, 'Points awarded successfully');
    
  } catch (error) {
    console.error('Error awarding points:', error);
    return sendError(res, 'Failed to award points', 500);
  }
}

// Redeem points
async function handleRedeemPoints(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { customerId, programId, points, rewardDescription } = sanitizeInput(req.body);
    
    if (!customerId || !programId || !points || !rewardDescription) {
      return sendError(res, 'All fields are required', 400);
    }
    
    if (points <= 0) {
      return sendError(res, 'Points must be greater than 0', 400);
    }
    
    // Use transaction for redemption
    const result = await withTransaction(async (trxSql) => {
      // Check current balance
      const enrollments = await trxSql`
        SELECT * FROM program_enrollments 
        WHERE customer_id = ${customerId} AND program_id = ${programId} AND status = 'ACTIVE'
      ` as any[];
      
      if (enrollments.length === 0) {
        throw new Error('Customer not enrolled in program');
      }
      
      const enrollment = enrollments[0];
      if (enrollment.current_points < points) {
        throw new Error('Insufficient points balance');
      }
      
      // Deduct points
      const updatedEnrollment = await trxSql`
        UPDATE program_enrollments 
        SET current_points = current_points - ${points},
            total_points_redeemed = total_points_redeemed + ${points},
            last_activity = NOW()
        WHERE customer_id = ${customerId} AND program_id = ${programId}
        RETURNING *
      ` as any[];
      
      // Record transaction
      const transaction = await trxSql`
        INSERT INTO point_transactions (
          customer_id, program_id, transaction_type, points, 
          description, performed_by, created_at
        )
        VALUES (
          ${customerId}, ${programId}, 'REDEEM', ${points},
          ${rewardDescription}, ${req.user?.userId}, NOW()
        )
        RETURNING *
      ` as any[];
      
      return { enrollment: updatedEnrollment[0], transaction: transaction[0] };
    });
    
    return sendSuccess(res, result, 'Points redeemed successfully');
    
  } catch (error) {
    console.error('Error redeeming points:', error);
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to redeem points', 500);
  }
}

// Get points history
async function handlePointsHistory(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { customerId, programId } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);
    
    if (!customerId) {
      return sendError(res, 'Customer ID is required', 400);
    }
    
    let whereClause = `WHERE pt.customer_id = $1`;
    const params = [customerId];
    
    if (programId) {
      whereClause += ` AND pt.program_id = $${params.length + 1}`;
      params.push(programId);
    }
    
    // Get transaction history
    const historyQuery = `
      SELECT 
        pt.*,
        lp.name as program_name,
        b.name as business_name,
        u.name as performed_by_name
      FROM point_transactions pt
      LEFT JOIN loyalty_programs lp ON pt.program_id = lp.id
      LEFT JOIN businesses b ON pt.business_id = b.id
      LEFT JOIN users u ON pt.performed_by = u.id
      ${whereClause}
      ORDER BY pt.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(String(limit), String(offset));
    
    const history = await sql.query(historyQuery, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM point_transactions pt ${whereClause}`;
    const countResult = await sql.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult[0].total);
    
    return sendSuccess(res, { 
      transactions: history,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
    
  } catch (error) {
    console.error('Error fetching points history:', error);
    return sendError(res, 'Failed to fetch points history', 500);
  }
}

// Get current points balance
async function handlePointsBalance(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { customerId, programId } = req.query;
    
    if (!customerId) {
      return sendError(res, 'Customer ID is required', 400);
    }
    
    let query;
    let params;
    
    if (programId) {
      query = `
        SELECT 
          pe.*,
          lp.name as program_name,
          b.name as business_name
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        JOIN businesses b ON lp.business_id = b.id
        WHERE pe.customer_id = $1 AND pe.program_id = $2 AND pe.status = 'ACTIVE'
      `;
      params = [customerId, programId];
    } else {
      query = `
        SELECT 
          pe.*,
          lp.name as program_name,
          b.name as business_name
        FROM program_enrollments pe
        JOIN loyalty_programs lp ON pe.program_id = lp.id
        JOIN businesses b ON lp.business_id = b.id
        WHERE pe.customer_id = $1 AND pe.status = 'ACTIVE'
        ORDER BY pe.current_points DESC
      `;
      params = [customerId];
    }
    
    const balances = await sql.query(query, params);
    
    return sendSuccess(res, balances);
    
  } catch (error) {
    console.error('Error fetching points balance:', error);
    return sendError(res, 'Failed to fetch points balance', 500);
  }
}

// Calculate points for purchase
async function handleCalculatePoints(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  try {
    const { programId, purchaseAmount, isFirstPurchase = false } = sanitizeInput(req.body);
    
    if (!programId || purchaseAmount === undefined) {
      return sendError(res, 'Program ID and purchase amount are required', 400);
    }
    
    // Get program details
    const programs = await sql`
      SELECT * FROM loyalty_programs WHERE id = ${programId} AND status = 'ACTIVE'
    `;
    
    if (programs.length === 0) {
      return sendError(res, 'Program not found', 404);
    }
    
    const program = programs[0];
    let points = 0;
    
    // Calculate base points
    if (program.points_per_dollar > 0) {
      points += Math.floor(purchaseAmount * program.points_per_dollar);
    }
    
    // Add visit bonus
    if (program.points_per_visit > 0) {
      points += program.points_per_visit;
    }
    
    // First purchase bonus
    if (isFirstPurchase && program.first_purchase_bonus > 0) {
      points += program.first_purchase_bonus;
    }
    
    return sendSuccess(res, {
      programId,
      purchaseAmount,
      pointsEarned: points,
      breakdown: {
        dollarPoints: Math.floor(purchaseAmount * (program.points_per_dollar || 0)),
        visitPoints: program.points_per_visit || 0,
        firstPurchaseBonus: isFirstPurchase ? (program.first_purchase_bonus || 0) : 0
      }
    });
    
  } catch (error) {
    console.error('Error calculating points:', error);
    return sendError(res, 'Failed to calculate points', 500);
  }
}

// Transfer points (future feature)
async function handleTransferPoints(req: AuthenticatedRequest, res: VercelResponse) {
  return sendError(res, 'Points transfer feature not yet implemented', 501);
}

// Apply middleware and export
export default withCors(
  withErrorHandler(
    withAuth(
      withRateLimit()(handler)
    )
  )
);
