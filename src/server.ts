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
  
  // Import custom middleware
  import { apiRequestLogger, corsMiddleware, methodNotAllowedHandler } from './middleware/apiErrorHandler';

  // Create Express server
  const app: any = express();
  const port = process.env.PORT || 3000;

  // Create HTTP server and Socket.IO instance
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // In production, set this to your frontend URL
      methods: ['GET', 'POST']
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
    
    // Method not allowed handler should come after CORS but before routes
    app.use(methodNotAllowedHandler);
  } catch (error) {
    console.warn('Error applying middleware:', error);
  }

  // Apply rate limiting middleware using our custom polyfill
  try {
    app.use(rateLimit({
      windowMs: API_RATE_LIMIT.windowMs,
      max: API_RATE_LIMIT.maxRequests,
      message: 'Too many requests, please try again later.',
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    }) as any);
  } catch (error) {
    console.warn('Error applying rate limit middleware:', error);
  }

  // API routes
  try {
    // Use the centralized API routes - this includes all subroutes including direct API routes
    app.use('/api', apiRoutes);
    
    // For backwards compatibility, keep these too
    app.use('/api/businesses', businessRoutes);
    app.use('/api', feedbackRoutes);
    app.use('/api', notificationRoutes);
    app.use('/api', debugRoutes);
    app.use('/api/direct', directApiRoutes);
    
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
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Socket.IO event handlers
  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);
    
    // Authenticate socket
    const token = socket.handshake?.auth?.token;
    if (token) {
      try {
        // In production, verify the token and get the user ID
        // For now, we'll just use a mock user ID
        const userId = '123'; // Mock user ID
        socket.join(`user:${userId}`);
        console.log(`User ${userId} authenticated and joined room`);
      } catch (error) {
        console.error('Socket authentication failed:', error);
      }
    }
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
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