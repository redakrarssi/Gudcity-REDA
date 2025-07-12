/**
 * Emergency Server Patch for Award Points
 * 
 * This file patches the Express server to add the direct-award-points endpoint.
 * To use, require this file at the top of your server.js or index.js file.
 */

// Detect if we're running in Node environment
if (typeof window === 'undefined') {
  console.log('🚨 EMERGENCY SERVER PATCH: Adding direct-award-points endpoint');
  
  // This will run when the file is imported in Node.js
  try {
    // Try to get Express app instance
    const getApp = () => {
      // Check common patterns for Express app
      if (global.app && typeof global.app.use === 'function') {
        return global.app;
      }
      
      if (global.expressApp && typeof global.expressApp.use === 'function') {
        return global.expressApp;
      }
      
      // Try to get the Express module
      const express = require('express');
      return express();
    };
    
    // Try to get the app
    const app = getApp();
    
    if (!app) {
      console.error('❌ Could not find Express app instance to patch');
      return;
    }
    
    // Add the direct-award-points endpoint
    app.post('/api/direct/direct-award-points', async (req, res) => {
      console.log('🚨 EMERGENCY direct-award-points endpoint called');
      
      // Check authentication
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        console.warn('⚠️ No authentication token provided');
        return res.status(401).json({
          success: false,
          error: 'Authentication token required'
        });
      }
      
      // Extract body parameters
      const { customerId, programId, points, description, source } = req.body;
      
      if (!customerId || !programId || !points) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      
      try {
        // Load required modules
        const { v4: uuidv4 } = require('uuid');
        
        // Try to get database connection
        const sql = require('./src/utils/db');
        
        if (!sql) {
          console.error('❌ Could not load database module');
          return res.status(500).json({
            success: false,
            error: 'Database connection failed'
          });
        }
        
        // Start database transaction
        const transaction = await sql.begin();
        
        try {
          // Generate IDs
          const cardId = uuidv4();
          const transactionRef = `emergency-${Date.now()}`;
          
          // 1. Check if card exists
          const cardResult = await transaction`
            SELECT id FROM loyalty_cards
            WHERE customer_id = ${customerId}::integer
            AND program_id = ${programId}::integer
            LIMIT 1
          `;
          
          let existingCardId = null;
          if (cardResult.length > 0) {
            existingCardId = cardResult[0].id;
          }
          
          // 2. Get business ID from program
          const programResult = await transaction`
            SELECT business_id FROM loyalty_programs
            WHERE id = ${programId}::integer
            LIMIT 1
          `;
          
          if (programResult.length === 0) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              error: `Program with ID ${programId} not found`
            });
          }
          
          const businessId = programResult[0].business_id;
          
          // 3. Use existing card or create new one
          if (existingCardId) {
            // Update existing card
            await transaction`
              UPDATE loyalty_cards
              SET 
                points = COALESCE(points, 0) + ${points}::integer,
                points_balance = COALESCE(points_balance, 0) + ${points}::integer,
                total_points_earned = COALESCE(total_points_earned, 0) + ${points}::integer,
                updated_at = NOW()
              WHERE id = ${existingCardId}
            `;
            
            cardId = existingCardId;
          } else {
            // Create new card
            await transaction`
              INSERT INTO loyalty_cards (
                id,
                customer_id,
                program_id,
                business_id,
                points,
                points_balance,
                total_points_earned,
                created_at,
                updated_at
              ) VALUES (
                ${cardId},
                ${customerId}::integer,
                ${programId}::integer,
                ${businessId}::integer,
                ${points}::integer,
                ${points}::integer,
                ${points}::integer,
                NOW(),
                NOW()
              )
            `;
          }
          
          // 4. Record the transaction
          await transaction`
            INSERT INTO loyalty_transactions (
              card_id,
              customer_id,
              business_id,
              program_id,
              transaction_type,
              points,
              source,
              description,
              transaction_ref,
              created_at
            ) VALUES (
              ${cardId},
              ${customerId}::integer,
              ${businessId}::integer,
              ${programId}::integer,
              'CREDIT',
              ${points}::integer,
              ${source || 'EMERGENCY_PATCH'},
              ${description || 'Emergency points award'},
              ${transactionRef},
              NOW()
            )
          `;
          
          // 5. Commit transaction
          await transaction.commit();
          
          // 6. Return success
          return res.status(200).json({
            success: true,
            message: `Successfully awarded ${points} points to customer ${customerId}`,
            data: {
              customerId,
              programId,
              points,
              cardId,
              transactionRef
            }
          });
        } catch (dbError) {
          // Roll back transaction on error
          await transaction.rollback();
          throw dbError;
        }
      } catch (error) {
        console.error('❌ Error in emergency direct-award-points endpoint:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Internal server error',
          code: 'EMERGENCY_ENDPOINT_ERROR'
        });
      }
    });
    
    // Add a status endpoint to check if the patch is working
    app.get('/api/direct/status', (req, res) => {
      res.status(200).json({
        status: 'ok',
        message: 'Emergency direct API endpoints are available',
        timestamp: new Date().toISOString()
      });
    });
    
    console.log('✅ EMERGENCY SERVER PATCH: Added direct-award-points endpoint successfully');
  } catch (error) {
    console.error('❌ EMERGENCY SERVER PATCH FAILED:', error);
  }
} 