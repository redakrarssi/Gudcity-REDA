/**
 * Vercel Serverless API: User Registration
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

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { email, password, name, user_type, role } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
    `;

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUsers = await sql`
      INSERT INTO users (email, password, name, user_type, role, status, created_at)
      VALUES (
        ${email},
        ${hashedPassword},
        ${name},
        ${user_type || 'customer'},
        ${role || user_type || 'customer'},
        'active',
        NOW()
      )
      RETURNING id, email, name, user_type, role
    `;

    if (newUsers.length === 0) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const newUser = newUsers[0];

    // Generate JWT token
    const jti = crypto.randomBytes(16).toString('hex');
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role || newUser.user_type,
        jti
      },
      JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Store token
    try {
      await sql`
        INSERT INTO auth_tokens (user_id, token, jti, expires_at)
        VALUES (
          ${newUser.id},
          ${token},
          ${jti},
          NOW() + INTERVAL '24 hours'
        )
      `;
    } catch (error) {
      console.error('Error storing token:', error);
    }

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role || newUser.user_type,
        user_type: newUser.user_type
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
