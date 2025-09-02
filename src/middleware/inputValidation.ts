/**
 * Input Validation Middleware
 * Provides comprehensive input validation for API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { createSecureErrorResponse, isDevelopmentEnvironment } from '../utils/secureErrorResponse';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  customValidator?: (value: any) => { valid: boolean; message?: string };
}

export interface ValidationSchema {
  body?: ValidationRule[];
  query?: ValidationRule[];
  params?: ValidationRule[];
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string input to prevent injection attacks
 */
function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .replace(/\\/g, '') // Remove backslashes
    .trim();
}

/**
 * Validate a single field against its rule
 */
function validateField(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
  const { field, type, required, minLength, maxLength, min, max, pattern, allowedValues, customValidator } = rule;

  // Check required fields
  if (required && (value === undefined || value === null || value === '')) {
    return { valid: false, message: `${field} is required` };
  }

  // Skip validation for optional fields that are undefined
  if (!required && (value === undefined || value === null)) {
    return { valid: true };
  }

  // Type validation
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { valid: false, message: `${field} must be a string` };
      }
      
      // Sanitize string input
      value = sanitizeString(value);
      
      if (minLength && value.length < minLength) {
        return { valid: false, message: `${field} must be at least ${minLength} characters long` };
      }
      
      if (maxLength && value.length > maxLength) {
        return { valid: false, message: `${field} must not exceed ${maxLength} characters` };
      }
      
      if (pattern && !pattern.test(value)) {
        return { valid: false, message: `${field} format is invalid` };
      }
      
      break;

    case 'number':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      if (isNaN(numValue) || typeof numValue !== 'number') {
        return { valid: false, message: `${field} must be a valid number` };
      }
      
      if (min !== undefined && numValue < min) {
        return { valid: false, message: `${field} must be at least ${min}` };
      }
      
      if (max !== undefined && numValue > max) {
        return { valid: false, message: `${field} must not exceed ${max}` };
      }
      
      break;

    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        return { valid: false, message: `${field} must be a valid email address` };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        // Try to convert string booleans
        if (value === 'true' || value === '1') {
          value = true;
        } else if (value === 'false' || value === '0') {
          value = false;
        } else {
          return { valid: false, message: `${field} must be a boolean` };
        }
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return { valid: false, message: `${field} must be an array` };
      }
      
      if (minLength && value.length < minLength) {
        return { valid: false, message: `${field} must contain at least ${minLength} items` };
      }
      
      if (maxLength && value.length > maxLength) {
        return { valid: false, message: `${field} must not contain more than ${maxLength} items` };
      }
      
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { valid: false, message: `${field} must be an object` };
      }
      break;
  }

  // Check allowed values
  if (allowedValues && !allowedValues.includes(value)) {
    return { valid: false, message: `${field} must be one of: ${allowedValues.join(', ')}` };
  }

  // Custom validation
  if (customValidator) {
    const customResult = customValidator(value);
    if (!customResult.valid) {
      return customResult;
    }
  }

  return { valid: true };
}

/**
 * Validate an object against validation rules
 */
function validateObject(obj: any, rules: ValidationRule[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = obj[rule.field];
    const result = validateField(value, rule);
    
    if (!result.valid) {
      errors.push(result.message || `${rule.field} is invalid`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create validation middleware for specific schema
 */
export function validateInput(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const bodyResult = validateObject(req.body || {}, schema.body);
      if (!bodyResult.valid) {
        errors.push(...bodyResult.errors);
      }
    }

    // Validate query parameters
    if (schema.query) {
      const queryResult = validateObject(req.query || {}, schema.query);
      if (!queryResult.valid) {
        errors.push(...queryResult.errors);
      }
    }

    // Validate URL parameters
    if (schema.params) {
      const paramsResult = validateObject(req.params || {}, schema.params);
      if (!paramsResult.valid) {
        errors.push(...paramsResult.errors);
      }
    }

    if (errors.length > 0) {
      const error = new Error(`Validation failed: ${errors.join(', ')}`);
      (error as any).statusCode = 422;
      const { statusCode, response } = createSecureErrorResponse(error, isDevelopmentEnvironment());
      return res.status(statusCode).json({
        ...response,
        validationErrors: errors
      });
    }

    next();
  };
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  // User ID validation
  userId: {
    params: [
      { field: 'id', type: 'number' as const, required: true, min: 1 }
    ]
  },

  // Pagination validation
  pagination: {
    query: [
      { field: 'page', type: 'number' as const, min: 1 },
      { field: 'limit', type: 'number' as const, min: 1, max: 100 }
    ]
  },

  // Email validation
  email: {
    body: [
      { field: 'email', type: 'email' as const, required: true, maxLength: 255 }
    ]
  },

  // Business ID validation
  businessId: {
    params: [
      { field: 'id', type: 'number' as const, required: true, min: 1 }
    ]
  },

  // Points validation
  pointsAwarding: {
    body: [
      { field: 'customerId', type: 'number' as const, required: true, min: 1 },
      { field: 'programId', type: 'number' as const, required: true, min: 1 },
      { field: 'points', type: 'number' as const, required: true, min: 1, max: 10000 },
      { field: 'description', type: 'string' as const, maxLength: 500 },
      { field: 'source', type: 'string' as const, allowedValues: ['MANUAL', 'SCAN', 'PURCHASE', 'BONUS', 'REFERRAL'] }
    ]
  }
};

/**
 * Sanitize request data after validation
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
