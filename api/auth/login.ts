/**
 * Vercel Serverless API: User Login
 * This runs on the backend with secure database access
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// SERVER-SIDE ONLY: Access database without VITE_ prefix
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const JWT_SECRET = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not configured on backend');
}

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// Rate limiting store (in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number; lockedUntil?: number }>();

// Helper: Check rate limit
function checkRateLimit(identifier: string): { allowed: boolean; lockedUntil?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (entry) {
    // Check if account is locked
    if (entry.lockedUntil && entry.lockedUntil > now) {
      return { allowed: false, lockedUntil: entry.lockedUntil };
    }

    // Reset if time window passed
    if (now > entry.resetAt) {
      rateLimitStore.set(identifier, { count: 1, resetAt: now + 60000 }); // 1 minute window
      return { allowed: true };
    }

    // Increment counter
    entry.count++;
    
    // Lock account after 5 failed attempts
    if (entry.count > 5) {
      entry.lockedUntil = now + 300000; // 5 minutes lockout
      return { allowed: false, lockedUntil: entry.lockedUntil };
    }

    return { allowed: true };
  }

  // First attempt
  rateLimitStore.set(identifier, { count: 1, resetAt: now + 60000 });
  return { allowed: true };
}

// Helper: Record failed login
async function recordFailedLogin(email: string, ipAddress?: string): Promise<void> {
  if (!sql) return;
  
  try {
    await sql`
      INSERT INTO failed_logins (email, ip_address, attempted_at)
      VALUES (${email}, ${ipAddress || 'unknown'}, NOW())
    `;
  } catch (error) {
    console.error('Error recording failed login:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🚀 Login API called:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // CORS headers - Allow requests from the same origin
  const origin = req.headers.origin || req.headers.referer || '*';
  const allowedOrigins = [
    process.env.VITE_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    'https://gudcity-reda.vercel.app'
  ].filter(Boolean);
  
  const isAllowedOrigin = allowedOrigins.some(allowed => origin.includes(allowed as string));
  res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin ? origin : allowedOrigins[0] || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  console.log('🔐 CORS configuration:', {
    requestOrigin: origin,
    allowedOrigins,
    isAllowedOrigin,
    finalCorsHeader: isAllowedOrigin ? origin : allowedOrigins[0] || '*'
  });

  if (req.method === 'OPTIONS') {
    console.log('✅ Handling preflight request');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enhanced database configuration check
  console.log('💾 Database configuration check:', {
    databaseUrl: DATABASE_URL ? '✅ Present' : '❌ Missing',
    jwtSecret: JWT_SECRET ? '✅ Present' : '❌ Missing',
    sqlConnection: sql ? '✅ Connected' : '❌ Not connected',
    environmentVars: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL,
      VITE_APP_URL: process.env.VITE_APP_URL
    }
  });

  if (!sql) {
    console.error('❌ Database connection failed:', {
      DATABASE_URL: DATABASE_URL ? 'Present but invalid' : 'Not provided',
      POSTGRES_URL: process.env.POSTGRES_URL ? 'Present' : 'Not provided'
    });
    return res.status(500).json({ 
      error: 'Database not configured',
      details: 'DATABASE_URL environment variable is required'
    });
  }

  if (!JWT_SECRET) {
    console.error('❌ JWT configuration failed');
    return res.status(500).json({ 
      error: 'Authentication not configured',
      details: 'JWT_SECRET environment variable is required'
    });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Account temporarily locked due to multiple failed attempts',
        lockedUntil: rateLimit.lockedUntil 
      });
    }

    // Get user from database
    const users = await sql`
      SELECT id, email, name, user_type, role, password, status
      FROM users 
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (users.length === 0) {
      await recordFailedLogin(email, req.headers['x-forwarded-for'] as string);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check account status
    if (user.status === 'inactive' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is inactive or suspended' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await recordFailedLogin(email, req.headers['x-forwarded-for'] as string);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Clear rate limit on successful login
    rateLimitStore.delete(email);

    // Generate JWT token with JTI
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || user.user_type,
        jti
      },
      JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Store token in database for blacklist checking
    try {
      await sql`
        INSERT INTO auth_tokens (user_id, token, jti, expires_at)
        VALUES (
          ${user.id},
          ${token},
          ${jti},
          NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (jti) DO NOTHING
      `;
    } catch (error) {
      console.error('Error storing token:', error);
      // Continue anyway - token is still valid
    }

    // Return user data and token (without password)
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || user.user_type,
        user_type: user.user_type
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
