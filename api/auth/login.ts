/**
 * Vercel Serverless API: User Login
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateUserCredentials } from '../_services/authServerService.js';
import { successResponse, ErrorResponses } from '../_services/responseFormatter.js';
import { validationMiddleware } from '../_middleware/validation.js';
import { authRateLimit } from '../_middleware/rateLimit.js';
import { cors } from '../_lib/auth.js';

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
  console.log('[Login API] Request received:', { 
    method: req.method, 
    url: req.url,
    hasBody: !!req.body,
    origin: req.headers.origin 
  });
  
  // Ensure JSON response header for every path
  res.setHeader('Content-Type', 'application/json');

  try {
    // Handle CORS first
    cors(res, req.headers.origin);
    
    if (req.method === 'OPTIONS') {
      console.log('[Login API] Handling OPTIONS request');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.log('[Login API] Invalid method:', req.method);
      return res.status(405).json(ErrorResponses.methodNotAllowed(['POST']));
    }

    // Check environment variables
    const jwtSecret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.VITE_DATABASE_URL;
    
    if (!jwtSecret) {
      console.error('[Login API] JWT_SECRET not configured');
      return res.status(500).json(
        ErrorResponses.serverError('Authentication service not configured')
      );
    }
    
    if (!databaseUrl) {
      console.error('[Login API] DATABASE_URL not configured');
      return res.status(500).json(
        ErrorResponses.serverError('Database not configured')
      );
    }

    console.log('[Login API] Environment check passed');

    // Rate limiting (5 attempts per 15 minutes)
    try {
      if (!authRateLimit.check(req, res)) {
        console.log('[Login API] Rate limit exceeded');
        return; // Response already sent by rate limiter
      }
    } catch (rateLimitError) {
      console.error('[Login API] Rate limit error:', rateLimitError);
      return res.status(500).json(ErrorResponses.serverError('Rate limiting service error'));
    }

    console.log('[Login API] Rate limit check passed');

    // Input validation
    try {
      if (!validationMiddleware(loginSchema)(req, res)) {
        console.log('[Login API] Validation failed');
        return; // Response already sent by validator
      }
    } catch (validationError) {
      console.error('[Login API] Validation middleware error:', validationError);
      return res.status(500).json(ErrorResponses.serverError('Validation service error'));
    }

    console.log('[Login API] Validation passed');

    const { email, password } = req.body;
    console.log('[Login API] Attempting login for:', email);

    // Validate credentials via server service
    let result;
    try {
      result = await validateUserCredentials(email, password);
    } catch (authError) {
      console.error('[Login API] Authentication service error:', authError);
      
      // Check if it's a database connection error
      if (authError.message && authError.message.includes('Database not configured')) {
        return res.status(500).json(
          ErrorResponses.serverError('Database connection failed')
        );
      }
      
      return res.status(500).json(
        ErrorResponses.serverError(
          'Authentication service error',
          process.env.NODE_ENV === 'development' ? authError.message : undefined
        )
      );
    }

    if (!result) {
      console.log('[Login API] Invalid credentials for:', email);
      return res.status(401).json(
        ErrorResponses.unauthorized('Invalid email or password')
      );
    }

    console.log('[Login API] Login successful:', { 
      userId: result.user.id, 
      email: result.user.email,
      role: result.user.role 
    });

    return res.status(200).json(
      successResponse({
        token: result.token,
        user: result.user,
      })
    );

  } catch (error) {
    console.error('[Login API] Unexpected error:', error);
    console.error('[Login API] Error stack:', (error as Error).stack);
    
    // Ensure we always return JSON
    if (!res.headersSent) {
      return res.status(500).json(
        ErrorResponses.serverError(
          'Internal server error',
          process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        )
      );
    }
  }
}
