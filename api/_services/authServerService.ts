/**
 * Authentication Server Service
 * Handles all authentication-related database operations on the server
 * SECURITY: This file runs on the server only - never exposed to browser
 */

import { requireSql } from '../_lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { User, AuthTokens, TokenPayload } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
const JWT_EXPIRY = '7d'; // Token expires in 7 days
const BCRYPT_ROUNDS = 12;

if (!JWT_SECRET) {
  console.warn('[AuthServerService] JWT_SECRET not configured');
}

/**
 * Validate user credentials and return user + token
 */
export async function validateUserCredentials(
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  console.log('[AuthServerService] Validating credentials for:', email);
  
  // Validate input parameters
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    throw new Error('Email is required and must be a valid string');
  }
  
  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password is required and must be a valid string');
  }
  
  // Sanitize email
  const sanitizedEmail = email.trim().toLowerCase();
  
  // Check database connection first
  let sql;
  try {
    sql = requireSql();
    console.log('[AuthServerService] Database connection established');
  } catch (dbError) {
    console.error('[AuthServerService] Database connection failed:', dbError);
    throw new Error('Database not configured');
  }
  
  // Get user from database
  let users;
  try {
    users = await sql`
      SELECT 
        id, email, name, user_type, role, password, status, business_id,
        business_name, business_phone, avatar_url, created_at, last_login
      FROM users 
      WHERE LOWER(email) = LOWER(${sanitizedEmail})
      LIMIT 1
    `;
    console.log('[AuthServerService] Database query executed successfully');
  } catch (queryError) {
    console.error('[AuthServerService] Database query failed:', queryError);
    throw new Error(`Database query failed: ${queryError.message}`);
  }
  
  if (users.length === 0) {
    console.log('[AuthServerService] User not found:', sanitizedEmail);
    return null;
  }
  
  const user = users[0];
  
  // Check account status
  if (user.status === 'inactive' || user.status === 'suspended' || user.status === 'banned') {
    console.log('[AuthServerService] Account not active:', { email: sanitizedEmail, status: user.status });
    return null;
  }
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    console.log('[AuthServerService] Invalid password for:', sanitizedEmail);
    return null;
  }
  
  // Update last login
  try {
    await sql`
      UPDATE users 
      SET last_login = NOW() 
      WHERE id = ${user.id}
    `;
  } catch (error) {
    console.warn('[AuthServerService] Failed to update last login:', error);
  }
  
  // Generate JWT token
  let token;
  let jti;
  try {
    jti = crypto.randomBytes(16).toString('hex');
    token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || user.user_type,
        businessId: user.business_id,
        jti,
      } as TokenPayload,
      JWT_SECRET!,
      { expiresIn: JWT_EXPIRY }
    );
    console.log('[AuthServerService] JWT token generated successfully');
  } catch (jwtError) {
    console.error('[AuthServerService] JWT token generation failed:', jwtError);
    throw new Error(`Token generation failed: ${jwtError.message}`);
  }
  
  // Store token in database for tracking
  try {
    await sql`
      INSERT INTO auth_tokens (user_id, token, jti, expires_at, created_at)
      VALUES (
        ${user.id},
        ${token},
        ${jti},
        NOW() + INTERVAL '7 days',
        NOW()
      )
      ON CONFLICT (jti) DO NOTHING
    `;
  } catch (error) {
    console.warn('[AuthServerService] Failed to store token:', error);
    // Continue anyway - token is still valid
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  
  console.log('[AuthServerService] Login successful:', { userId: user.id, email: user.email });
  
  return {
    user: userWithoutPassword as User,
    token,
  };
}

/**
 * Register new user
 */
export async function registerUser(userData: {
  email: string;
  password: string;
  name: string;
  userType: string;
  role?: string;
  businessName?: string;
  businessPhone?: string;
}): Promise<{ user: User; token: string }> {
  const sql = requireSql();
  
  const { email, password, name, userType, role, businessName, businessPhone } = userData;
  
  // Validate input parameters
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    throw new Error('Email is required and must be a valid string');
  }
  
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password is required and must be at least 8 characters long');
  }
  
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new Error('Name is required and must be at least 2 characters long');
  }
  
  if (!userType || typeof userType !== 'string') {
    throw new Error('User type is required and must be a valid string');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Sanitize inputs
  const sanitizedEmail = email.trim().toLowerCase();
  const sanitizedName = name.trim();
  const sanitizedBusinessName = businessName ? businessName.trim() : undefined;
  const sanitizedBusinessPhone = businessPhone ? businessPhone.trim() : undefined;
  
  console.log('[AuthServerService] Registering new user:', { email: sanitizedEmail, userType });
  
  // Check if user already exists
  const existing = await sql`
    SELECT id FROM users WHERE LOWER(email) = LOWER(${sanitizedEmail}) LIMIT 1
  `;
  
  if (existing.length > 0) {
    throw new Error('User with this email already exists');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  
  // Insert user
  let users;
  try {
    users = await sql`
      INSERT INTO users (
        email, password, name, user_type, role, status, 
        business_name, business_phone, created_at
      )
      VALUES (
        ${sanitizedEmail}, 
        ${passwordHash}, 
        ${sanitizedName}, 
        ${userType}, 
        ${role || userType}, 
        'active',
        ${sanitizedBusinessName || null},
        ${sanitizedBusinessPhone || null},
        NOW()
      )
      RETURNING id, email, name, user_type, role, status, business_name, 
                business_phone, created_at
    `;
  } catch (insertError) {
    console.error('[AuthServerService] User insertion failed:', insertError);
    throw new Error(`Database insertion failed: ${insertError.message}`);
  }
  
  if (!users || users.length === 0) {
    throw new Error('Failed to create user - no data returned');
  }
  
  const user = users[0];
  
  // Generate JWT token
  let token;
  let jti;
  try {
    jti = crypto.randomBytes(16).toString('hex');
    token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        jti,
      } as TokenPayload,
      JWT_SECRET!,
      { expiresIn: JWT_EXPIRY }
    );
  } catch (jwtError) {
    console.error('[AuthServerService] JWT token generation failed:', jwtError);
    throw new Error(`Token generation failed: ${jwtError.message}`);
  }
  
  // Store token
  try {
    await sql`
      INSERT INTO auth_tokens (user_id, token, jti, expires_at, created_at)
      VALUES (
        ${user.id},
        ${token},
        ${jti},
        NOW() + INTERVAL '7 days',
        NOW()
      )
    `;
    console.log('[AuthServerService] Token stored successfully');
  } catch (error) {
    console.warn('[AuthServerService] Failed to store token:', error);
    // Continue anyway - token is still valid
  }
  
  console.log('[AuthServerService] Registration successful:', { userId: user.id, email: user.email });
  
  return {
    user: user as User,
    token,
  };
}

