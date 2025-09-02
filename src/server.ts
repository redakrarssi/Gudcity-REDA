/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_RATE_LIMIT } from './env';
// Import the professional logging system
import { log, logUtils } from './utils/logger';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a mock server for browser environment
if (isBrowser) {
  // Mock server implementation for browser
  const mockApp: any = {
    use: () => mockApp,
    get: () => mockApp,
    post: () => mockApp,
    put: () => mockApp,
    delete: () => mockApp,
    listen: () => mockApp
  };

  const mockIo: any = {
    on: () => {},
    to: () => ({ emit: () => {} }),
    emit: () => {}
  };

  // Export mock functions that do nothing in browser environment
  export const emitNotification = (userId: string, notification: any): void => {
    // Mock function - no logging needed in browser environment
  };
  
  export const emitApprovalRequest = (userId: string, approvalRequest: any): void => {
    // Mock function - no logging needed in browser environment
  };
  
  // Export mock app
  export default mockApp;
} else {
  // Server-side code - only runs in Node.js environment
  // Apply server-side fixes (if they exist)
  try {
    require('./server-award-points-fix.js');
    log.server('Applied server-award-points-fix');
  } catch (e) {
    log.debug('server-award-points-fix.js not found - skipping');
  }
  
  try {
    require('./apply-diagnostics.js');
    log.server('Applied diagnostics');
  } catch (e) {
    log.debug('apply-diagnostics.js not found - skipping');
  }
  
  // SECURITY: Import and run environment validation
  try {
    const validationModule = await import('./utils/validateEnvironment.js');
    
    // Use environment-appropriate logging
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Production: Log only critical security issues to reduce verbosity
      if (validationModule.logCriticalSecurityIssues) {
        validationModule.logCriticalSecurityIssues();
      }
    } else {
      // Development: Full detailed security validation logging
      if (validationModule.logSecurityValidation) {
        validationModule.logSecurityValidation();
      }
    }
    
    // Check if we can start safely (always critical)
    if (validationModule.canStartSafely && !validationModule.canStartSafely()) {
      log.security('CRITICAL SECURITY ISSUES DETECTED - Application startup blocked');
      log.error('Application cannot start safely. Please fix all critical security issues.', null, {
        environment: process.env.NODE_ENV,
        action: 'startup_blocked'
      });
      process.exit(1);
    }
    
    // Success logging - minimal in production, detailed in development
    if (isProduction) {
      logUtils.prodOnly('info', 'Security validation passed - starting server', {
        environment: process.env.NODE_ENV,
        validationLevel: 'critical'
      });
    } else {
      log.security('Security validation passed - starting server', {
        environment: process.env.NODE_ENV,
        validationLevel: 'full'
      });
    }
  } catch (e) {
    log.error('Error during security validation', e, {
      environment: process.env.NODE_ENV,
      phase: 'startup_validation'
    });
    log.warn('Proceeding with server startup, but security validation could not be completed');
  }
  
  import express from 'express';
  import cors from './utils/corsPolyfill';
  // Import our custom helmet polyfill instead of the real helmet
  import helmet from './utils/helmetPolyfill';
  // Import our custom rate limiter polyfill
  import rateLimit from './utils/rateLimitPolyfill';
  import { createServer } from 'http';
  import { Server, Socket } from 'socket.io';
  import { csrfMiddleware, ensureCsrfCookie, CSRF_HEADER_NAME } from './utils/csrf';
  import crypto from 'crypto';

  // Import centralized API routes
  import apiRoutes from './api/index';
  // For backwards compatibility, keep direct imports
  import businessRoutes from './api/businessRoutes';
  import feedbackRoutes from './api/feedbackRoutes';
  import notificationRoutes from './api/notificationRoutes';
  import debugRoutes from './api/debugRoutes';
  import directApiRoutes from './api/directApiRoutes';
  // Import test routes for debugging
  import testRoutes from './api/testRoutes';
  // Import the award points handler
  import { handleAwardPoints } from './api/awardPointsHandler';
  
  // Import custom middleware
  import { apiRequestLogger, corsMiddleware, methodNotAllowedHandler } from './middleware/apiErrorHandler';
  // Import debugging middleware
  import { routeDebugMiddleware, awardPointsDebugMiddleware, logRegisteredRoutes } from './middleware/routeDebugMiddleware';
  // Import secure error response utility
  import { createSecureErrorResponse, logSecureError, isDevelopmentEnvironment } from './utils/secureErrorResponse';

  // Create Express server
  const app: any = express();
  const port = process.env.PORT || 3000;

  // Create HTTP server and Socket.IO instance
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || 'http://localhost:5173'] // Restrict to specific frontend URL in production
        : ['http://localhost:5173', 'http://localhost:3000'], // Development origins
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Apply middleware in the correct order
  try {
    // First apply CORS middleware to handle preflight requests
    app.use(corsMiddleware);
    
    // Then apply security headers
    app.use(helmet() as any);
    
    // Apply JSON body parser BEFORE routes
    app.use(express.json({ limit: '100kb' }));

    // Ensure CSRF cookie is present on safe API GETs
    app.use((req: any, res: any, next: any) => {
      const method = (req.method || 'GET').toUpperCase();
      if (req.path && req.path.startsWith('/api/') && method === 'GET') {
        return ensureCsrfCookie(req, res, next);
      }
      return next();
    });

    // Enforce CSRF on state-changing API requests
    app.use(csrfMiddleware as any);
    
    // Add request logging
    app.use(apiRequestLogger);
    
    // Add route debugging middleware
    app.use(routeDebugMiddleware);
    
    // Add special award-points debugging
    app.use(awardPointsDebugMiddleware);
    
    // Method not allowed handler should come after CORS but before routes
    app.use(methodNotAllowedHandler);
  } catch (error) {
    log.warn('Error applying middleware', error);
  }

  // Apply general rate limiting middleware using our custom polyfill
  try {
    app.use(rateLimit({
      windowMs: API_RATE_LIMIT.windowMs,
      max: API_RATE_LIMIT.maxRequests,
      message: 'Too many requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    }) as any);
  } catch (error) {
    log.warn('Error applying rate limit middleware', error);
  }

  // API routes
  try {
    log.server('Registering API routes...');
    
    // Register test routes first
    app.use('/api/test', testRoutes);
    
    // Register direct routes
    app.use('/api/direct', directApiRoutes);
    
    // IMPORTANT: Register a direct handler for award-points at the top level
    // This ensures it gets priority over any potentially conflicting routes
    app.post('/api/businesses/award-points', handleAwardPoints);
    
    // Register the main API routes
    app.use('/api', apiRoutes);

    // Apply stricter rate limit to auth endpoints specifically
    try {
      const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: { error: 'Too many authentication attempts. Please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: any) => {
          const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
          const email = (req.body && req.body.email) || '';
          const hashedEmail = email ? crypto.createHash('sha256').update(email).digest('hex') : '';
          return `auth:${ip}:${hashedEmail}`;
        }
      });
      app.use('/api/auth', authLimiter as any);
    } catch (e) {
      log.warn('Error applying auth rate limiter', e);
    }
    
    // Log all registered routes
    logRegisteredRoutes(app);
    
    // Add a fallback route handler for undefined routes
    app.use('/api/*', (req: express.Request, res: express.Response) => {
      res.status(404).json({ 
        error: 'Not Found',
        message: `Route ${req.path} not found or method ${req.method} not supported`
      });
    });
  } catch (error) {
    log.warn('Error setting up API routes', error);
  }

  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { statusCode, response } = createSecureErrorResponse(err, isDevelopmentEnvironment());
    
    // Log error securely without exposing sensitive information
    logSecureError(err, response.requestId, {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: (req as any).user?.id
    });
    
    res.status(statusCode).json(response);
  });

  // Socket.IO event handlers
  io.on('connection', (socket: Socket) => {
    log.info('New WebSocket client connected', { socketId: socket.id });
    
    // Authenticate socket
    const token = socket.handshake?.auth?.token;
    if (token) {
      try {
        // In production, verify the token and get the user ID
        // For now, we'll just use a mock user ID
        const userId = '123'; // Mock user ID
        socket.join(`user:${userId}`);
        log.info('User authenticated and joined WebSocket room', { userId, socketId: socket.id });
      } catch (error) {
        log.error('Socket authentication failed', error, { socketId: socket.id });
      }
    }
    
    socket.on('disconnect', () => {
      log.info('WebSocket client disconnected', { socketId: socket.id });
    });
  });

  // Function to emit real-time notifications to specific users
  export const emitNotification = (userId: string, notification: any) => {
    try {
      if (io && typeof io.to === 'function') {
        io.to(`user:${userId}`).emit(`notification:${userId}`, notification);
        logUtils.devOnly('debug', 'Emitted WebSocket notification', { userId, notificationType: notification?.type });
      } else {
        log.warn('Socket.io instance not properly initialized for notification emit');
      }
    } catch (error) {
      log.error('Error emitting WebSocket notification', error, { userId });
    }
  };

  // Function to emit approval requests to specific users
  export const emitApprovalRequest = (userId: string, approvalRequest: any) => {
    try {
      if (io && typeof io.to === 'function') {
        io.to(`user:${userId}`).emit(`approval:${userId}`, approvalRequest);
        logUtils.devOnly('debug', 'Emitted WebSocket approval request', { userId, requestType: approvalRequest?.type });
      } else {
        log.warn('Socket.io instance not properly initialized for approval request emit');
      }
    } catch (error) {
      log.error('Error emitting WebSocket approval request', error, { userId });
    }
  };

  // Start server only in Node.js environment
  if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(port, () => {
      log.server(`Server running on port ${port}`, { 
        port, 
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });
  }

  // Export app
  export default app;
} 