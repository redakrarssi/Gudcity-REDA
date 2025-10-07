/**
 * Customer API Routes
 * Handles customer-related operations
 */

import { Router, Request, Response } from 'express';
import sql from '../utils/db';
import { auth } from '../middleware/auth';
import { validateUserId, validateBusinessId } from '../utils/sqlSafety';

const router = Router();

/**
 * Get customers for a business
 * GET /api/customers/business/:businessId
 */
router.get('/business/:businessId', auth, async (req: Request, res: Response) => {
  try {
    const businessId = validateBusinessId(req.params.businessId);
    
    // Get customers for this business
    const customers = await sql`
      SELECT 
        c.id,
        c.user_id,
        c.name,
        c.email,
        c.notification_preferences,
        c.regional_settings,
        c.joined_at,
        c.created_at,
        c.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.status as user_status
      FROM customers c
      JOIN users u ON c.user_id = u.id
      WHERE c.business_id = ${businessId}
      ORDER BY c.created_at DESC
    `;
    
    res.json({ customers });
  } catch (error) {
    console.error('Error getting business customers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get customer by ID
 * GET /api/customers/:id
 */
router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.params.id);
    
    // Get customer from database
    const customers = await sql`
      SELECT 
        c.id,
        c.user_id,
        c.name,
        c.email,
        c.notification_preferences,
        c.regional_settings,
        c.joined_at,
        c.created_at,
        c.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.status as user_status
      FROM customers c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ${customerId}
      LIMIT 1
    `;

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customers[0];
    res.json({ customer });
  } catch (error) {
    console.error('Error getting customer by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get customer's enrolled programs
 * GET /api/customers/:id/programs
 */
router.get('/:id/programs', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.params.id);
    
    // Get customer's enrolled programs with detailed information
    const programs = await sql`
      SELECT 
        cp.id, 
        cp.customer_id AS "customerId", 
        cp.program_id AS "programId", 
        cp.current_points AS "currentPoints", 
        cp.enrolled_at AS "enrolledAt",
        cp.status AS "enrollmentStatus",
        lp.id AS "program_id", 
        lp.business_id AS "program_businessId",
        lp.name AS "program_name", 
        lp.description AS "program_description", 
        lp.type AS "program_type", 
        1.0 AS "program_pointValue",
        365 AS "program_expirationDays",
        lp.status AS "program_status",
        lp.created_at AS "program_createdAt", 
        lp.updated_at AS "program_updatedAt",
        b.id AS "business_id",
        b.name AS "business_name",
        '' AS "business_category",
        '' AS "business_address",
        '' AS "business_city",
        '' AS "business_state",
        '' AS "business_country"
      FROM program_enrollments cp
      JOIN loyalty_programs lp ON (cp.program_id::int = lp.id)
      JOIN users b ON lp.business_id = b.id
      WHERE (cp.customer_id::int = ${customerId})
      AND cp.status = 'ACTIVE'
      AND lp.status = 'ACTIVE'
      ORDER BY cp.current_points DESC
    `;
    
    res.json({ programs });
  } catch (error) {
    console.error('Error getting customer programs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get customer's loyalty cards
 * GET /api/customers/:id/cards
 */
router.get('/:id/cards', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.params.id);
    
    // Get customer's loyalty cards
    const cards = await sql`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.business_id,
        lc.program_id,
        lc.card_number,
        lc.status,
        lc.card_type,
        lc.points,
        lc.tier,
        lc.points_multiplier,
        lc.is_active,
        lc.created_at,
        lc.updated_at,
        lp.name as program_name,
        b.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN users b ON lc.business_id = b.id
      WHERE lc.customer_id = ${customerId}
      ORDER BY lc.created_at DESC
    `;
    
    res.json({ cards });
  } catch (error) {
    console.error('Error getting customer cards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get reward tiers for programs
 * POST /api/customers/reward-tiers
 */
router.post('/reward-tiers', auth, async (req: Request, res: Response) => {
  try {
    const { programIds } = req.body;
    
    if (!programIds || !Array.isArray(programIds)) {
      return res.status(400).json({ error: 'Program IDs array is required' });
    }
    
    // Get reward tiers for the programs
    const rewardTiers = await sql`
      SELECT 
        id, 
        program_id AS "programId", 
        points_required AS "pointsRequired", 
        reward
      FROM reward_tiers
      WHERE program_id = ANY(${programIds})
      ORDER BY program_id, points_required ASC
    `;
    
    res.json({ rewardTiers });
  } catch (error) {
    console.error('Error getting reward tiers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create loyalty card for customer
 * POST /api/customers/:id/cards
 */
router.post('/:id/cards', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.params.id);
    const { programId, businessId } = req.body;
    
    if (!programId || !businessId) {
      return res.status(400).json({ error: 'Program ID and Business ID are required' });
    }
    
    // Generate a card number
    const cardNumber = `C${customerId}-${programId}-${Date.now().toString().slice(-6)}`;
    
    // Create card in the database
    const result = await sql`
      INSERT INTO loyalty_cards (
        customer_id, business_id, program_id, card_number, 
        card_type, tier, points_multiplier, points,
        points_to_next, benefits, status, is_active, 
        created_at, updated_at
      ) VALUES (
        ${customerId}, ${businessId}, ${programId}, ${cardNumber},
        'POINTS', 'STANDARD', 1.0, 0,
        1000, ARRAY['Basic rewards', 'Birthday gift'], 'active', true,
        NOW(), NOW()
      )
      ON CONFLICT (customer_id, program_id) DO UPDATE SET
        status = 'active',
        is_active = true,
        updated_at = NOW()
      RETURNING id, card_number, status
    `;
    
    if (result.length === 0) {
      return res.status(500).json({ error: 'Failed to create loyalty card' });
    }
    
    res.json({ 
      success: true, 
      card: result[0],
      message: 'Loyalty card created successfully' 
    });
  } catch (error) {
    console.error('Error creating loyalty card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
