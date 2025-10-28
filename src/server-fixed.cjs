// Fixed Express server implementation
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import admin routes (CommonJS)
let adminBusinessRoutes;
try {
  adminBusinessRoutes = require('./api/adminBusinessRoutesFixed.cjs');
} catch (e) {
  adminBusinessRoutes = require('./api/adminBusinessRoutesFixed');
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

// Auth test route
app.get('/api/test-auth', auth, (req, res) => {
  res.json({
    message: 'Auth test endpoint working',
    user: req.user
  });
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
