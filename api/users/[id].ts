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
      return res.status(400).json({ error: 'Missing user ID' });
    }

    const userId = parseInt(id as string);

    const result = await sql`
      SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at, last_login, status 
      FROM users WHERE id = ${userId}
    `;
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result[0];
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}