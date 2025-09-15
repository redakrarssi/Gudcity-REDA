/**
 * Secure JSON Parser
 * 
 * Provides secure JSON parsing with size limits, dangerous pattern detection,
 * and object sanitization to prevent prototype pollution and injection attacks.
 */

export class SecureJsonParser {
  private static readonly MAX_JSON_SIZE = 10000; // 10KB limit
  private static readonly MAX_OBJECT_DEPTH = 10;  // Maximum nesting depth
  private static readonly MAX_KEYS_PER_OBJECT = 100; // Limit keys per object
  
  private static readonly DANGEROUS_PATTERNS = [
    /__proto__/gi,
    /constructor/gi,
    /prototype/gi,
    /<script[^>]*>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /about:blank/gi
  ];
  
  /**
   * Safely parse JSON string with security checks
   * @param jsonString - The JSON string to parse
   * @returns Parsed and sanitized object
   * @throws Error if parsing fails or security checks fail
   */
  static safeParse(jsonString: string): any {
    // SECURITY: Input validation
    if (typeof jsonString !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // SECURITY: Size limit check
    if (jsonString.length > this.MAX_JSON_SIZE) {
      throw new Error(`JSON payload too large (${jsonString.length} bytes, max ${this.MAX_JSON_SIZE})`);
    }
    
    // SECURITY: Empty string check
    if (jsonString.trim() === '') {
      throw new Error('Empty JSON string');
    }
    
    // SECURITY: Pattern detection
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(jsonString)) {
        throw new Error('Potentially malicious JSON detected');
      }
    }
    
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // SECURITY: Sanitize the parsed object
    return this.sanitizeObject(parsed, 0);
  }
  
  /**
   * Recursively sanitize an object to remove dangerous properties
   * @param obj - Object to sanitize
   * @param depth - Current nesting depth
   * @returns Sanitized object
   */
  private static sanitizeObject(obj: any, depth: number): any {
    // SECURITY: Depth limit check
    if (depth > this.MAX_OBJECT_DEPTH) {
      throw new Error('Object nesting too deep');
    }
    
    // Handle null and primitive values
    if (obj === null || typeof obj !== 'object') {
      return this.sanitizePrimitive(obj);
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj
        .slice(0, 1000) // Limit array size
        .map(item => this.sanitizeObject(item, depth + 1));
    }
    
    // Handle objects
    const sanitized: any = {};
    const keys = Object.keys(obj);
    
    // SECURITY: Limit number of keys
    if (keys.length > this.MAX_KEYS_PER_OBJECT) {
      throw new Error('Too many keys in object');
    }
    
    for (const key of keys) {
      // SECURITY: Skip dangerous properties
      if (this.isDangerousKey(key)) {
        continue;
      }
      
      // SECURITY: Sanitize key
      const sanitizedKey = this.sanitizeKey(key);
      if (sanitizedKey) {
        try {
          sanitized[sanitizedKey] = this.sanitizeObject(obj[key], depth + 1);
        } catch (error) {
          // Skip properties that fail sanitization
          console.warn(`Skipping property ${key} due to sanitization error:`, error);
        }
      }
    }
    
    return sanitized;
  }
  
  /**
   * Sanitize primitive values
   * @param value - Primitive value to sanitize
   * @returns Sanitized value
   */
  private static sanitizePrimitive(value: any): any {
    if (typeof value === 'string') {
      // SECURITY: String length limit
      if (value.length > 1000) {
        return value.substring(0, 1000);
      }
      
      // SECURITY: Remove potentially dangerous strings
      return value
        .replace(/javascript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    
    if (typeof value === 'number') {
      // SECURITY: Number validation
      if (!Number.isFinite(value)) {
        return 0;
      }
      // Limit very large numbers
      if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        return Number.MAX_SAFE_INTEGER * Math.sign(value);
      }
    }
    
    if (typeof value === 'boolean') {
      return Boolean(value);
    }
    
    // For undefined, functions, symbols, etc.
    return value;
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
      'setInterval'
    ];
    
    return dangerousKeys.includes(key) || 
           key.startsWith('__') || 
           /^on[A-Z]/.test(key); // Event handlers
  }
  
  /**
   * Sanitize object key
   * @param key - Key to sanitize
   * @returns Sanitized key or null if key should be rejected
   */
  private static sanitizeKey(key: string): string | null {
    if (typeof key !== 'string') {
      return null;
    }
    
    // SECURITY: Key length limit
    if (key.length > 100) {
      return null;
    }
    
    // SECURITY: Remove dangerous characters
    const sanitized = key
      .replace(/[<>\"'&]/g, '')
      .replace(/javascript:/gi, '')
      .trim();
    
    // Reject empty keys after sanitization
    if (sanitized === '') {
      return null;
    }
    
    return sanitized;
  }
  
  /**
   * Validate and parse QR code JSON specifically
   * @param jsonString - QR code JSON string
   * @returns Validated QR code data
   */
  static parseQrCodeJson(jsonString: string): any {
    const parsed = this.safeParse(jsonString);
    
    // SECURITY: QR code specific validation
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('QR code data must be an object');
    }
    
    // SECURITY: Validate required QR code structure
    if (!parsed.type || typeof parsed.type !== 'string') {
      throw new Error('QR code must have a valid type');
    }
    
    // SECURITY: Validate timestamp if present
    if (parsed.timestamp && typeof parsed.timestamp === 'number') {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (Math.abs(now - parsed.timestamp) > maxAge) {
        throw new Error('QR code timestamp is too old or invalid');
      }
    }
    
    return parsed;
  }
}
