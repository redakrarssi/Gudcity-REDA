import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../src/utils/db';

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
    const { customerId } = req.query;

    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId parameter' });
    }

    const results = await sql`
      SELECT 
        cn.*,
        b.name as business_name
      FROM customer_notifications cn
      JOIN users b ON cn.business_id = b.id
      WHERE cn.customer_id = ${parseInt(customerId as string)}
      ORDER BY cn.created_at DESC
    `;

    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching customer notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}
