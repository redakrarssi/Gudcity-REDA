import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import postgres from 'postgres';

// Load environment variables
dotenv.config();

// Create database connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 10
});

// Create Express server
const app = express();
const port = process.env.PORT || 3001; // Use different port to avoid conflicts

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

// Apply rate limiting middleware
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
}));

// Simple middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Mock authentication middleware for testing
const mockAuth = (req, res, next) => {
  // For testing purposes, create a mock user
  req.user = {
    id: 3, // Business ID from the error
    email: 'test@business.com',
    role: 'business'
  };
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Award points endpoint with actual database operations
app.post('/api/businesses/award-points', mockAuth, async (req, res) => {
  console.log('Award points request received:', req.body);
  
  const { customerId, programId, points, description, source, transactionRef: clientTxRef } = req.body;
  const businessId = req.user.id;
  
  const fullData = {
    customerId: String(customerId),
    programId: String(programId),
    points,
    timestamp: new Date().toISOString()
  };

  try {
    // Validate inputs
    if (!customerId || !programId || !points) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: customerId, programId, points' 
      });
    }
    
    const customerIdStr = String(customerId);
    const programIdStr = String(programId);
    const businessIdStr = String(businessId);
    
    // 1. Get customer name with fallback logic
    let customerName = "Customer #" + customerIdStr;
    let customerFound = false;
    
    // Try multiple tables to find customer
    let customerResult = await sql`
      SELECT id, name FROM users WHERE id = ${customerIdStr} AND user_type = 'customer'
    `;

    if (customerResult.length > 0) {
      customerName = String(customerResult[0].name || customerName);
      customerFound = true;
    } else {
      // Try users table without type restriction
      customerResult = await sql`
        SELECT id, name FROM users WHERE id = ${customerIdStr}
      `;
      
      if (customerResult.length > 0) {
        customerName = String(customerResult[0].name || customerName);
        customerFound = true;
      } else {
        // Try customers table
        const customerFallback = await sql`
          SELECT id, name FROM customers WHERE id = ${customerIdStr}
        `;
        
        if (customerFallback.length > 0) {
          customerName = String(customerFallback[0].name || customerName);
          customerFound = true;
        }
      }
    }
    
    if (!customerFound) {
      return res.status(404).json({ 
        success: false, 
        error: 'Customer not found',
        details: fullData
      });
    }
    
    fullData.customerName = customerName;

    // 2. Verify program ownership
    const programResult = await sql`
      SELECT id, name FROM loyalty_programs 
      WHERE id = ${programIdStr} AND business_id = ${businessIdStr}
    `;

    if (programResult.length === 0) {
      return res.status(403).json({ 
        success: false,
        error: 'Program does not belong to this business',
        code: 'PROGRAM_OWNERSHIP_ERROR'
      });
    }
    
    const programName = programResult[0].name;
    fullData.programName = programName;
    
    // Get business name
    const businessResult = await sql`
      SELECT name FROM users WHERE id = ${businessIdStr}
    `;
    const businessName = businessResult.length ? businessResult[0].name : 'Business';
    fullData.businessName = businessName;

    // 3. Check enrollment status
    const enrollmentCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM customer_programs 
        WHERE customer_id = ${customerIdStr}
        AND program_id = ${programIdStr}
      ) AS is_enrolled
    `;
    
    const isEnrolled = enrollmentCheck[0]?.is_enrolled === true;
    fullData.isEnrolled = isEnrolled;

    // 4. Find or create loyalty card
    let cardId;
    
    if (!isEnrolled) {
      // Not enrolled, create enrollment and card
      try {
        // Create enrollment
        await sql`
          INSERT INTO customer_programs (
            customer_id, program_id, status, created_at, updated_at
          ) VALUES (
            ${customerIdStr}, ${programIdStr}, 'ACTIVE', NOW(), NOW()
          )
        `;
        
        // Create loyalty card
        const cardResult = await sql`
          INSERT INTO loyalty_cards (
            customer_id, program_id, business_id, points, points_balance, card_number, 
            tier, status, created_at, updated_at
          ) VALUES (
            ${customerIdStr}, ${programIdStr}, ${businessIdStr}, 0, 0, 
            ${'GC-' + Math.floor(100000 + Math.random() * 900000) + '-C'}, 
            'STANDARD', 'ACTIVE', NOW(), NOW()
          ) RETURNING id
        `;
        
        cardId = cardResult[0].id;
        fullData.cardId = cardId;
        fullData.cardCreated = true;
        fullData.enrollmentCreated = true;
      } catch (enrollError) {
        console.error('Failed to enroll customer:', enrollError);
        return res.status(500).json({
          success: false,
          error: 'Failed to enroll customer in the program',
          code: 'ENROLLMENT_ERROR',
          details: enrollError.message
        });
      }
    } else {
      // Customer is enrolled, find card
      const cardResult = await sql`
        SELECT id FROM loyalty_cards
        WHERE customer_id = ${customerIdStr}
        AND program_id = ${programIdStr}
      `;
      
      if (!cardResult.length) {
        // Enrolled but no card, create a card
        const cardResult2 = await sql`
          INSERT INTO loyalty_cards (
            customer_id, program_id, business_id, points, points_balance, card_number, 
            tier, status, created_at, updated_at
          ) VALUES (
            ${customerIdStr}, ${programIdStr}, ${businessIdStr}, 0, 0, 
            ${'GC-' + Math.floor(100000 + Math.random() * 900000) + '-C'}, 
            'STANDARD', 'ACTIVE', NOW(), NOW()
          ) RETURNING id
        `;
        
        cardId = cardResult2[0].id;
        fullData.cardId = cardId;
        fullData.cardCreated = true;
      } else {
        cardId = cardResult[0].id;
        fullData.cardId = cardId;
      }
    }

    // 5. Award points
    try {
      // Start transaction
      await sql`BEGIN`;
      
      // Get current points
      const currentCard = await sql`
        SELECT points, points_balance FROM loyalty_cards WHERE id = ${cardId}
      `;
      
      const currentPoints = currentCard.length ? parseInt(currentCard[0].points) || 0 : 0;
      const newPoints = currentPoints + points;
      
      // Update card points
      await sql`
        UPDATE loyalty_cards 
        SET points = ${newPoints}, 
            points_balance = ${newPoints}, 
            updated_at = NOW() 
        WHERE id = ${cardId}
      `;
      
      // Update customer_programs points
      await sql`
        UPDATE customer_programs 
        SET current_points = ${newPoints}, 
            updated_at = NOW() 
        WHERE customer_id = ${customerIdStr} 
        AND program_id = ${programIdStr}
      `;
      
      // Record transaction
      await sql`
        INSERT INTO loyalty_transactions (
          customer_id, business_id, program_id, card_id, type, points, 
          description, source, transaction_date
        ) VALUES (
          ${customerIdStr}, ${businessIdStr}, ${programIdStr}, ${cardId}, 'EARN', 
          ${points}, ${description || 'Points awarded via API'}, ${source || 'API'}, NOW()
        )
      `;
      
      // Create notification
      await sql`
        INSERT INTO customer_notifications (
          customer_id, business_id, type, title, message, requires_action, 
          is_read, created_at
        ) VALUES (
          ${customerIdStr}, ${businessIdStr}, 'POINTS_EARNED', 'Points Earned', 
          ${`You earned ${points} points from ${businessName}`}, 
          FALSE, FALSE, NOW()
        )
      `;
      
      // Commit transaction
      await sql`COMMIT`;
      
      fullData.pointsAwarded = true;
      fullData.newBalance = newPoints;
      
      const response = {
        success: true,
        message: `Successfully awarded ${points} points to customer ${customerName}`,
        data: {
          ...fullData,
          transactionRef: clientTxRef || `tx-${Date.now()}`
        }
      };
      
      console.log('Award points success:', response);
      res.status(200).json(response);
      
    } catch (error) {
      // Rollback on error
      await sql`ROLLBACK`;
      console.error('Error awarding points:', error);
      
      fullData.pointsAwarded = false;
      fullData.error = error.message;
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to award points',
        code: 'POINTS_AWARD_ERROR',
        details: fullData
      });
    }
    
  } catch (error) {
    console.error('Error in award points process:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to award points to customer',
      code: 'POINTS_AWARD_ERROR',
      details: error.message
    });
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/health`);
  console.log(`Award points endpoint: http://localhost:${port}/api/businesses/award-points`);
});

export default app;