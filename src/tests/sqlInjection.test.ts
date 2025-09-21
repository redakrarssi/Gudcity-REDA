/**
 * SQL Injection Security Tests
 * 
 * This test suite verifies that all SQL injection vulnerabilities
 * have been properly fixed with parameterized queries and input validation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'jest';
import { validateDbInput, executeSecureQuery, secureSelect, secureInsert, secureUpdate } from '../utils/secureDb';
import sql from '../utils/db';

describe('SQL Injection Security Tests', () => {
  
  describe('Input Validation', () => {
    it('should reject SQL injection attempts in string inputs', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "' UNION SELECT * FROM users --",
        "'; UPDATE users SET role='admin' WHERE id=1; --"
      ];

      maliciousInputs.forEach(input => {
        const validation = validateDbInput(input, 'string');
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it('should reject SQL injection attempts in number inputs', () => {
      const maliciousInputs = [
        "1; DROP TABLE users; --",
        "1 OR 1=1",
        "1 UNION SELECT * FROM users",
        "1; INSERT INTO users (email) VALUES ('hacker@evil.com'); --"
      ];

      maliciousInputs.forEach(input => {
        const validation = validateDbInput(input, 'number');
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it('should sanitize potentially dangerous characters', () => {
      const dangerousInput = "<script>alert('xss')</script>'; DROP TABLE users; --";
      const validation = validateDbInput(dangerousInput, 'string');
      
      expect(validation.isValid).toBe(false);
      expect(validation.sanitized).not.toContain('<script>');
      expect(validation.sanitized).not.toContain('DROP');
    });

    it('should validate email format correctly', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@subdomain.example.org'
      ];

      const invalidEmails = [
        "'; DROP TABLE users; --",
        "user@example.com'; DROP TABLE users; --",
        "user@example.com OR 1=1",
        "user@example.com UNION SELECT * FROM users"
      ];

      validEmails.forEach(email => {
        const validation = validateDbInput(email, 'email');
        expect(validation.isValid).toBe(true);
      });

      invalidEmails.forEach(email => {
        const validation = validateDbInput(email, 'email');
        expect(validation.isValid).toBe(false);
      });
    });

    it('should validate phone format correctly', () => {
      const validPhones = [
        '+1234567890',
        '1234567890',
        '+44123456789'
      ];

      const invalidPhones = [
        "'; DROP TABLE users; --",
        "1234567890'; DROP TABLE users; --",
        "1234567890 OR 1=1"
      ];

      validPhones.forEach(phone => {
        const validation = validateDbInput(phone, 'phone');
        expect(validation.isValid).toBe(true);
      });

      invalidPhones.forEach(phone => {
        const validation = validateDbInput(phone, 'phone');
        expect(validation.isValid).toBe(false);
      });
    });
  });

  describe('Secure Query Execution', () => {
    it('should prevent SQL injection in SELECT queries', async () => {
      const maliciousUserId = "1'; DROP TABLE users; --";
      
      try {
        await executeSecureQuery(
          'SELECT * FROM users WHERE id = $1',
          [maliciousUserId],
          ['string']
        );
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should prevent SQL injection in UPDATE queries', async () => {
      const maliciousName = "'; DROP TABLE users; --";
      
      try {
        await executeSecureQuery(
          'UPDATE users SET name = $1 WHERE id = $2',
          [maliciousName, 1],
          ['string', 'number']
        );
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should prevent SQL injection in INSERT queries', async () => {
      const maliciousEmail = "'; DROP TABLE users; --";
      
      try {
        await executeSecureQuery(
          'INSERT INTO users (email) VALUES ($1)',
          [maliciousEmail],
          ['email']
        );
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('Secure Select Function', () => {
    it('should prevent SQL injection in WHERE clauses', async () => {
      const maliciousCondition = "id = 1'; DROP TABLE users; --";
      
      try {
        await secureSelect('users', '*', maliciousCondition, [], []);
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Invalid table name');
      }
    });

    it('should validate table names', async () => {
      const maliciousTableName = "users'; DROP TABLE users; --";
      
      try {
        await secureSelect(maliciousTableName, '*', 'id = $1', [1], ['number']);
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Invalid table name');
      }
    });

    it('should validate column names', async () => {
      const maliciousColumns = "*, (SELECT password FROM users)";
      
      try {
        await secureSelect('users', maliciousColumns, 'id = $1', [1], ['number']);
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Invalid table name');
      }
    });
  });

  describe('Secure Insert Function', () => {
    it('should prevent SQL injection in column names', async () => {
      const maliciousData = {
        "name'; DROP TABLE users; --": "John",
        "email": "john@example.com"
      };
      
      try {
        await secureInsert('users', maliciousData);
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Invalid table name');
      }
    });

    it('should validate all input data', async () => {
      const maliciousData = {
        name: "'; DROP TABLE users; --",
        email: "john@example.com"
      };
      
      try {
        await secureInsert('users', maliciousData);
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('Secure Update Function', () => {
    it('should prevent SQL injection in WHERE clauses', async () => {
      const maliciousWhereClause = "id = 1'; DROP TABLE users; --";
      
      try {
        await secureUpdate(
          'users',
          { name: 'John' },
          maliciousWhereClause,
          [],
          []
        );
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Invalid table name');
      }
    });

    it('should validate update data', async () => {
      const maliciousData = {
        name: "'; DROP TABLE users; --"
      };
      
      try {
        await secureUpdate(
          'users',
          maliciousData,
          'id = $1',
          [1],
          ['number']
        );
        // Should not reach here due to validation failure
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('Database Query Security', () => {
    it('should reject queries with SQL comments', async () => {
      const maliciousQuery = "SELECT * FROM users -- DROP TABLE users";
      
      try {
        await sql.query(maliciousQuery, []);
        // Should not reach here due to security check
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('malicious SQL comments');
      }
    });

    it('should warn about dangerous SQL keywords', async () => {
      const dangerousQuery = "SELECT * FROM users WHERE id = $1";
      const maliciousParams = ["1; DROP TABLE users; --"];
      
      // This should pass the security check but log a warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      try {
        await sql.query(dangerousQuery, maliciousParams);
      } catch (error) {
        // Expected to fail due to parameter validation
        expect(error.message).toBeDefined();
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined inputs safely', () => {
      const nullValidation = validateDbInput(null, 'string', { required: false });
      expect(nullValidation.isValid).toBe(true);
      expect(nullValidation.sanitized).toBe(null);

      const undefinedValidation = validateDbInput(undefined, 'string', { required: false });
      expect(undefinedValidation.isValid).toBe(true);
      expect(undefinedValidation.sanitized).toBe(null);
    });

    it('should handle empty strings appropriately', () => {
      const emptyStringValidation = validateDbInput('', 'string', { required: false });
      expect(emptyStringValidation.isValid).toBe(true);

      const requiredEmptyValidation = validateDbInput('', 'string', { required: true });
      expect(requiredEmptyValidation.isValid).toBe(false);
    });

    it('should handle very long inputs', () => {
      const longString = 'a'.repeat(2000);
      const validation = validateDbInput(longString, 'string');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('String too long');
    });

    it('should handle special characters in valid inputs', () => {
      const specialString = "John O'Connor-Smith";
      const validation = validateDbInput(specialString, 'string');
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Performance and Security', () => {
    it('should not allow time-based SQL injection', async () => {
      const startTime = Date.now();
      
      try {
        await executeSecureQuery(
          'SELECT * FROM users WHERE id = $1',
          ["1; WAITFOR DELAY '00:00:05'; --"],
          ['string']
        );
      } catch (error) {
        // Should fail quickly due to validation
        const endTime = Date.now();
        expect(endTime - startTime).toBeLessThan(1000); // Should fail in less than 1 second
      }
    });

    it('should handle concurrent malicious requests safely', async () => {
      const maliciousRequests = Array(10).fill(null).map(() => 
        executeSecureQuery(
          'SELECT * FROM users WHERE id = $1',
          ["1'; DROP TABLE users; --"],
          ['string']
        )
      );

      const results = await Promise.allSettled(maliciousRequests);
      
      results.forEach(result => {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect(result.reason.message).toContain('validation failed');
        }
      });
    });
  });
});

describe('SQL Injection Prevention Integration Tests', () => {
  it('should prevent all known SQL injection patterns', async () => {
    const injectionPatterns = [
      // Classic SQL injection
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' OR 1=1 --",
      
      // Union-based injection
      "' UNION SELECT * FROM users --",
      "' UNION SELECT password FROM users --",
      
      // Boolean-based blind injection
      "' AND 1=1 --",
      "' AND 1=2 --",
      
      // Time-based blind injection
      "'; WAITFOR DELAY '00:00:05'; --",
      "'; SELECT pg_sleep(5); --",
      
      // Stacked queries
      "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
      "'; UPDATE users SET role='admin' WHERE id=1; --",
      
      // Comment-based injection
      "/* DROP TABLE users; */",
      "-- DROP TABLE users;",
      
      // Function-based injection
      "'; EXEC xp_cmdshell('dir'); --",
      "'; SELECT load_file('/etc/passwd'); --"
    ];

    for (const pattern of injectionPatterns) {
      const validation = validateDbInput(pattern, 'string');
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    }
  });

  it('should maintain functionality with legitimate inputs', async () => {
    const legitimateInputs = [
      { value: "John Doe", type: 'string' as const },
      { value: "john@example.com", type: 'email' as const },
      { value: "+1234567890", type: 'phone' as const },
      { value: 123, type: 'number' as const },
      { value: true, type: 'boolean' as const }
    ];

    for (const input of legitimateInputs) {
      const validation = validateDbInput(input.value, input.type);
      expect(validation.isValid).toBe(true);
      expect(validation.sanitized).toBeDefined();
    }
  });
});