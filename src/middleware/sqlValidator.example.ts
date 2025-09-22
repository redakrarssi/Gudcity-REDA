/**
 * SQL Validator Middleware - Integration Examples
 * 
 * This file demonstrates how to integrate the SQL validation middleware
 * into your Express application without breaking existing functionality.
 */

import express from 'express';
import { sqlValidatorMiddleware, createValidatedQuery, getPerformanceStats } from './sqlValidator';
import sql from '../utils/db';

const app = express();

// ============================================================================
// BASIC INTEGRATION (Non-Breaking)
// ============================================================================

/**
 * Example 1: Basic middleware integration
 * This adds SQL validation to all routes without changing existing code
 */
app.use(sqlValidatorMiddleware());

// Your existing routes continue to work unchanged
app.get('/api/users', async (req, res) => {
  // This query will now be automatically validated and logged
  const users = await sql`SELECT * FROM users WHERE status = ${'active'}`;
  res.json(users);
});

// ============================================================================
// ENHANCED INTEGRATION (Optional)
// ============================================================================

/**
 * Example 2: Using the validated query wrapper
 * This provides enhanced validation for critical queries
 */
const validatedSql = createValidatedQuery(sql);

app.get('/api/customers/:id', async (req, res) => {
  try {
    // This query gets enhanced validation and logging
    const customer = await validatedSql`
      SELECT * FROM customers 
      WHERE id = ${req.params.id} 
      AND business_id = ${req.query.businessId}
    `;
    
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Example 3: Performance monitoring endpoint
 * This allows you to monitor query performance
 */
app.get('/api/admin/query-stats', (req, res) => {
  const stats = getPerformanceStats();
  res.json({
    performance: {
      totalQueries: stats.totalQueries,
      successRate: stats.totalQueries > 0 ? (stats.successfulQueries / stats.totalQueries) * 100 : 0,
      averageDuration: stats.averageDuration,
      slowestQuery: stats.slowestQuery,
      fastestQuery: stats.fastestQuery
    },
    recentQueries: stats.recentQueries.map(q => ({
      id: q.queryId,
      type: q.queryType,
      duration: q.duration,
      success: q.success,
      timestamp: new Date(q.startTime).toISOString()
    }))
  });
});

// ============================================================================
// CUSTOM VALIDATION
// ============================================================================

/**
 * Example 4: Custom parameter validation
 * This shows how to add custom validation logic
 */
app.post('/api/customers', async (req, res) => {
  try {
    const { name, email, businessId } = req.body;
    
    // Custom validation using the middleware
    if (req.sqlValidation) {
      const validation = req.sqlValidation.validateParameters([name, email, businessId]);
      
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Invalid parameters', 
          details: validation.errors 
        });
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Parameter warnings:', validation.warnings);
      }
    }
    
    // Proceed with validated parameters
    const result = await sql`
      INSERT INTO customers (name, email, business_id, created_at)
      VALUES (${name}, ${email}, ${businessId}, NOW())
      RETURNING *
    `;
    
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// ============================================================================
// SECURITY ENHANCEMENT
// ============================================================================

/**
 * Example 5: Enhanced security for user input
 * This demonstrates how the middleware protects against SQL injection
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q: searchTerm, businessId } = req.query;
    
    // The middleware automatically validates and sanitizes these parameters
    const results = await sql`
      SELECT * FROM customers 
      WHERE name ILIKE ${`%${searchTerm}%`} 
      AND business_id = ${businessId}
      LIMIT 50
    `;
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Example 6: Audit logging for sensitive operations
 * This shows how queries are automatically logged for audit trails
 */
app.post('/api/points/award', async (req, res) => {
  try {
    const { cardId, points, description } = req.body;
    
    // This critical operation will be logged with full audit trail
    const result = await validatedSql`
      UPDATE loyalty_cards 
      SET points = points + ${points},
          updated_at = NOW()
      WHERE id = ${cardId}
      RETURNING *
    `;
    
    // Additional audit logging
    if (req.sqlValidation) {
      const queryId = req.sqlValidation.generateQueryId();
      console.log(`Points awarded - Query ID: ${queryId}, Card: ${cardId}, Points: ${points}`);
    }
    
    res.json({ success: true, card: result[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to award points' });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Example 7: Error handling with validation
 * This shows how validation errors are handled gracefully
 */
app.get('/api/customers/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    // Parameters are automatically validated
    const transactions = await validatedSql`
      SELECT * FROM loyalty_transactions 
      WHERE customer_id = ${id}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit as string)}
      OFFSET ${parseInt(offset as string)}
    `;
    
    res.json(transactions);
  } catch (error) {
    // Validation errors are caught and handled
    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({ error: 'Invalid parameters', details: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }
});

// ============================================================================
// TESTING INTEGRATION
// ============================================================================

/**
 * Example 8: Testing with the middleware
 * This shows how to test your application with the middleware enabled
 */
export function createTestApp() {
  const testApp = express();
  
  // Add middleware for testing
  testApp.use(sqlValidatorMiddleware());
  
  // Test route
  testApp.get('/test', async (req, res) => {
    const result = await sql`SELECT 1 as test`;
    res.json(result);
  });
  
  return testApp;
}

// ============================================================================
// MIGRATION GUIDE
// ============================================================================

/**
 * MIGRATION STEPS:
 * 
 * 1. Add the middleware to your app:
 *    app.use(sqlValidatorMiddleware());
 * 
 * 2. Optionally replace critical queries with validatedSql:
 *    const validatedSql = createValidatedQuery(sql);
 * 
 * 3. Add performance monitoring endpoint:
 *    app.get('/admin/query-stats', (req, res) => {
 *      res.json(getPerformanceStats());
 *    });
 * 
 * 4. Test thoroughly to ensure no breaking changes
 * 
 * 5. Monitor logs for any validation warnings/errors
 * 
 * 6. Gradually migrate more queries to use validatedSql for enhanced security
 */

export default app;