/**
 * Refresh authentication token
 */
export async function refreshAuthToken(userId: number): Promise<string> {
  const sql = requireSql();
  
  console.log('[AuthServerService] Refreshing token for user:', userId);
  
  // Get user
  const users = await sql`
    SELECT id, email, role, business_id, status
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  
  if (users.length === 0) {
    throw new Error('User not found');
  }
  
  const user = users[0];
  
  if (user.status !== 'active') {
    throw new Error('Account is not active');
  }
  
  // Generate new token
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: user.business_id,
      jti,
    } as TokenPayload,
    JWT_SECRET!,
    { expiresIn: JWT_EXPIRY }
  );
  
  // Store new token
  try {
    await sql`
      INSERT INTO auth_tokens (user_id, token, jti, expires_at, created_at)
      VALUES (
        ${user.id},
        ${token},
        ${jti},
        NOW() + INTERVAL '7 days',
        NOW()
      )
    `;
  } catch (error) {
    console.warn('[AuthServerService] Failed to store refreshed token:', error);
  }
  
  console.log('[AuthServerService] Token refreshed successfully:', { userId });
  
  return token;
}

/**
 * Logout user and revoke token
 */
export async function logoutUser(userId: number, token: string): Promise<void> {
  const sql = requireSql();
  
  console.log('[AuthServerService] Logging out user:', userId);
  
  try {
    // Decode token to get JTI
    const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload;
    
    if (decoded.jti) {
      // Add to revoked tokens
      await sql`
        INSERT INTO revoked_tokens (jti, user_id, revoked_at)
        VALUES (${decoded.jti}, ${userId}, NOW())
        ON CONFLICT (jti) DO NOTHING
      `;
      
      console.log('[AuthServerService] Token revoked:', { userId, jti: decoded.jti });
    }
  } catch (error) {
    console.warn('[AuthServerService] Failed to revoke token:', error);
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const sql = requireSql();
  
  console.log('[AuthServerService] Changing password for user:', userId);
  
  // Get current password
  const users = await sql`
    SELECT id, password FROM users WHERE id = ${userId} LIMIT 1
  `;
  
  if (users.length === 0) {
    throw new Error('User not found');
  }
  
  const user = users[0];
  
  // Verify old password
  const isValidPassword = await bcrypt.compare(oldPassword, user.password);
  
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }
  
  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  
  // Update password
  await sql`
    UPDATE users 
    SET password = ${newPasswordHash}, updated_at = NOW()
    WHERE id = ${userId}
  `;
  
  // Revoke all existing tokens to force re-login
  try {
    const tokens = await sql`
      SELECT jti FROM auth_tokens WHERE user_id = ${userId}
    `;
    
    for (const tokenRow of tokens) {
      if (tokenRow.jti) {
        await sql`
          INSERT INTO revoked_tokens (jti, user_id, revoked_at)
          VALUES (${tokenRow.jti}, ${userId}, NOW())
          ON CONFLICT (jti) DO NOTHING
        `;
      }
    }
  } catch (error) {
    console.warn('[AuthServerService] Failed to revoke tokens after password change:', error);
  }
  
  console.log('[AuthServerService] Password changed successfully:', { userId });
}

/**
 * Verify if a token is valid and not revoked
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload;
    
    // Check if token is revoked
    if (decoded.jti) {
      const sql = requireSql();
      const revoked = await sql`
        SELECT 1 FROM revoked_tokens WHERE jti = ${decoded.jti} LIMIT 1
      `;
      
      if (revoked.length > 0) {
        console.log('[AuthServerService] Token is revoked:', decoded.jti);
        return null;
      }
    }
    
    return decoded;
  } catch (error) {
    console.log('[AuthServerService] Token verification failed:', (error as Error).message);
    return null;
  }
}

