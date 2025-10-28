/**
 * Comprehensive Input Sanitization Utility
 * 
 * This module provides robust input sanitization to prevent XSS attacks,
 * SQL injection, and other security vulnerabilities. It follows the
 * principle of "sanitize early, sanitize often" and provides multiple
 * levels of protection.
 * 
 * Following reda.md rules:
 * - Safe to modify: This is a new utility file for security enhancement
 * - No core business logic modification
 * - Enhances existing security without disrupting functionality
 */

import DOMPurify from 'dompurify';

// Security configuration for different sanitization levels
export interface SanitizationConfig {
  level: 'strict' | 'moderate' | 'permissive';
  allowHtml: boolean;
  allowScripts: boolean;
  allowStyles: boolean;
  allowDataAttributes: boolean;
  maxLength: number;
  allowedTags: string[];
  allowedAttributes: string[];
}

// Predefined sanitization configurations
export const SANITIZATION_CONFIGS: Record<string, SanitizationConfig> = {
  // Strict: Maximum security, minimal HTML allowed
  strict: {
    level: 'strict',
    allowHtml: false,
    allowScripts: false,
    allowStyles: false,
    allowDataAttributes: false,
    maxLength: 1000,
    allowedTags: [],
    allowedAttributes: []
  },
  
  // Moderate: Balanced security with some HTML formatting
  moderate: {
    level: 'moderate',
    allowHtml: true,
    allowScripts: false,
    allowStyles: false,
    allowDataAttributes: false,
    maxLength: 5000,
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i'],
    allowedAttributes: ['class']
  },
  
  // Permissive: More HTML allowed for rich content (use with caution)
  permissive: {
    level: 'permissive',
    allowHtml: true,
    allowScripts: false,
    allowStyles: true,
    allowDataAttributes: true,
    maxLength: 10000,
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img'],
    allowedAttributes: ['class', 'id', 'href', 'src', 'alt', 'title', 'style']
  }
};

/**
 * Main sanitization class
 */
export class InputSanitizer {
  private config: SanitizationConfig;
  
  constructor(config: SanitizationConfig = SANITIZATION_CONFIGS.moderate) {
    this.config = config;
  }
  
  /**
   * Sanitize text input - removes all HTML and potentially dangerous characters
   */
  sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Enforce length limit
    if (sanitized.length > this.config.maxLength) {
      sanitized = sanitized.substring(0, this.config.maxLength);
    }
    
    // Remove HTML tags if not allowed
    if (!this.config.allowHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    // Escape remaining HTML entities
    sanitized = this.escapeHtmlEntities(sanitized);
    
    return sanitized;
  }
  
  /**
   * Sanitize HTML input - allows safe HTML while removing dangerous elements
   */
  sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Use DOMPurify for HTML sanitization
    const purifyConfig: DOMPurify.Config = {
      ALLOWED_TAGS: this.config.allowedTags,
      ALLOWED_ATTR: this.config.allowedAttributes,
      ALLOW_DATA_ATTR: this.config.allowDataAttributes,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false
    };
    
    // Disable scripts completely
    purifyConfig.FORBID_TAGS = ['script', 'object', 'embed', 'iframe', 'form'];
    purifyConfig.FORBID_ATTR = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'];
    
    let sanitized = DOMPurify.sanitize(input, purifyConfig);
    
    // Additional length check after sanitization
    if (sanitized.length > this.config.maxLength) {
      sanitized = sanitized.substring(0, this.config.maxLength);
    }
    
