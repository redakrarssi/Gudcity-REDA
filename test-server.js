/**
 * Simple test server to run serverless functions locally
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock Vercel environment for our handler
function createVercelHandler(handler) {
  return async (req, res) => {
    try {
      // Create Vercel-compatible request object
      const vercelReq = {
        ...req,
        query: {
          ...req.query,
          ...req.params
        }
      };

      // Create Vercel-compatible response object
      const vercelRes = {
        status: (code) => {
          res.status(code);
          return vercelRes;
        },
        json: (data) => {
          res.json(data);
          return vercelRes;
        },
        end: (data) => {
          res.end(data);
          return vercelRes;
        },
        setHeader: (name, value) => {
          res.setHeader(name, value);
          return vercelRes;
        }
      };

      await handler(vercelReq, vercelRes);
    } catch (error) {
      console.error('Handler error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  };
}

// Import and setup the auth handler
async function setupAuthHandler() {
  try {
    console.log('📦 Loading auth handler...');
    
    // We'll manually create a simple auth handler for testing
    const authHandler = async (req, res) => {
      console.log(`🔐 Auth request: ${req.method} ${req.url}`);
      console.log('📋 Body:', req.body);
      console.log('🎯 Action:', req.query.action);

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      const { action } = req.query;

      if (action === 'login') {
        if (req.method !== 'POST') {
          return res.status(405).json({
            success: false,
            error: `Method ${req.method} not allowed. Use POST.`,
            timestamp: new Date().toISOString()
          });
        }

        const { email, password } = req.body || {};

        if (!email || !password) {
          return res.status(400).json({
            success: false,
            error: 'Email and password are required',
            timestamp: new Date().toISOString()
          });
        }

        // Simple test - accept demo credentials
        if (email === 'demo@gudcity.com' && password === 'Demo123!@#') {
          return res.status(200).json({
            success: true,
            data: {
              user: {
                id: 'demo-user-123',
                email: 'demo@gudcity.com',
                name: 'Demo User',
                role: 'USER',
                status: 'ACTIVE'
              },
              accessToken: 'demo-access-token-12345',
              refreshToken: 'demo-refresh-token-67890',
              expiresIn: 3600
            },
            message: 'Login successful',
            timestamp: new Date().toISOString()
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Invalid email or password',
            timestamp: new Date().toISOString()
          });
        }
      }

      return res.status(404).json({
        success: false,
        error: `Invalid action: ${action}`,
        timestamp: new Date().toISOString()
      });
    };

    // Setup auth routes
    app.all('/api/auth/:action', createVercelHandler(authHandler));
    
    console.log('✅ Auth handler loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error loading auth handler:', error);
    return false;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: { status: 'healthy' },
        auth: { status: 'available' }
      }
    },
    message: 'Test server is running'
  });
});

// Start server
async function startServer() {
  console.log('🚀 Starting GudCity Test Server');
  console.log('=====================================');

  const authLoaded = await setupAuthHandler();
  
  if (!authLoaded) {
    console.log('❌ Failed to load auth handler');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✅ Test server running on http://localhost:${PORT}`);
    console.log('🔐 Auth endpoint: http://localhost:3000/api/auth/login');
    console.log('🏥 Health endpoint: http://localhost:3000/api/health');
    console.log('=====================================');
    console.log('💡 Ready for testing! Use:');
    console.log('   npm run test:login');
    console.log('   npm run test:auth');
    console.log('=====================================');
  });
}

startServer().catch(console.error);
