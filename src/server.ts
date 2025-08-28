/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_RATE_LIMIT } from './env';

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
    console.log('Mock emitNotification called, no-op in browser environment', { userId, notification });
  };
  
  export const emitApprovalRequest = (userId: string, approvalRequest: any): void => {
    console.log('Mock emitApprovalRequest called, no-op in browser environment', { userId, approvalRequest });
  };
  
  // Export mock app
  export default mockApp;
} else {
  // Server-side code - only runs in Node.js environment
  // Apply server-side fixes
  try {
    require('./server-award-points-fix.js');
    require('./apply-diagnostics.js');
    console.log('✅ Applied server-side fixes and diagnostics');
  } catch (e) {
    console.error('❌ Error applying server-side fixes:', e);
  }
  
  import express from 'express';
  import cors from './utils/corsPolyfill';
  // Import our custom helmet polyfill instead of the real helmet
  import helmet from './utils/helmetPolyfill';
  // Import our custom rate limiter polyfill
  import rateLimit from './utils/rateLimitPolyfill';
  import { createServer } from 'http';
  import { Server, Socket } from 'socket.io';

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
        ? [process.env.FRONTEND_URL || 'https://yourdomain.com'] // Restrict to specific domain in production
        : ['http://localhost:5173', 'http://localhost:3000'], // Allow localhost in development
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
    app.use(express.json());
    
    // Add request logging
    app.use(apiRequestLogger);
    
    // Add route debugging middleware
    app.use(routeDebugMiddleware);
    
    // Add special award-points debugging
    app.use(awardPointsDebugMiddleware);
    
    // Method not allowed handler should come after CORS but before routes
    app.use(methodNotAllowedHandler);
  } catch (error) {
    console.warn('Error applying middleware:', error);
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
    console.warn('Error applying rate limit middleware:', error);
  }

  // API routes
  try {
    console.log('🔄 Registering API routes...');
    
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
          const user = (req.body && req.body.email) || '';
          return `auth:${ip}:${user}`;
        }
      });
      app.use('/api/auth', authLimiter as any);
    } catch (e) {
      console.warn('Error applying auth rate limiter:', e);
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
    console.warn('Error setting up API routes:', error);
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

  // Socket.IO event handlers with SECURE authentication
  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);
    
    // SECURITY: Implement proper JWT-based socket authentication
    const authenticateSocket = async (token: string): Promise<{ userId: string; user: any } | null> => {
      try {
        if (!token) return null;
        
        // Import JWT verification
        const jwt = await import('jsonwebtoken');
        const env = await import('./utils/env');
        
        // Verify JWT token
        const decoded = jwt.verify(token, env.default.JWT_SECRET) as any;
        
        if (!decoded || !decoded.userId) {
          return null;
        }
        
        // Get user details from database
        const sql = await import('./utils/db');
        const user = await sql.default`
          SELECT id, email, role, status 
          FROM users 
          WHERE id = ${decoded.userId} AND status = 'active'
        `;
        
        if (!user || user.length === 0) {
          return null;
        }
        
        return { userId: decoded.userId, user: user[0] };
      } catch (error) {
        console.error('Socket authentication failed:', error);
        return null;
      }
    };
    
    // Authenticate socket connection
    const token = socket.handshake?.auth?.token;
    if (token) {
      authenticateSocket(token).then((authResult) => {
        if (authResult) {
          const { userId, user } = authResult;
          
          // SECURITY: Join user-specific room only after authentication
          socket.join(`user:${userId}`);
          
          // SECURITY: Store user info in socket for later use
          (socket as any).userId = userId;
          (socket as any).user = user;
          
          console.log(`User ${userId} (${user.email}) authenticated and joined room`);
          
          // SECURITY: Emit authentication success
          socket.emit('authenticated', { 
            userId, 
            message: 'Socket authenticated successfully' 
          });
        } else {
          // SECURITY: Disconnect unauthenticated sockets
          socket.emit('authentication_failed', { 
            error: 'Invalid or expired token' 
          });
          socket.disconnect(true);
        }
      }).catch((error) => {
        console.error('Socket authentication error:', error);
        socket.emit('authentication_failed', { 
          error: 'Authentication error' 
        });
        socket.disconnect(true);
      });
    } else {
      // SECURITY: Require authentication for all socket connections
      socket.emit('authentication_required', { 
        error: 'Authentication token required' 
      });
      socket.disconnect(true);
    }
    
    // SECURITY: Handle socket events with authentication checks
    socket.on('join_room', async (data) => {
      const userId = (socket as any).userId;
      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }
      
      // SECURITY: Validate room access permissions
      if (data.room && data.room.startsWith(`user:${userId}`)) {
        socket.join(data.room);
        socket.emit('room_joined', { room: data.room });
      } else {
        socket.emit('error', { error: 'Access denied to room' });
      }
    });
    
    socket.on('leave_room', (data) => {
      const userId = (socket as any).userId;
      if (!userId) {
        socket.emit('error', { error: 'Not authenticated' });
        return;
      }
      
      if (data.room && data.room.startsWith(`user:${userId}`)) {
        socket.leave(data.room);
        socket.emit('room_left', { room: data.room });
      }
    });
    
    socket.on('disconnect', () => {
      const userId = (socket as any).userId;
      if (userId) {
        console.log(`User ${userId} disconnected from socket ${socket.id}`);
      } else {
        console.log(`Unauthenticated client disconnected: ${socket.id}`);
      }
    });
  });

  // Function to emit real-time notifications to specific users
  export const emitNotification = (userId: string, notification: any) => {
    try {
      if (io && typeof io.to === 'function') {
        io.to(`user:${userId}`).emit(`notification:${userId}`, notification);
      } else {
        console.warn('Socket.io instance not properly initialized');
      }
    } catch (error) {
      console.error('Error emitting notification:', error);
    }
  };

  // Function to emit approval requests to specific users
  export const emitApprovalRequest = (userId: string, approvalRequest: any) => {
    try {
      if (io && typeof io.to === 'function') {
        io.to(`user:${userId}`).emit(`approval:${userId}`, approvalRequest);
      } else {
        console.warn('Socket.io instance not properly initialized');
      }
    } catch (error) {
      console.error('Error emitting approval request:', error);
    }
  };

  // Start server only in Node.js environment
  if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }

  // Export app
  export default app;
} 