    return sanitized;
  }
  
  /**
   * Sanitize user input for display - combines text and HTML sanitization
   */
  sanitizeForDisplay(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // First sanitize as HTML if allowed
    if (this.config.allowHtml) {
      return this.sanitizeHtml(input);
    } else {
      return this.sanitizeText(input);
    }
  }
  
  /**
   * Sanitize input for database storage - removes all HTML and special characters
   */
  sanitizeForDatabase(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Remove all HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, '');
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim and limit length
    sanitized = sanitized.trim().substring(0, this.config.maxLength);
    
    return sanitized;
  }
  
  /**
   * Sanitize URL input - validates and sanitizes URLs
   */
  sanitizeUrl(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    try {
      const url = new URL(input);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      
      // Remove potentially dangerous parameters
      const sanitizedUrl = new URL(url.origin + url.pathname);
      
      // Only allow safe query parameters
      const safeParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'];
      safeParams.forEach(param => {
        if (url.searchParams.has(param)) {
          sanitizedUrl.searchParams.set(param, url.searchParams.get(param) || '');
        }
      });
      
      return sanitizedUrl.toString();
    } catch {
      return '';
    }
  }
  
  /**
   * Sanitize email input - validates email format
   */
  sanitizeEmail(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Basic email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    const sanitized = input.trim().toLowerCase();
    
    if (emailRegex.test(sanitized) && sanitized.length <= 254) {
      return sanitized;
    }
    
    return '';
  }
  
  /**
   * Sanitize numeric input - ensures input is a valid number
   */
  sanitizeNumber(input: string | number, min?: number, max?: number): number | null {
    if (typeof input === 'number') {
      if (isNaN(input) || !isFinite(input)) {
        return null;
      }
      if (min !== undefined && input < min) return null;
      if (max !== undefined && input > max) return null;
      return input;
    }
    
    if (typeof input !== 'string') {
      return null;
    }
    
    const num = parseFloat(input);
    
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }
    
    if (min !== undefined && num < min) return null;
    if (max !== undefined && num > max) return null;
    
    return num;
  }
  
  /**
   * Sanitize JSON input - validates and sanitizes JSON data
   */
  sanitizeJson(input: string): any {
    if (!input || typeof input !== 'string') {
      return null;
    }
    
    try {
      const parsed = JSON.parse(input);
      
      // Recursively sanitize object values
      return this.sanitizeObject(parsed);
    } catch {
      return null;
    }
  }
  
  /**
   * Recursively sanitize object properties
   */
  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize both key and value
        const sanitizedKey = this.sanitizeText(key);
        const sanitizedValue = this.sanitizeObject(value);
        sanitized[sanitizedKey] = sanitizedValue;
      }
      return sanitized;
    }
    
    return obj;
  }
  
  /**
   * Escape HTML entities
   */
  private escapeHtmlEntities(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  /**
   * Validate input against common attack patterns
   */
  validateInput(input: string): { isValid: boolean; threats: string[] } {
    const threats: string[] = [];
    
    if (!input || typeof input !== 'string') {
      return { isValid: true, threats: [] };
    }
    
    // Check for script injection
    if (/<script[^>]*>.*?<\/script>/i.test(input)) {
      threats.push('Script injection detected');
    }
    
    // Check for SQL injection patterns
    if (/(union|select|insert|update|delete|drop|create|alter|exec|execute)/i.test(input)) {
      threats.push('Potential SQL injection detected');
    }
    
    // Check for XSS patterns
    if (/(javascript:|vbscript:|data:|on\w+\s*=)/i.test(input)) {
      threats.push('XSS pattern detected');
    }
    
    // Check for command injection
    if (/[;&|`$(){}[\]]/.test(input)) {
      threats.push('Command injection pattern detected');
    }
    
    // Check for path traversal
    if (/\.\.\/|\.\.\\|\.\.%2f|\.\.%5c/i.test(input)) {
      threats.push('Path traversal pattern detected');
    }
    
    return {
      isValid: threats.length === 0,
      threats
    };
  }
  
  /**
   * Get sanitization statistics
   */
  getSanitizationStats(): {
    config: SanitizationConfig;
    maxLength: number;
    allowedTags: string[];
    allowedAttributes: string[];
  } {
    return {
      config: this.config,
      maxLength: this.config.maxLength,
      allowedTags: this.config.allowedTags,
      allowedAttributes: this.config.allowedAttributes
    };
  }
}

// Pre-configured sanitizer instances
export const strictSanitizer = new InputSanitizer(SANITIZATION_CONFIGS.strict);
export const moderateSanitizer = new InputSanitizer(SANITIZATION_CONFIGS.moderate);
export const permissiveSanitizer = new InputSanitizer(SANITIZATION_CONFIGS.permissive);

// Default sanitizer (moderate security)
export const defaultSanitizer = moderateSanitizer;

// Convenience functions for common sanitization tasks
export const sanitizeText = (input: string) => defaultSanitizer.sanitizeText(input);
export const sanitizeHtml = (input: string) => defaultSanitizer.sanitizeHtml(input);
export const sanitizeForDisplay = (input: string) => defaultSanitizer.sanitizeForDisplay(input);
export const sanitizeForDatabase = (input: string) => defaultSanitizer.sanitizeForDatabase(input);
export const sanitizeUrl = (input: string) => defaultSanitizer.sanitizeUrl(input);
export const sanitizeEmail = (input: string) => defaultSanitizer.sanitizeEmail(input);
export const sanitizeNumber = (input: string | number, min?: number, max?: number) => 
  defaultSanitizer.sanitizeNumber(input, min, max);
export const sanitizeJson = (input: string) => defaultSanitizer.sanitizeJson(input);
export const validateInput = (input: string) => defaultSanitizer.validateInput(input);

// React component props sanitization
export const sanitizeProps = (props: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeForDisplay(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = defaultSanitizer.sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Form data sanitization
export const sanitizeFormData = (formData: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      // Use strict sanitization for form data
      sanitized[key] = strictSanitizer.sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = defaultSanitizer.sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

export default InputSanitizer;
