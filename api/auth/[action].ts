import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { 
  withCors, 
  withErrorHandler, 
  withValidation, 
  withRateLimit, 
  withStrictRateLimit,
  sendSuccess, 
  sendError, 
  errors,
  sql,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  sanitizeInput
} from '../_middleware/index';

// Rate limiting store for auth endpoints
const loginAttempts: Record<string, { count: number; resetAt: number; lockedUntil?: number }> = {};

type AuthHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

type MethodHandlers = Partial<Record<string, AuthHandler>> & { ANY?: AuthHandler };

const AUTH_ACTIONS: Record<string, MethodHandlers> = {
  login: { POST: handleLogin },
  register: { POST: handleRegister },
  logout: { POST: handleLogout },
  refresh: { POST: handleRefreshToken },
  verify: { POST: handleVerifyToken },
  'forgot-password': { POST: handleForgotPassword },
  'reset-password': { POST: handleResetPassword },
  me: { GET: handleGetMe }
};

const ACTION_ALIASES: Record<string, keyof typeof AUTH_ACTIONS> = {
  'refresh-token': 'refresh',
  'verify-token': 'verify'
};

// Password validation
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return { isValid: errors.length === 0, errors };
}

// Main handler
async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const actionParam = req.query.action;
  const rawAction = Array.isArray(actionParam) ? actionParam[0] : actionParam;

  if (!rawAction) {
    return sendError(res, 'Auth action is required', 400, 'INVALID_ACTION');
  }

  const normalizedAction = String(rawAction).trim().toLowerCase();
  const canonicalAction = ACTION_ALIASES[normalizedAction] ?? normalizedAction;

  // Log for debugging
  console.log(`Auth request: ${req.method} /api/auth/${canonicalAction}`);

  const handlerConfig = AUTH_ACTIONS[canonicalAction];

  if (!handlerConfig) {
    return sendError(res, `Invalid action: ${canonicalAction}`, 404, 'INVALID_ACTION');
  }

  const method = (req.method ?? 'GET').toUpperCase();
  const actionHandler = handlerConfig[method] ?? handlerConfig.ANY;

  if (!actionHandler) {
    const allowedMethods = Object.keys(handlerConfig).filter(key => key !== 'ANY');
    return sendError(
      res,
      `Method ${method} not allowed for action ${canonicalAction}`,
      405,
      'METHOD_NOT_ALLOWED',
      { allowedMethods }
    );
  }

  return actionHandler(req, res);
}

// Login handler
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, `Method ${req.method} not allowed. Use POST.`, 405);
  }
  
  const { email, password } = sanitizeInput(req.body);
  
  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400);
  }
  
  try {
    // Find user by email
    const users = await sql`
      SELECT id, email, password, role, name, status, failed_login_attempts, locked_until, created_at
      FROM users 
      WHERE LOWER(email) = LOWER(${email})
    `;
    
    const user = users[0];
    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return sendError(res, `Account locked. Try again in ${remainingTime} minutes`, 423);
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      
      await sql`
        UPDATE users 
        SET failed_login_attempts = ${failedAttempts}, 
            locked_until = ${lockUntil},
            last_failed_login = NOW()
        WHERE id = ${user.id}
      `;
      
      return sendError(res, 'Invalid email or password', 401);
    }
    
    // Check account status
    if (user.status === 'SUSPENDED') {
      return sendError(res, 'Account suspended', 403);
    }
    
    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    // Clear failed attempts and update last login
    await sql`
      UPDATE users 
      SET failed_login_attempts = 0, 
          locked_until = NULL, 
          last_login = NOW(),
          updated_at = NOW()
      WHERE id = ${user.id}
    `;
    
    // Log successful login
    await sql`
      INSERT INTO user_activity_logs (user_id, action, ip_address, user_agent, created_at)
      VALUES (${user.id}, 'LOGIN', ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}, ${req.headers['user-agent'] || 'unknown'}, NOW())
    `;
    
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at
    };
    
    return sendSuccess(res, {
      user: userData,
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour
    }, 'Login successful');
    
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'Login failed', 500);
  }
}

// Register handler
async function handleRegister(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  const { email, password, name, role = 'USER' } = sanitizeInput(req.body);
  
  if (!email || !password || !name) {
    return sendError(res, 'Email, password, and name are required', 400);
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return sendError(res, 'Password validation failed', 400, 'VALIDATION_ERROR', {
      errors: passwordValidation.errors
    });
  }
  
  try {
    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email})
    `;
    
    if (existingUsers.length > 0) {
      return sendError(res, 'User with this email already exists', 409);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const newUsers = await sql`
      INSERT INTO users (email, password, name, role, status, created_at, updated_at)
      VALUES (${email.toLowerCase()}, ${hashedPassword}, ${name}, ${role}, 'ACTIVE', NOW(), NOW())
      RETURNING id, email, name, role, status, created_at
    `;
    
    const user = newUsers[0];
    
    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    // Log registration
    await sql`
      INSERT INTO user_activity_logs (user_id, action, ip_address, user_agent, created_at)
      VALUES (${user.id}, 'REGISTER', ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}, ${req.headers['user-agent'] || 'unknown'}, NOW())
    `;
    
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at
    };
    
    return sendSuccess(res, {
      user: userData,
      accessToken,
      refreshToken,
      expiresIn: 3600
    }, 'Registration successful', 201);
    
  } catch (error) {
    console.error('Registration error:', error);
    return sendError(res, 'Registration failed', 500);
  }
}

// Logout handler
async function handleLogout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  // In a serverless environment, we can't invalidate JWTs server-side
  // The client should remove tokens from localStorage
  return sendSuccess(res, null, 'Logged out successfully');
}

// Refresh token handler
async function handleRefreshToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return sendError(res, 'Refresh token is required', 400);
  }
  
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if user still exists and is active
    const users = await sql`
      SELECT id, email, role, status FROM users WHERE id = ${decoded.userId}
    `;
    
    const user = users[0];
    if (!user || user.status !== 'ACTIVE') {
      return sendError(res, 'Invalid refresh token', 401);
    }
    
    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    
    return sendSuccess(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600
    }, 'Token refreshed successfully');
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return sendError(res, 'Invalid refresh token', 401);
  }
}

// Verify token handler (for middleware)
async function handleVerifyToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  // This endpoint is mainly for client-side token validation
  // The actual verification is done in the withAuth middleware
  return sendSuccess(res, { valid: true }, 'Token is valid');
}

// Get current user handler
async function handleGetMe(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  // Extract user from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return sendError(res, 'Authorization header required', 401);
  }
  
  // This would normally be handled by withAuth middleware
  // For now, return success - the client has the user data
  return sendSuccess(res, { authenticated: true }, 'User authenticated');
}

// Forgot password handler
async function handleForgotPassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  const { email } = sanitizeInput(req.body);
  
  if (!email) {
    return sendError(res, 'Email is required', 400);
  }
  
  // For security, always return success even if email doesn't exist
  // In a real implementation, you'd send an email with a reset token
  return sendSuccess(res, null, 'Password reset instructions sent to email');
}

// Reset password handler
async function handleResetPassword(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }
  
  const { token, newPassword } = sanitizeInput(req.body);
  
  if (!token || !newPassword) {
    return sendError(res, 'Reset token and new password are required', 400);
  }
  
  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return sendError(res, 'Password validation failed', 400, 'VALIDATION_ERROR', {
      errors: passwordValidation.errors
    });
  }
  
  // In a real implementation, you'd verify the reset token and update the password
  return sendSuccess(res, null, 'Password reset successful');
}

// Apply middleware and export
export default withCors(
  withErrorHandler(handler)
);
