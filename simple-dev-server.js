#!/usr/bin/env node

/**
 * Simple Development Server
 * Just for handling login requests during development
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple login endpoint for development
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password: password ? '***' : 'missing' });
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // For development, accept any email/password combination
  const token = 'dev_token_' + Date.now();
  const user = {
    id: 1,
    email: email,
    name: 'Test User',
    role: 'customer',
    user_type: 'customer'
  };
  
  console.log('Login successful for:', email);
  
  res.json({
    token,
    user
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Simple dev server running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Simple Dev Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
});

export default app;
