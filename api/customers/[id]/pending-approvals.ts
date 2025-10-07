import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../src/utils/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Missing customer ID' });
    }

    const results = await sql`
      SELECT 
        ar.*,
        b.name as business_name
      FROM customer_approval_requests ar
      JOIN users b ON ar.business_id = b.id
      WHERE ar.customer_id = ${parseInt(id as string)} 
        AND ar.status = 'PENDING'
        AND ar.expires_at > NOW()
      ORDER BY ar.requested_at DESC
    `;

    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
}
