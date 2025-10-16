import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(60, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug parameter required' });
  }

  const sql = requireSql();

  try {
    const pages = await sql`
      SELECT * FROM pages
      WHERE slug = ${slug}
      AND status = 'published'
    `;
    
    if (pages.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const page = {
      id: pages[0].id,
      title: pages[0].title,
      slug: pages[0].slug,
      content: pages[0].content,
      template: pages[0].template,
      status: pages[0].status,
      is_system: pages[0].is_system,
      created_at: pages[0].created_at,
      updated_at: pages[0].updated_at
    };
    
    return res.status(200).json({ page });
  } catch (error) {
    console.error('Pages API error:', error);
    return res.status(500).json({ error: 'Failed to fetch page' });
  }
}
