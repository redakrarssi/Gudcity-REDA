/**
 * Vercel Serverless API: User Registration
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerUser } from '../_services/authServerService';
import { successResponse, ErrorResponses } from '../_services/responseFormatter';
import { validationMiddleware, CommonSchemas } from '../_middleware/validation';
import { sensitiveRateLimit } from '../_middleware/rateLimit';
import { cors } from '../_lib/auth';

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
    
    return res.status(500).json(
      ErrorResponses.serverError(
        'Registration failed',
        process.env.NODE_ENV === 'development' ? errorMessage : undefined
      )
    );
  }
}
