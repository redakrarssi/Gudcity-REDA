import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../src/utils/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, event, ipAddress, userAgent, metadata } = req.body;

    if (!userId || !event) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await sql`
      INSERT INTO security_audit_logs (
        action_type,
        resource_id,
        user_id,
        ip_address,
        user_agent,
        details,
        timestamp
      ) VALUES (
        ${event},
        ${metadata?.resourceId || 'unknown'},
        ${userId.toString()},
        ${ipAddress || 'unknown'},
        ${userAgent || 'unknown'},
        ${JSON.stringify(metadata || {})},
        NOW()
      )
    `;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging security event:', error);
    res.status(500).json({ error: 'Failed to log security event' });
  }
}
