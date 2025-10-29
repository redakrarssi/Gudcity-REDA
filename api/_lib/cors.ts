import { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://your-app.vercel.app',
  'https://gudcity.com', 
  'https://www.gudcity.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

/**
 * CORS middleware for serverless functions
 */
export function withCors(handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV === 'development') {
      // Allow all origins in development
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 
      'X-Requested-With,Content-Type,Authorization,Accept,Origin,Cache-Control'
    );
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    return handler(req, res);
  };
}
