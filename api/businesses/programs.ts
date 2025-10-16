import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(120, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const sql = requireSql();

  try {
    const { businessId } = req.query;

    if (req.method === 'GET') {
      // Get programs for a business
      const bizId = businessId || user.id;
      
      if (user.role !== 'admin' && user.id !== parseInt(String(bizId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const programs = await sql`
        SELECT 
          lp.*,
          COUNT(lc.id) as enrolled_customers,
          SUM(lc.points) as total_points_issued,
          COUNT(r.id) as total_redemptions
        FROM loyalty_programs lp
        LEFT JOIN loyalty_cards lc ON lp.id = lc.program_id AND lc.status = 'ACTIVE'
        LEFT JOIN redemptions r ON lc.id = r.card_id
        WHERE lp.business_id = ${parseInt(String(bizId))}
        GROUP BY lp.id, lp.name, lp.description, lp.business_id, lp.points_per_dollar, 
                 lp.is_active, lp.created_at, lp.updated_at
        ORDER BY lp.created_at DESC
      `;

      return res.status(200).json({ programs });
    }

    if (req.method === 'POST') {
      // Create new program
      const bizId = businessId || user.id;
      
      if (user.role !== 'admin' && user.id !== parseInt(String(bizId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { 
        name, 
        description, 
        pointsPerDollar, 
        minimumSpend, 
        rewardThreshold,
        rewardValue,
        isActive = true 
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Program name is required' });
      }

      const newProgram = await sql`
        INSERT INTO loyalty_programs (
          business_id, name, description, points_per_dollar,
          minimum_spend, reward_threshold, reward_value, is_active, created_at, updated_at
        ) VALUES (
          ${parseInt(String(bizId))}, ${name}, ${description || ''}, ${pointsPerDollar || 1},
          ${minimumSpend || 0}, ${rewardThreshold || 100}, ${rewardValue || 10}, 
          ${isActive}, NOW(), NOW()
        )
        RETURNING *
      `;

      return res.status(201).json({ program: newProgram[0] });
    }

    if (req.method === 'PUT') {
      // Update program
      const bizId = businessId || user.id;
      const { programId } = req.query;
      
      if (user.role !== 'admin' && user.id !== parseInt(String(bizId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!programId) {
        return res.status(400).json({ error: 'Program ID is required' });
      }

      const { 
        name, 
        description, 
        pointsPerDollar, 
        minimumSpend, 
        rewardThreshold,
        rewardValue,
        isActive 
      } = req.body;

      const updated = await sql`
        UPDATE loyalty_programs 
        SET 
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          points_per_dollar = COALESCE(${pointsPerDollar}, points_per_dollar),
          minimum_spend = COALESCE(${minimumSpend}, minimum_spend),
          reward_threshold = COALESCE(${rewardThreshold}, reward_threshold),
          reward_value = COALESCE(${rewardValue}, reward_value),
          is_active = COALESCE(${isActive}, is_active),
          updated_at = NOW()
        WHERE id = ${parseInt(String(programId))} 
          AND business_id = ${parseInt(String(bizId))}
        RETURNING *
      `;

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Program not found' });
      }

      return res.status(200).json({ program: updated[0] });
    }

    if (req.method === 'DELETE') {
      // Delete/deactivate program
      const bizId = businessId || user.id;
      const { programId } = req.query;
      
      if (user.role !== 'admin' && user.id !== parseInt(String(bizId))) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!programId) {
        return res.status(400).json({ error: 'Program ID is required' });
      }

      // Soft delete - mark as inactive
      const deleted = await sql`
        UPDATE loyalty_programs 
        SET is_active = false, updated_at = NOW()
        WHERE id = ${parseInt(String(programId))} 
          AND business_id = ${parseInt(String(bizId))}
        RETURNING *
      `;

      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Program not found' });
      }

      return res.status(200).json({ message: 'Program deactivated successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Business programs API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
