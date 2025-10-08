// Fixed Express server implementation
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Pool } = require('pg');

// Load environment variables
dotenv.config();

// Database connection (Postgres)
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.POSTGRES_URL;
let pgPool = null;

console.log('🔍 Database configuration check:');
console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('- VITE_DATABASE_URL exists:', !!process.env.VITE_DATABASE_URL);
console.log('- Final DATABASE_URL:', DATABASE_URL ? 'configured' : 'NOT CONFIGURED');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not configured. Please set DATABASE_URL or VITE_DATABASE_URL in your environment.');
  console.log('Expected format: postgres://user:password@host:port/database?sslmode=require');
} else {
  try {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Test the connection
    pgPool.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.error('❌ Database connection test failed:', err.message);
      } else {
        console.log('✅ Database connection successful at:', result.rows[0].now);
      }
    });
    
  } catch (e) {
    console.error('❌ Failed to initialize Postgres pool:', e);
  }
}

// Import admin routes (CommonJS)
let adminBusinessRoutes;
try {
  adminBusinessRoutes = require('./api/adminBusinessRoutesFixed.cjs');
} catch (e) {
  adminBusinessRoutes = require('./api/adminBusinessRoutesFixed');
}

// Simple in-memory rate limiting (dev) for auth endpoints
const rateLimitStore = new Map();
function checkRateLimit(identifier) {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  if (entry) {
    if (entry.lockedUntil && entry.lockedUntil > now) {
      return { allowed: false, lockedUntil: entry.lockedUntil };
    }
    if (now > entry.resetAt) {
      rateLimitStore.set(identifier, { count: 1, resetAt: now + 60000 });
      return { allowed: true };
    }
    entry.count++;
    if (entry.count > 5) {
      entry.lockedUntil = now + 300000;
      return { allowed: false, lockedUntil: entry.lockedUntil };
    }
    return { allowed: true };
  }
  rateLimitStore.set(identifier, { count: 1, resetAt: now + 60000 });
  return { allowed: true };
}

// Import auth routes (CommonJS) or securely implement login here
let authRoutes;
try {
  authRoutes = require('./api/authRoutesFixed.cjs');
} catch (e) {
  // If authRoutesFixed.cjs doesn't exist, create a secure login handler here
  authRoutes = {
    login: async (req, res) => {
      try {
        const { email, password } = req.body || {};
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!pgPool) {
          return res.status(500).json({ error: 'Database not configured' });
        }

        const rate = checkRateLimit(String(email).toLowerCase());
        if (!rate.allowed) {
          return res.status(429).json({
            error: 'Account temporarily locked due to multiple failed attempts',
            lockedUntil: rate.lockedUntil,
          });
        }

        const result = await pgPool.query(
          'SELECT id, email, name, user_type, role, password, status FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [email]
        );

        if (!result.rows || result.rows.length === 0) {
          try {
            await pgPool.query(
              'INSERT INTO failed_logins (email, ip_address, attempted_at) VALUES ($1, $2, NOW())',
              [email, req.headers['x-forwarded-for'] || req.ip || 'unknown']
            );
          } catch {}
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        if (user.status === 'inactive' || user.status === 'suspended') {
          return res.status(403).json({ error: 'Account is inactive or suspended' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          try {
            await pgPool.query(
              'INSERT INTO failed_logins (email, ip_address, attempted_at) VALUES ($1, $2, NOW())',
              [email, req.headers['x-forwarded-for'] || req.ip || 'unknown']
            );
          } catch {}
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        rateLimitStore.delete(String(email).toLowerCase());

        const secret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
        const jti = crypto.randomBytes(16).toString('hex');
        const token = jwt.sign({
          userId: user.id,
          email: user.email,
          role: user.role || user.user_type,
          jti,
        }, secret, { expiresIn: '24h' });

        try {
          await pgPool.query(
            'INSERT INTO auth_tokens (user_id, token, jti, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'24 hours\') ON CONFLICT (jti) DO NOTHING',
            [user.id, token, jti]
          );
        } catch (e2) {
          console.warn('Error storing token (continuing):', e2?.message);
        }

        return res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || user.user_type,
            user_type: user.user_type,
          },
        });
      } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    },
  };
}

let authFixed;
try {
  authFixed = require('./middleware/authFixed.cjs');
} catch (e) {
  authFixed = require('./middleware/authFixed');
}
const { auth, requireAdmin } = authFixed;

// Create Express server
const app = express();
const PORT = process.env.VITE_PORT || 3000;

// Apply middlewares
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/admin', adminBusinessRoutes);

// Register auth routes
app.post('/api/auth/login', authRoutes.login);

// Add generate-tokens endpoint
app.post('/api/auth/generate-tokens', async (req, res) => {
  try {
    const { userId, email, role } = req.body;
    
    // Validate input
    if (!userId || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, email, role'
      });
    }
    
    const secret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        error: 'JWT secret not configured'
      });
    }
    
    // Generate JWT tokens
    const accessJti = crypto.randomBytes(16).toString('hex');
    const refreshJti = crypto.randomBytes(16).toString('hex');
    
    const accessToken = jwt.sign({
      userId: Number(userId),
      email: String(email),
      role: String(role),
      jti: accessJti
    }, secret, {
      expiresIn: '15m',
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users',
      jwtid: accessJti
    });
    
    const refreshToken = jwt.sign({
      userId: Number(userId),
      email: String(email),
      role: String(role),
      jti: refreshJti
    }, secret, {
      expiresIn: '7d',
      issuer: 'gudcity-loyalty-platform',
      audience: 'gudcity-users',
      jwtid: refreshJti
    });
    
    // Store refresh token in database if available
    if (pgPool) {
      try {
        await pgPool.query(
          'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\') ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = NOW() + INTERVAL \'7 days\'',
          [userId, refreshToken]
        );
      } catch (error) {
        console.warn('Warning: Failed to store refresh token:', error.message);
      }
    }
    
    console.log('✅ JWT tokens generated successfully for user:', userId);
    
    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 900 // 15 minutes in seconds
      }
    });
    
  } catch (error) {
    console.error('Error generating tokens:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate tokens'
    });
  }
});

// Add security audit logging endpoint (with fallback if table doesn't exist)
app.post('/api/security/log-event', async (req, res) => {
  try {
    const { actionType, resourceId, userId, ipAddress, userAgent, details } = req.body;
    
    // Try to log to database if table exists
    if (pgPool) {
      try {
        await pgPool.query(
          'INSERT INTO security_audit_logs (action_type, resource_id, user_id, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5, $6)',
          [actionType, resourceId, userId, ipAddress || 'unknown', userAgent || 'unknown', JSON.stringify(details || {})]
        );
        console.log('✅ Security event logged to database');
      } catch (error) {
        // If table doesn't exist, just log to console
        console.log('⚠️ Security audit table not available, logging to console:', {
          actionType, resourceId, userId, ipAddress, userAgent, details
        });
      }
    } else {
      console.log('⚠️ Database not available, logging to console:', {
        actionType, resourceId, userId, ipAddress, userAgent, details
      });
    }
    
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Error logging security event:', error);
    return res.status(500).json({ success: false, error: 'Failed to log security event' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Not found middleware
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.path} not found`
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`✅ API Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Admin businesses API: http://localhost:${PORT}/api/admin/businesses`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = { app, server };
