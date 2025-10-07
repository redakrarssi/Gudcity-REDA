/**
 * Vercel Serverless API: Test Endpoint
 * Simple test to verify API deployment is working
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`Test API called: ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);

  return res.status(200).json({
    success: true,
    message: 'API is working',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}
