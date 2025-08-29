/**
 * Authentication Routes
 * 
 * Handles user authentication including login, register, logout, and token refresh.
 * These routes are safe to create as they follow the established API pattern.
 */

import express from 'express';
import sql from '../utils/db';
import * as cryptoUtils from '../utils/cryptoUtils';
import { createSecureErrorResponse, isDevelopmentEnvironment } from '../utils/secureErrorResponse';
import { validatePassword } from '../utils/inputValidation';
import { serverEnvironment } from '../utils/env';

const router = express.Router();

// JWT token generation (server-side only)
async function generateTokens(userId: number, email: string, role: string) {
  if (typeof window !== 'undefined') {
    throw new Error('Token generation must happen on server side');
  }

  const jwt = await import('jsonwebtoken');
  
  if (!serverEnvironment.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for token generation');
  }

  const accessToken = jwt.default.sign(
    { userId, email, role },
    serverEnvironment.JWT_SECRET,
    { expiresIn: serverEnvironment.JWT_EXPIRY || '1h' }
  );

  const refreshToken = jwt.default.sign(
    { userId, email, role },
    serverEnvironment.JWT_REFRESH_SECRET || serverEnvironment.JWT_SECRET,
    { expiresIn: serverEnvironment.JWT_REFRESH_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Find user by email
    const users = await sql`
      SELECT id, email, password, role, user_type, business_name, business_phone, avatar_url, created_at, last_login, status
      FROM users 
      WHERE email = ${email.toLowerCase().trim()}
    `;

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check if user is active
    if (user.status === 'banned' || user.status === 'restricted') {
      return res.status(403).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // Verify password
    let isPasswordValid = false;
    
    try {
      // Try bcrypt first (secure)
      const bcrypt = require('bcryptjs');
      if (user.password.startsWith('$2')) {
        isPasswordValid = await bcrypt.compare(password, user.password);
      }
    } catch (bcryptError) {
      console.log('bcryptjs not available, falling back to SHA-256');
    }

    // Fallback to SHA-256 if bcrypt fails or password is not bcrypt hash
    if (!isPasswordValid) {
      const sha256Hash = await cryptoUtils.createSha256Hash(password);
      isPasswordValid = sha256Hash === user.password;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokens = await generateTokens(user.id, user.email, user.role);

    // Update last login
    await sql`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `;

    // Return success response
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        user_type: user.user_type,
        business_name: user.business_name,
        business_phone: user.business_phone,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        last_login: user.last_login,
        status: user.status
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600 // 1 hour
    });

  } catch (error) {
    console.error('Login error:', error);
    
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/auth/register
 * User registration endpoint
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, user_type, business_name, business_phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !user_type) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, password, and user type are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}
    `;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    let hashedPassword: string;
    try {
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(12);
      hashedPassword = await bcrypt.default.hash(password, salt);
    } catch (bcryptError) {
      console.log('bcryptjs not available, falling back to SHA-256');
      hashedPassword = await cryptoUtils.createSha256Hash(password);
    }

    // Create user
    const newUser = await sql`
      INSERT INTO users (name, email, password, user_type, business_name, business_phone, role, created_at, status)
      VALUES (
        ${name.trim()},
        ${email.toLowerCase().trim()},
        ${hashedPassword},
        ${user_type},
        ${business_name || null},
        ${business_phone || null},
        ${user_type === 'business' ? 'business' : 'customer'},
        CURRENT_TIMESTAMP,
        'active'
      )
      RETURNING id, email, role, user_type, business_name, business_phone, created_at, status
    `;

    if (!newUser || newUser.length === 0) {
      throw new Error('Failed to create user');
    }

    const user = newUser[0];

    // Generate tokens
    const tokens = await generateTokens(user.id, user.email, user.role);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        user_type: user.user_type,
        business_name: user.business_name,
        business_phone: user.business_phone,
        created_at: user.created_at,
        status: user.status
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/auth/logout
 * User logout endpoint
 */
router.post('/logout', async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/auth/refresh
 * Token refresh endpoint
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const jwt = await import('jsonwebtoken');
    const secret = serverEnvironment.JWT_REFRESH_SECRET || serverEnvironment.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT refresh secret is not configured');
    }

    const decoded = jwt.default.verify(refreshToken, secret);
    
    // Generate new tokens
    const tokens = await generateTokens(decoded.userId, decoded.email, decoded.role);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
    res.status(statusCode).json(response);
  }
});

export default router;