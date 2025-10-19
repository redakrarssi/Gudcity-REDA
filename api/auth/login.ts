/**
 * Vercel Serverless API: User Login
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateUserCredentials } from '../_services/authServerService';
import { successResponse, ErrorResponses } from '../_services/responseFormatter';
import { validationMiddleware } from '../_middleware/validation';
import { authRateLimit } from '../_middleware/rateLimit';
import { cors } from '../_lib/auth';

// Validation schema for login
const loginSchema = {
  email: {
    type: 'email' as const,
    required: true,
    max: 255,
    sanitize: true,
  },
  password: {
    type: 'string' as const,
    required: true,
    min: 1,
    max: 128,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Login API] Request received:', { method: req.method, url: req.url });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json(ErrorResponses.methodNotAllowed(['POST']));
  }

  // Rate limiting (5 attempts per 15 minutes)
  if (!authRateLimit.check(req, res)) {
    return; // Response already sent by rate limiter
  }

  // Input validation
  if (!validationMiddleware(loginSchema)(req, res)) {
    return; // Response already sent by validator
  }

  try {
    const { email, password } = req.body;

    // Validate credentials via server service
    const result = await validateUserCredentials(email, password);

    if (!result) {
      console.log('[Login API] Invalid credentials for:', email);
      return res.status(401).json(
        ErrorResponses.unauthorized('Invalid email or password')
      );
    }

    console.log('[Login API] Login successful:', { userId: result.user.id, email: result.user.email });

    return res.status(200).json(
      successResponse({
        token: result.token,
        user: result.user,
      })
    );

  } catch (error) {
    console.error('[Login API] Login error:', error);
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Login failed',
        process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      )
    );
  }
}
