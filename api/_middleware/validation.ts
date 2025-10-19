/**
 * Input Validation Middleware
 * Validates and sanitizes request data to prevent security vulnerabilities
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Validation schema types
 */
export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'object' | 'array';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  sanitize?: boolean;
  schema?: ValidationSchema; // For nested objects
  items?: ValidationRule;    // For array items
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate request body against schema
 */
export function validateInput(
  data: any,
  schema: ValidationSchema
): { valid: boolean; errors: ValidationError[]; sanitized?: any } {
  const errors: ValidationError[] = [];
  const sanitized: any = {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: `${field} is required`,
      });
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!rule.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    const typeError = validateType(value, rule.type, field);
    if (typeError) {
      errors.push(typeError);
      continue;
    }

    // String validations
    if (rule.type === 'string') {
      if (rule.min && value.length < rule.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.min} characters`,
        });
      }
      if (rule.max && value.length > rule.max) {
        errors.push({
          field,
          message: `${field} must not exceed ${rule.max} characters`,
        });
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field,
          message: `${field} format is invalid`,
        });
      }
    }

    // Number validations
    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.min}`,
        });
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field,
          message: `${field} must not exceed ${rule.max}`,
        });
      }
    }

    // Email validation
    if (rule.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push({
          field,
          message: `${field} must be a valid email address`,
        });
      }
    }

    // URL validation
    if (rule.type === 'url') {
      try {
        new URL(value);
      } catch {
        errors.push({
          field,
          message: `${field} must be a valid URL`,
        });
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field,
        message: `${field} must be one of: ${rule.enum.join(', ')}`,
      });
    }

    // Object validation (nested)
    if (rule.type === 'object' && rule.schema) {
      const nestedResult = validateInput(value, rule.schema);
      if (!nestedResult.valid) {
        errors.push(...nestedResult.errors.map(e => ({
          field: `${field}.${e.field}`,
          message: e.message,
        })));
      } else if (nestedResult.sanitized) {
        sanitized[field] = nestedResult.sanitized;
      }
    }

    // Array validation
    if (rule.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push({
          field,
          message: `${field} must be an array`,
        });
      } else {
        if (rule.min && value.length < rule.min) {
          errors.push({
            field,
            message: `${field} must contain at least ${rule.min} items`,
          });
        }
        if (rule.max && value.length > rule.max) {
          errors.push({
            field,
            message: `${field} must not contain more than ${rule.max} items`,
          });
        }
        // Validate array items if rule provided
        if (rule.items) {
          const sanitizedArray: any[] = [];
          value.forEach((item, index) => {
            const itemSchema = { item: rule.items! };
            const itemResult = validateInput({ item }, itemSchema);
            if (!itemResult.valid) {
              errors.push(...itemResult.errors.map(e => ({
                field: `${field}[${index}]`,
                message: e.message,
              })));
            } else if (itemResult.sanitized) {
              sanitizedArray.push(itemResult.sanitized.item);
            } else {
              sanitizedArray.push(item);
            }
          });
          sanitized[field] = sanitizedArray;
        }
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push({
          field,
          message: typeof customResult === 'string' ? customResult : `${field} is invalid`,
        });
      }
    }

    // Sanitize if needed
    if (rule.sanitize && rule.type === 'string') {
      sanitized[field] = sanitizeString(value);
    } else {
      sanitized[field] = value;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Validate type
 */
function validateType(
  value: any,
  type: ValidationRule['type'],
  field: string
): ValidationError | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { field, message: `${field} must be a string` };
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return { field, message: `${field} must be a number` };
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { field, message: `${field} must be a boolean` };
      }
      break;
    case 'email':
    case 'url':
      if (typeof value !== 'string') {
        return { field, message: `${field} must be a string` };
      }
      break;
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { field, message: `${field} must be an object` };
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        return { field, message: `${field} must be an array` };
      }
      break;
  }
  return null;
}

/**
 * Sanitize string to prevent XSS
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validation middleware for Express/Vercel
 */
export function validationMiddleware(schema: ValidationSchema) {
  return (req: VercelRequest, res: VercelResponse, next?: () => void): boolean => {
    const result = validateInput(req.body || {}, schema);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: result.errors,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }

    // Replace body with sanitized data
    req.body = result.sanitized;

    if (next) next();
    return true;
  };
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  email: {
    email: {
      type: 'email' as const,
      required: true,
      max: 255,
      sanitize: true,
    },
  },

  password: {
    password: {
      type: 'string' as const,
      required: true,
      min: 8,
      max: 128,
    },
  },

  id: {
    id: {
      type: 'number' as const,
      required: true,
      min: 1,
    },
  },

  pagination: {
    page: {
      type: 'number' as const,
      required: false,
      min: 1,
    },
    limit: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 100,
    },
  },
};

