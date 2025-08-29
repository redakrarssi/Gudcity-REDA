import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Simple in-memory storage for demo purposes
const users = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '+1234567890',
    role: 'admin',
    avatar_url: '',
    two_factor_enabled: false,
    notification_settings: {
      email_notifications: true,
      login_alerts: true,
      system_updates: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User settings endpoint
app.get('/api/users/me/settings', (req, res) => {
  try {
    // For demo purposes, return the first user
    const user = users[0];
    res.json(user);
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings endpoint
app.put('/api/users/me/settings', (req, res) => {
  try {
    const { name, email, phone, avatar_url, two_factor_enabled, notification_settings } = req.body;
    
    // Update the first user (demo purposes)
    if (users[0]) {
      users[0] = {
        ...users[0],
        name: name || users[0].name,
        email: email || users[0].email,
        phone: phone || users[0].phone,
        avatar_url: avatar_url || users[0].avatar_url,
        two_factor_enabled: two_factor_enabled !== undefined ? two_factor_enabled : users[0].two_factor_enabled,
        notification_settings: notification_settings || users[0].notification_settings,
        updated_at: new Date().toISOString()
      };
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update password endpoint
app.put('/api/users/me/password', (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing currentPassword or newPassword' });
    }
    
    // For demo purposes, just return success
    // In a real app, you'd verify the current password and hash the new one
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin analytics endpoint (simplified)
app.get('/api/admin/analytics', (req, res) => {
  try {
    // Return mock analytics data
    res.json({
      totalUsers: 150,
      totalBusinesses: 25,
      totalPrograms: 45,
      totalLoyaltyCards: 1200,
      recentActivity: [
        { type: 'user_registration', count: 5, date: new Date().toISOString() },
        { type: 'points_awarded', count: 23, date: new Date().toISOString() },
        { type: 'enrollment', count: 8, date: new Date().toISOString() }
      ]
    });
  } catch (error) {
    console.error('Error getting admin analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Simple server running on port ${port}`);
  console.log(`📱 Frontend URL: http://localhost:5173`);
  console.log(`🔗 API URL: http://localhost:${port}`);
  console.log(`✅ Available endpoints:`);
  console.log(`   - GET  /health`);
  console.log(`   - GET  /api/users/me/settings`);
  console.log(`   - PUT  /api/users/me/settings`);
  console.log(`   - PUT  /api/users/me/password`);
  console.log(`   - GET  /api/admin/analytics`);
});

export default app;