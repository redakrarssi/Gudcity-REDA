const express = require('express');
const { getUserByEmail, createUser } = require('../services/userService');
// Import auth service functions
const authService = require('../services/authServiceFixed');
const { generateTokens, verifyToken, refreshTokens } = authService;
const { auth } = require('../middleware/authFixed');
const { FailedLoginService } = require('../services/failedLoginService');

const router = express.Router();

/**
 * Login endpoint
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Check for account lockout
    const lockoutInfo = await FailedLoginService.checkAccountLockout(email);
    if (lockoutInfo.isLocked) {
      return res.status(423).json({
        error: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
        lockoutInfo
      });
    }

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      // Record failed login attempt
      await FailedLoginService.recordFailedAttempt(email);
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is banned
    if (user.status === 'banned') {
      return res.status(403).json({
        error: 'Account has been banned',
        code: 'ACCOUNT_BANNED'
      });
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password || '');
    
    if (!isValidPassword) {
      // Record failed login attempt
      await FailedLoginService.recordFailedAttempt(email);
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Reset failed login attempts on successful login
    await FailedLoginService.resetFailedAttempts(email);

    // Generate tokens
    const tokens = await generateTokens(user);

    // Update last login
    // Note: This would need to be implemented in userService if needed

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        user_type: user.user_type,
        business_name: user.business_name,
        status: user.status
      },
      tokens
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * Register endpoint
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, user_type, business_name, business_phone } = req.body;

    // Validate input
    if (!name || !email || !password || !user_type) {
      return res.status(400).json({
        error: 'Name, email, password, and user_type are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Create user
    const userData = {
      name,
      email,
      password,
      user_type,
      business_name,
      business_phone,
      role: user_type === 'business' ? 'business' : 'customer'
    };

    const newUser = await createUser(userData);
    if (!newUser) {
      return res.status(500).json({
        error: 'Failed to create user',
        code: 'CREATE_USER_FAILED'
      });
    }

    // Generate tokens for new user
    const tokens = await generateTokens(newUser);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        user_type: newUser.user_type,
        business_name: newUser.business_name,
        status: newUser.status
      },
      tokens
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REGISTRATION_ERROR'
    });
  }
});

/**
 * Refresh token endpoint
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Use refreshTokens function
    const newTokens = await refreshTokens(refreshToken);

    if (!newTokens) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    res.json({
      success: true,
      tokens: newTokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'REFRESH_ERROR'
    });
  }
});

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * Get current user endpoint
 * GET /api/auth/me
 */
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'GET_USER_ERROR'
    });
  }
});

export default router;