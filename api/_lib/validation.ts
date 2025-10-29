import { VercelRequest, VercelResponse } from '@vercel/node';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'uuid' | 'boolean';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validate request body against rules
 */
export function validateInput(data: any, rules: ValidationRule[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const rule of rules) {
    const value = data[rule.field];
    
    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: rule.field,
        message: `${rule.field} is required`,
        value
      });
      continue;
    }
    
    // Skip further validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }
    
    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({
              field: rule.field,
              message: `${rule.field} must be a string`,
              value
            });
          }
          break;
          
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
              field: rule.field,
              message: `${rule.field} must be a valid number`,
              value
            });
          }
          break;
          
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (typeof value !== 'string' || !emailRegex.test(value)) {
            errors.push({
              field: rule.field,
              message: `${rule.field} must be a valid email address`,
              value
            });
          }
          break;
          
        case 'uuid':
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (typeof value !== 'string' || !uuidRegex.test(value)) {
            errors.push({
              field: rule.field,
              message: `${rule.field} must be a valid UUID`,
              value
            });
          }
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({
              field: rule.field,
              message: `${rule.field} must be a boolean`,
              value
            });
          }
          break;
      }
    }
    
    // String length validation
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at least ${rule.minLength} characters long`,
          value
        });
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be no more than ${rule.maxLength} characters long`,
          value
        });
      }
    }
    
    // Number range validation
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at least ${rule.min}`,
          value
        });
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be no more than ${rule.max}`,
          value
        });
      }
    }
    
    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push({
        field: rule.field,
        message: `${rule.field} format is invalid`,
        value
      });
    }
    
    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push({
          field: rule.field,
          message: typeof customResult === 'string' ? customResult : `${rule.field} validation failed`,
          value
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validation middleware
 */
export function withValidation(rules: ValidationRule[]) {
  return function(handler: (req: VercelRequest, res: VercelResponse) => Promise<void>) {
    return async (req: VercelRequest, res: VercelResponse) => {
      const errors = validateInput(req.body, rules);
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }
      
      return handler(req, res);
    };
  };
}

/**
 * Sanitize input to prevent XSS and other attacks
 */
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Basic XSS prevention
    return data
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}
