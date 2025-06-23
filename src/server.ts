import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { API_RATE_LIMIT } from './env';

// Import route files
import businessRoutes from './api/businessRoutes';
import feedbackRoutes from './api/feedbackRoutes';
import notificationRoutes from './api/notificationRoutes';

// Create Express server
const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, set this to your frontend URL
    methods: ['GET', 'POST']
  }
});

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(express.json()); // Parse JSON request bodies

// Rate limiting
const limiter = rateLimit({
  windowMs: API_RATE_LIMIT.windowMs,
  max: API_RATE_LIMIT.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// API routes
app.use('/api', businessRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
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
  const token = socket.handshake.auth.token;
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
  io.to(`user:${userId}`).emit(`notification:${userId}`, notification);
};

// Function to emit approval requests to specific users
export const emitApprovalRequest = (userId: string, approvalRequest: any) => {
  io.to(`user:${userId}`).emit(`approval:${userId}`, approvalRequest);
};

// Start server
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app; 