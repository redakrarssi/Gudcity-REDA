import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Override the database import to use the server-compatible version
import './utils/db-server';

// Load environment variables
dotenv.config();

// Import API routes
import userRoutes from './api/userRoutes';
import businessRoutes from './api/businessRoutes';
import customerRoutes from './api/customerRoutes';
import adminRoutes from './api/adminRoutes';
import authRoutes from './api/authRoutes';
import directApiRoutes from './api/directApiRoutes';
import testRoutes from './api/testRoutes';

// Import middleware
import { csrfMiddleware, ensureCsrfCookie } from './utils/csrf';
import { apiRequestLogger, corsMiddleware, methodNotAllowedHandler } from './middleware/apiErrorHandler';
import { routeDebugMiddleware, logRegisteredRoutes } from './middleware/routeDebugMiddleware';

// Create Express server
const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'http://localhost:5173']
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'http://localhost:5173']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// CSRF protection
app.use(csrfMiddleware);

// Request logging
app.use(apiRequestLogger);

// Route debugging
app.use(routeDebugMiddleware);

// API routes
app.use('/api/users', userRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/direct', directApiRoutes);
app.use('/api/debug-test', testRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', methodNotAllowedHandler);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📱 Frontend URL: ${process.env.APP_URL || 'http://localhost:5173'}`);
  console.log(`🔗 API URL: http://localhost:${port}`);
  
  // Log registered routes
  logRegisteredRoutes(app);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;