/**
 * Vercel Serverless API: User Registration
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerUser } from '../_services/authServerService.js';
import { successResponse, ErrorResponses } from '../_services/responseFormatter.js';
import { validationMiddleware } from '../_middleware/validation.js';
import { sensitiveRateLimit } from '../_middleware/rateLimit.js';
import { cors } from '../_lib/auth.js';

// Validation schema for registration
const registrationSchema = {
  email: {
    type: 'email' as const,
    required: true,
    max: 255,
    sanitize: true,
  },
  password: {
    type: 'string' as const,
    required: true,
    min: 8,
    max: 128,
  },
  name: {
    type: 'string' as const,
    required: true,
    min: 2,
    max: 100,
    sanitize: true,
  },
  user_type: {
    type: 'string' as const,
    required: false,
    enum: ['customer', 'business', 'staff', 'admin'],
  },
  role: {
    type: 'string' as const,
    required: false,
    enum: ['customer', 'business', 'staff', 'admin', 'owner'],
  },
  business_name: {
    type: 'string' as const,
    required: false,
    max: 200,
    sanitize: true,
  },
  business_phone: {
    type: 'string' as const,
    required: false,
    max: 20,
    sanitize: true,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Register API] Request received:', { method: req.method, url: req.url });
  
  // Handle CORS
  cors(res, req.headers.origin);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json(ErrorResponses.methodNotAllowed(['POST']));
  }

  // Check environment variables
  const jwtSecret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.VITE_DATABASE_URL;
  
  if (!jwtSecret) {
    console.error('[Register API] JWT_SECRET not configured');
    return res.status(500).json(
      ErrorResponses.serverError('Authentication service not configured')
    );
  }
  
  if (!databaseUrl) {
    console.error('[Register API] DATABASE_URL not configured');
    return res.status(500).json(
      ErrorResponses.serverError('Database not configured')
    );
  }

  // Validate JWT secret strength
  if (jwtSecret.length < 32) {
    console.error('[Register API] JWT_SECRET is too weak (minimum 32 characters)');
    return res.status(500).json(
      ErrorResponses.serverError('Authentication service configuration error')
    );
  }

  // Rate limiting
  if (!sensitiveRateLimit.check(req, res)) {
    return; // Response already sent by rate limiter
  }

  // Input validation
  if (!validationMiddleware(registrationSchema)(req, res)) {
    return; // Response already sent by validator
  }

  try {
    const { email, password, name, user_type, role, business_name, business_phone } = req.body;

    // Additional validation for business users
    if (user_type === 'business' || role === 'business') {
      if (!business_name || business_name.trim().length < 2) {
        return res.status(400).json(
          ErrorResponses.badRequest('Business name is required for business accounts')
        );
      }
    }

    // Register user via server service
    const result = await registerUser({
      email,
      password,
      name,
      userType: user_type || 'customer',
      role: role || user_type || 'customer',
      businessName: business_name,
      businessPhone: business_phone,
    });

    console.log('[Register API] User registered successfully:', { userId: result.user.id, email: result.user.email });

    return res.status(201).json(
      successResponse({
        token: result.token,
        user: result.user,
      })
    );

  } catch (error) {
    console.error('[Register API] Registration error:', error);
    
    const errorMessage = (error as Error).message;
    
    // Handle specific error cases
    if (errorMessage.includes('already exists')) {
      return res.status(409).json(
        ErrorResponses.conflict('Email already registered')
      );
    }
    
    // Handle database connection errors
    if (errorMessage.includes('Database not configured')) {
      return res.status(500).json(
        ErrorResponses.serverError('Database connection failed')
      );
    }
    
    // Handle JWT token generation errors
    if (errorMessage.includes('Token generation failed')) {
      return res.status(500).json(
        ErrorResponses.serverError('Authentication token generation failed')
      );
    }
    
    // Handle database query errors
    if (errorMessage.includes('Database query failed')) {
      return res.status(500).json(
        ErrorResponses.serverError('Database operation failed')
      );
    }
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Registration failed',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      )
    );
  }
}
