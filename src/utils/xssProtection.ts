/**
 * XSS Protection Utility
 * 
 * Provides comprehensive XSS protection for QR code data and HTML content.
 * Uses DOMPurify for HTML sanitization and custom logic for data sanitization.
 */

import DOMPurify from 'dompurify';

export class XssProtection {
  private static readonly MAX_STRING_LENGTH = 1000;
  private static readonly MAX_ARRAY_LENGTH = 100;
  
  // HTML tags allowed in specific contexts
  private static readonly SAFE_HTML_TAGS = ['b', 'i', 'em', 'strong', 'span', 'div', 'p'];
  private static readonly SAFE_HTML_ATTRIBUTES = ['class', 'id'];
  
  // Patterns that indicate potential XSS attacks
  private static readonly XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /data:text\/javascript/gi,
    /<iframe[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /<form[^>]*>/gi,
    /<input[^>]*>/gi,
    /<textarea[^>]*>/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
    /@import/gi,
    /binding\s*:/gi
  ];
  
  /**
   * Sanitize QR code data for safe display and processing
   * @param data - The data to sanitize
   * @returns Sanitized data
   */
  static sanitizeQrData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }
    
    // Handle primitive types
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }
    
    if (typeof data === 'number') {
      return this.sanitizeNumber(data);
    }
    
    if (typeof data === 'boolean') {
      return data;
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return this.sanitizeArray(data);
    }
    
    // Handle objects
    if (typeof data === 'object') {
      return this.sanitizeObject(data);
    }
    
    // For functions, symbols, undefined, etc. - return null
    return null;
  }
  
  /**
   * Sanitize string values
   * @param str - String to sanitize
   * @returns Sanitized string
   */
  private static sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    
    // Length limit
    if (str.length > this.MAX_STRING_LENGTH) {
      str = str.substring(0, this.MAX_STRING_LENGTH);
    }
    
    // Remove XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      str = str.replace(pattern, '');
    }
    
    // Remove null bytes and other dangerous characters
    str = str
      .replace(/\x00/g, '') // Null bytes
      .replace(/\x01-\x08\x0B\x0C\x0E-\x1F\x7F/g, '') // Control characters
      .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width characters
    
    // Encode HTML entities for safety
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  /**
   * Sanitize number values
   * @param num - Number to sanitize
   * @returns Sanitized number
   */
  private static sanitizeNumber(num: number): number {
    if (typeof num !== 'number' || !Number.isFinite(num)) {
      return 0;
    }
    
    // Limit extremely large numbers
    if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
      return Number.MAX_SAFE_INTEGER * Math.sign(num);
    }
    
    return num;
  }
  
  /**
   * Sanitize array values
   * @param arr - Array to sanitize
   * @returns Sanitized array
   */
  private static sanitizeArray(arr: any[]): any[] {
    if (!Array.isArray(arr)) {
      return [];
    }
    
    // Limit array length
    const limitedArray = arr.slice(0, this.MAX_ARRAY_LENGTH);
    
    // Recursively sanitize each element
    return limitedArray.map(item => this.sanitizeQrData(item));
  }
  
  /**
   * Sanitize object values
   * @param obj - Object to sanitize
   * @returns Sanitized object
   */
  private static sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return {};
    }
    
    const sanitized: any = {};
    const keys = Object.keys(obj);
    
    // Limit number of keys
    const limitedKeys = keys.slice(0, 50);
    
    for (const key of limitedKeys) {
      // Skip dangerous keys
      if (this.isDangerousKey(key)) {
        continue;
      }
      
      // Sanitize the key itself
      const sanitizedKey = this.sanitizeString(key);
      if (sanitizedKey && sanitizedKey.length > 0) {
        sanitized[sanitizedKey] = this.sanitizeQrData(obj[key]);
      }
    }
    
    return sanitized;
  }
  
  /**
   * Check if a key is dangerous
   * @param key - Key to check
   * @returns True if key is dangerous
   */
  private static isDangerousKey(key: string): boolean {
    const dangerousKeys = [
      '__proto__',
      'constructor',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
      'eval',
      'Function',
      'setTimeout',
      'setInterval',
      'alert',
      'confirm',
      'prompt'
    ];
    
    return dangerousKeys.includes(key) || 
           key.startsWith('__') ||
           key.startsWith('on') ||
           /^[A-Z]/.test(key.charAt(0)); // Constructor functions
  }
  
  /**
   * Sanitize HTML content using DOMPurify
   * @param html - HTML string to sanitize
   * @param options - Sanitization options
   * @returns Sanitized HTML string
   */
  static sanitizeHtml(html: string, options?: {
    allowedTags?: string[];
    allowedAttributes?: string[];
    stripAll?: boolean;
  }): string {
    if (typeof html !== 'string') {
      return '';
    }
    
    const config: any = {};
    
    if (options?.stripAll) {
      // Strip all HTML tags
      config.ALLOWED_TAGS = [];
      config.ALLOWED_ATTR = [];
    } else {
      // Use safe defaults or provided options
      config.ALLOWED_TAGS = options?.allowedTags || this.SAFE_HTML_TAGS;
      config.ALLOWED_ATTR = options?.allowedAttributes || this.SAFE_HTML_ATTRIBUTES;
    }
    
    // Additional security settings
    config.KEEP_CONTENT = true;
    config.ALLOW_DATA_ATTR = false;
    config.ALLOW_UNKNOWN_PROTOCOLS = false;
    config.USE_PROFILES = { html: true };
    
    return DOMPurify.sanitize(html, config);
  }
  
  /**
   * Sanitize text content for display (strips all HTML)
   * @param text - Text to sanitize
   * @returns Sanitized text
   */
  static sanitizeText(text: string): string {
    return this.sanitizeHtml(text, { stripAll: true });
  }
  
  /**
   * Sanitize QR code display data specifically
   * @param qrData - QR code data object
   * @returns Sanitized QR code data safe for display
   */
  static sanitizeQrDisplayData(qrData: any): any {
    if (!qrData || typeof qrData !== 'object') {
      return {};
    }
    
    // Create a copy to avoid mutating original data
    const sanitized = { ...qrData };
    
    // Sanitize common QR code fields
    const fieldsToSanitize = [
      'customerName',
      'businessName', 
      'programName',
      'cardNumber',
      'cardType',
      'code',
      'promoCode',
      'name',
      'email',
      'description'
    ];
    
    for (const field of fieldsToSanitize) {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        sanitized[field] = this.sanitizeText(sanitized[field]);
      }
    }
    
    // Sanitize numeric fields
    const numericFields = ['customerId', 'businessId', 'programId', 'cardId', 'points', 'timestamp'];
    for (const field of numericFields) {
      if (sanitized[field] !== undefined) {
        sanitized[field] = this.sanitizeNumber(Number(sanitized[field]));
      }
    }
    
    // Remove any dangerous or unnecessary fields
    const dangerousFields = [
      'eval', 'Function', 'constructor', 'prototype', '__proto__',
      'innerHTML', 'outerHTML', 'document', 'window'
    ];
    
    for (const field of dangerousFields) {
      delete sanitized[field];
    }
    
    return sanitized;
  }
  
  /**
   * Validate that content is safe for display
   * @param content - Content to validate
   * @returns True if content appears safe
   */
  static isContentSafe(content: string): boolean {
    if (typeof content !== 'string') {
      return false;
    }
    
    // Check for XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(content)) {
        return false;
      }
    }
    
    // Check for suspicious character sequences
    const suspiciousPatterns = [
      /\x00/, // Null bytes
      /[\u200B-\u200D\uFEFF]/, // Zero-width characters
      /%[0-9a-fA-F]{2}/, // URL encoding (could be evasion)
      /\\u[0-9a-fA-F]{4}/, // Unicode escapes
      /&#[0-9]+;/, // Numeric HTML entities
      /&\w+;/ // Named HTML entities
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }
    
    return true;
  }
}

export default XssProtection;
