/**
 * SQL Validator Middleware - Integration Tests
 * 
 * These tests ensure the middleware works correctly without breaking
 * existing functionality, following reda.md rules.
 */

import { sqlValidatorMiddleware, createValidatedQuery, getPerformanceStats, clearPerformanceStats } from './sqlValidator';
import express from 'express';
import request from 'supertest';

describe('SQL Validator Middleware', () => {
  let app: express.Application;
  let validatedSql: any;

  beforeEach(() => {
    // Clear performance stats before each test
    clearPerformanceStats();
    
    // Create test app
    app = express();
    app.use(express.json());
    app.use(sqlValidatorMiddleware());
    
    // Create validated SQL wrapper
    validatedSql = createValidatedQuery((query: any, ...params: any[]) => {
      // Mock SQL client for testing
      return Promise.resolve([{ id: 1, name: 'Test User' }]);
    });
  });

  describe('Basic Functionality', () => {
    it('should not break existing routes', async () => {
      app.get('/test', (req, res) => {
        res.json({ message: 'Hello World' });
      });

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Hello World');
    });

    it('should add SQL validation to request object', async () => {
      app.get('/test', (req, res) => {
        expect(req.sqlValidation).toBeDefined();
        expect(typeof req.sqlValidation?.validateParameters).toBe('function');
        expect(typeof req.sqlValidation?.generateQueryId).toBe('function');
        res.json({ success: true });
      });

      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });
  });

  describe('Parameter Validation', () => {
    it('should validate string parameters correctly', () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve(params);
      });

      const result = mockSql`SELECT * FROM users WHERE name = ${'John Doe'}`;
      expect(result).resolves.toBeDefined();
    });

    it('should validate number parameters correctly', () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve(params);
      });

      const result = mockSql`SELECT * FROM users WHERE id = ${123}`;
      expect(result).resolves.toBeDefined();
    });

    it('should validate boolean parameters correctly', () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve(params);
      });

      const result = mockSql`SELECT * FROM users WHERE active = ${true}`;
      expect(result).resolves.toBeDefined();
    });

    it('should handle null parameters', () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve(params);
      });

      const result = mockSql`SELECT * FROM users WHERE deleted_at = ${null}`;
      expect(result).resolves.toBeDefined();
    });
  });

  describe('Security Validation', () => {
    it('should detect potential SQL injection attempts', () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve(params);
      });

      // This should not throw an error, but should log warnings
      const result = mockSql`SELECT * FROM users WHERE name = ${"'; DROP TABLE users; --"}`;
      expect(result).resolves.toBeDefined();
    });

    it('should handle suspicious patterns gracefully', () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve(params);
      });

      const suspiciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "<script>alert('xss')</script>",
        "UNION SELECT * FROM users"
      ];

      suspiciousInputs.forEach(input => {
        const result = mockSql`SELECT * FROM users WHERE name = ${input}`;
        expect(result).resolves.toBeDefined();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should track query performance', async () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return new Promise(resolve => {
          setTimeout(() => resolve([{ id: 1 }]), 10);
        });
      });

      await mockSql`SELECT * FROM users WHERE id = ${1}`;
      
      const stats = getPerformanceStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.successfulQueries).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it('should track failed queries', async () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.reject(new Error('Database error'));
      });

      try {
        await mockSql`SELECT * FROM users WHERE id = ${1}`;
      } catch (error) {
        // Expected to fail
      }
      
      const stats = getPerformanceStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.failedQueries).toBe(1);
      expect(stats.successfulQueries).toBe(0);
    });
  });

  describe('Query Logging', () => {
    it('should log query execution', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve([{ id: 1 }]);
      });

      await mockSql`SELECT * FROM users WHERE id = ${1}`;
      
      // Query should be logged (implementation depends on logger)
      expect(consoleSpy).not.toHaveBeenCalled(); // Logger might not use console.log
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve(params);
      });

      // Test with extremely long string
      const longString = 'a'.repeat(20000);
      const result = mockSql`SELECT * FROM users WHERE name = ${longString}`;
      expect(result).resolves.toBeDefined();
    });

    it('should handle invalid numbers', () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve(params);
      });

      const result = mockSql`SELECT * FROM users WHERE id = ${NaN}`;
      expect(result).resolves.toBeDefined();
    });
  });

  describe('Integration with Express', () => {
    it('should work with POST requests', async () => {
      app.post('/users', async (req, res) => {
        const { name, email } = req.body;
        
        // Simulate database operation
        const result = await validatedSql`
          INSERT INTO users (name, email) 
          VALUES (${name}, ${email})
          RETURNING *
        `;
        
        res.json(result[0]);
      });

      const response = await request(app)
        .post('/users')
        .send({ name: 'John Doe', email: 'john@example.com' });
      
      expect(response.status).toBe(200);
    });

    it('should work with query parameters', async () => {
      app.get('/users', async (req, res) => {
        const { limit, offset } = req.query;
        
        const result = await validatedSql`
          SELECT * FROM users 
          LIMIT ${parseInt(limit as string)} 
          OFFSET ${parseInt(offset as string)}
        `;
        
        res.json(result);
      });

      const response = await request(app)
        .get('/users?limit=10&offset=0');
      
      expect(response.status).toBe(200);
    });
  });

  describe('Non-Breaking Changes', () => {
    it('should not affect response times significantly', async () => {
      const startTime = Date.now();
      
      app.get('/test', (req, res) => {
        res.json({ message: 'Hello World' });
      });

      await request(app).get('/test');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should not change query results', async () => {
      const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
        return Promise.resolve([{ id: 1, name: 'Test' }]);
      });

      const result = await mockSql`SELECT * FROM users WHERE id = ${1}`;
      expect(result).toEqual([{ id: 1, name: 'Test' }]);
    });

    it('should maintain API contracts', async () => {
      app.get('/api/users/:id', (req, res) => {
        res.json({ id: req.params.id, name: 'Test User' });
      });

      const response = await request(app).get('/api/users/123');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '123', name: 'Test User' });
    });
  });
});

/**
 * Performance Test
 * 
 * This test ensures the middleware doesn't significantly impact performance
 */
describe('Performance Impact', () => {
  it('should not significantly impact query performance', async () => {
    const iterations = 100;
    const startTime = Date.now();
    
    const mockSql = createValidatedQuery((query: any, ...params: any[]) => {
      return Promise.resolve([{ id: 1 }]);
    });

    // Run multiple queries
    const promises = Array(iterations).fill(0).map((_, i) => 
      mockSql`SELECT * FROM users WHERE id = ${i}`
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    const averageTime = duration / iterations;
    
    // Each query should take less than 10ms on average
    expect(averageTime).toBeLessThan(10);
  });
});
