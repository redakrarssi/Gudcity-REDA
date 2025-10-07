/**
 * User API Routes
 * Handles user-related operations like getting user by ID, updating user, etc.
 */

import { Router, Request, Response } from 'express';
import sql from '../utils/db';
import { auth } from '../middleware/auth';
import { validateUserId } from '../utils/sqlSafety';

const router = Router();

/**
 * Get user by ID
 * GET /api/users/:id
 */
router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const userId = validateUserId(req.params.id);
    
    // Get user from database
    const users = await sql`
      SELECT id, email, name, user_type, role, status, created_at, last_login, phone, address, business_name, business_address, business_phone, tier, loyalty_points, total_spent
      FROM users 
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user by email
 * POST /api/users/by-email
 */
router.post('/by-email', auth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Get user from database
    const users = await sql`
      SELECT id, email, name, user_type, role, status, created_at, last_login, phone, address, business_name, business_address, business_phone, tier, loyalty_points, total_spent
      FROM users 
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Error getting user by email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update user
 * PUT /api/users/:id
 */
router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const userId = validateUserId(req.params.id);
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    const { password, id, created_at, ...allowedUpdates } = updateData;
    
    // Build dynamic update query
    const updateFields = Object.keys(allowedUpdates);
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Create SET clause dynamically
    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = updateFields.map(field => allowedUpdates[field]);
    
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, name, user_type, role, status, created_at, last_login, phone, address, business_name, business_address, business_phone, tier, loyalty_points, total_spent
    `;
    
    const result = await sql.query(query, [userId, ...values]);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result[0];
    res.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get current user profile
 * GET /api/users/profile
 */
router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get user from database
    const users = await sql`
      SELECT id, email, name, user_type, role, status, created_at, last_login, phone, address, business_name, business_address, business_phone, tier, loyalty_points, total_spent
      FROM users 
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
