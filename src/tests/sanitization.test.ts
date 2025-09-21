/**
 * Sanitization Test Suite
 * 
 * This test suite verifies the comprehensive input sanitization
 * implementation, ensuring all security measures work correctly.
 * 
 * Following reda.md rules:
 * - Safe to modify: This is a new test file for security verification
 * - No core business logic modification
 * - Enhances existing security without disrupting functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  InputSanitizer, 
  SANITIZATION_CONFIGS,
  sanitizeText,
  sanitizeHtml,
  sanitizeForDisplay,
  sanitizeForDatabase,
  sanitizeUrl,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeJson,
  validateInput,
  sanitizeProps,
  sanitizeFormData
} from '../utils/sanitizer';
import { NonceManager, generateScriptNonce, generateStyleNonce, validateScriptNonce, validateStyleNonce } from '../utils/nonceManager';

describe('Input Sanitization', () => {
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    sanitizer = new InputSanitizer(SANITIZATION_CONFIGS.moderate);
  });

  describe('Text Sanitization', () => {
    it('should sanitize basic text input', () => {
      const input = 'Hello World';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should remove HTML tags from text', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('Hello');
    });

    it('should escape HTML entities', () => {
      const input = '<>&"\'';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('&lt;&gt;&amp;&quot;&#x27;');
    });

    it('should enforce length limits', () => {
      const input = 'A'.repeat(10000);
      const result = sanitizer.sanitizeText(input);
      expect(result.length).toBeLessThanOrEqual(5000);
    });

    it('should handle null and undefined input', () => {
      expect(sanitizer.sanitizeText('')).toBe('');
      expect(sanitizer.sanitizeText(null as any)).toBe('');
      expect(sanitizer.sanitizeText(undefined as any)).toBe('');
    });
  });

  describe('HTML Sanitization', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizer.sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove dangerous HTML tags', () => {
      const input = '<script>alert("xss")</script><p>Hello</p>';
      const result = sanitizer.sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<p onclick="alert(\'xss\')">Hello</p>';
      const result = sanitizer.sanitizeHtml(input);
      expect(result).not.toContain('onclick');
    });

    it('should preserve safe attributes', () => {
      const input = '<p class="safe">Hello</p>';
      const result = sanitizer.sanitizeHtml(input);
      expect(result).toContain('class="safe"');
    });
  });

  describe('URL Sanitization', () => {
    it('should sanitize valid URLs', () => {
      const input = 'https://example.com';
      const result = sanitizer.sanitizeUrl(input);
      expect(result).toBe('https://example.com');
    });

    it('should reject dangerous protocols', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizer.sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should handle invalid URLs', () => {
      const input = 'not-a-url';
      const result = sanitizer.sanitizeUrl(input);
      expect(result).toBe('');
    });
  });

  describe('Email Sanitization', () => {
    it('should sanitize valid emails', () => {
      const input = 'user@example.com';
      const result = sanitizer.sanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });

    it('should reject invalid emails', () => {
      const input = 'not-an-email';
      const result = sanitizer.sanitizeEmail(input);
      expect(result).toBe('');
    });

    it('should normalize email case', () => {
      const input = 'USER@EXAMPLE.COM';
      const result = sanitizer.sanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });
  });

  describe('Number Sanitization', () => {
    it('should sanitize valid numbers', () => {
      const input = '123.45';
      const result = sanitizer.sanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    it('should handle number ranges', () => {
      const input = '50';
      const result = sanitizer.sanitizeNumber(input, 0, 100);
      expect(result).toBe(50);
    });

    it('should reject out-of-range numbers', () => {
      const input = '150';
      const result = sanitizer.sanitizeNumber(input, 0, 100);
      expect(result).toBeNull();
    });

    it('should reject invalid numbers', () => {
      const input = 'not-a-number';
      const result = sanitizer.sanitizeNumber(input);
      expect(result).toBeNull();
    });
  });

  describe('JSON Sanitization', () => {
    it('should sanitize valid JSON', () => {
      const input = '{"name": "John", "age": 30}';
      const result = sanitizer.sanitizeJson(input);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should reject invalid JSON', () => {
      const input = 'not-json';
      const result = sanitizer.sanitizeJson(input);
      expect(result).toBeNull();
    });

    it('should sanitize nested objects', () => {
      const input = '{"name": "<script>alert(\'xss\')</script>", "age": 30}';
      const result = sanitizer.sanitizeJson(input);
      expect(result.name).not.toContain('<script>');
    });
  });

  describe('Threat Detection', () => {
    it('should detect script injection', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizer.validateInput(input);
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain('Script injection detected');
    });

    it('should detect SQL injection', () => {
      const input = "'; DROP TABLE users; --";
      const result = sanitizer.validateInput(input);
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain('Potential SQL injection detected');
    });

    it('should detect XSS patterns', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizer.validateInput(input);
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain('XSS pattern detected');
    });

    it('should detect command injection', () => {
      const input = 'test; rm -rf /';
      const result = sanitizer.validateInput(input);
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain('Command injection pattern detected');
    });

    it('should detect path traversal', () => {
      const input = '../../../etc/passwd';
      const result = sanitizer.validateInput(input);
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain('Path traversal pattern detected');
    });
  });

  describe('Convenience Functions', () => {
    it('should work with convenience functions', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeText(input);
      expect(result).toBe('Hello');
    });

    it('should sanitize props', () => {
      const props = { name: '<script>alert("xss")</script>', age: 30 };
      const result = sanitizeProps(props);
      expect(result.name).not.toContain('<script>');
      expect(result.age).toBe(30);
    });

    it('should sanitize form data', () => {
      const formData = { username: '<script>alert("xss")</script>', password: 'secret' };
      const result = sanitizeFormData(formData);
      expect(result.username).not.toContain('<script>');
      expect(result.password).toBe('secret');
    });
  });
});

describe('Nonce Management', () => {
  let nonceManager: NonceManager;

  beforeEach(() => {
    nonceManager = new NonceManager({ expiration: 1000, maxNonces: 10 });
  });

  afterEach(() => {
    nonceManager.destroy();
  });

  describe('Nonce Generation', () => {
    it('should generate unique nonces', () => {
      const nonce1 = nonceManager.generateNonce('script');
      const nonce2 = nonceManager.generateNonce('script');
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate different nonces for different types', () => {
      const scriptNonce = nonceManager.generateNonce('script');
      const styleNonce = nonceManager.generateNonce('style');
      expect(scriptNonce).not.toBe(styleNonce);
    });

    it('should generate nonces with correct format', () => {
      const nonce = nonceManager.generateNonce('script');
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });
  });

  describe('Nonce Validation', () => {
    it('should validate correct nonces', () => {
      const nonce = nonceManager.generateNonce('script');
      const isValid = nonceManager.validateNonce(nonce, 'script');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect nonces', () => {
      const nonce = nonceManager.generateNonce('script');
      const isValid = nonceManager.validateNonce(nonce, 'style');
      expect(isValid).toBe(false);
    });

    it('should reject non-existent nonces', () => {
      const isValid = nonceManager.validateNonce('fake-nonce', 'script');
      expect(isValid).toBe(false);
    });
  });

  describe('Nonce Expiration', () => {
    it('should expire nonces after timeout', (done) => {
      const nonce = nonceManager.generateNonce('script');
      
      setTimeout(() => {
        const isValid = nonceManager.validateNonce(nonce, 'script');
        expect(isValid).toBe(false);
        done();
      }, 1100);
    });
  });

  describe('Nonce Cleanup', () => {
    it('should cleanup expired nonces', () => {
      const nonce = nonceManager.generateNonce('script');
      nonceManager.cleanup();
      
      // Force expiration
      const entry = nonceManager['nonces'].get(nonce);
      if (entry) {
        entry.expiresAt = Date.now() - 1000;
      }
      
      nonceManager.cleanup();
      const isValid = nonceManager.validateNonce(nonce, 'script');
      expect(isValid).toBe(false);
    });
  });

  describe('Nonce Statistics', () => {
    it('should provide accurate statistics', () => {
      nonceManager.generateNonce('script');
      nonceManager.generateNonce('style');
      
      const stats = nonceManager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byType.script).toBe(1);
      expect(stats.byType.style).toBe(1);
    });
  });

  describe('Convenience Functions', () => {
    it('should work with convenience functions', () => {
      const scriptNonce = generateScriptNonce();
      const styleNonce = generateStyleNonce();
      
      expect(validateScriptNonce(scriptNonce)).toBe(true);
      expect(validateStyleNonce(styleNonce)).toBe(true);
    });
  });
});

describe('Security Integration', () => {
  it('should work with React components', () => {
    // This would be tested with actual React component rendering
    // For now, we just verify the functions are available
    expect(typeof sanitizeText).toBe('function');
    expect(typeof sanitizeHtml).toBe('function');
    expect(typeof sanitizeForDisplay).toBe('function');
  });

  it('should provide comprehensive security coverage', () => {
    const threats = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      "'; DROP TABLE users; --",
      '../../../etc/passwd',
      'test; rm -rf /'
    ];

    threats.forEach(threat => {
      const result = validateInput(threat);
      expect(result.isValid).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
    });
  });
});