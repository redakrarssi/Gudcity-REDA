/**
 * Secure Input Validation Utility
 * Prevents injection attacks and ensures data integrity
 */

import { sanitizeInput, validateRequiredFields } from './secureErrorResponse';

// Validation patterns
const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,15}$/,
  URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
  NUMERIC: /^\d+$/,
  DECIMAL: /^\d+(\.\d{1,2})?$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  CARD_NUMBER: /^[A-Z]{2}-\d{6}-[A-Z]$/,
  QR_CODE: /^[A-Za-z0-9+/=]+$/,
  BUSINESS_ID: /^\d+$/,
  CUSTOMER_ID: /^\d+$/,
  PROGRAM_ID: /^\d+$/
};

// Input length limits
const LENGTH_LIMITS = {
  NAME: { min: 1, max: 100 },
  EMAIL: { min: 5, max: 254 },
  PHONE: { min: 10, max: 20 },
  URL: { min: 10, max: 2048 },
  DESCRIPTION: { min: 0, max: 1000 },
  ADDRESS: { min: 5, max: 500 },
  PASSWORD: { min: 8, max: 128 },
  TOKEN: { min: 10, max: 1000 },
  QR_DATA: { min: 10, max: 5000 },
  BUSINESS_NAME: { min: 1, max: 200 },
  PROGRAM_NAME: { min: 1, max: 200 }
};

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const sanitized = sanitizeInput(email);
  return VALIDATION_PATTERNS.EMAIL.test(sanitized) && 
         sanitized.length >= LENGTH_LIMITS.EMAIL.min && 
         sanitized.length <= LENGTH_LIMITS.EMAIL.max;
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  const sanitized = sanitizeInput(phone);
  return VALIDATION_PATTERNS.PHONE.test(sanitized) && 
         sanitized.length >= LENGTH_LIMITS.PHONE.min && 
         sanitized.length <= LENGTH_LIMITS.PHONE.max;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const sanitized = sanitizeInput(url);
  return VALIDATION_PATTERNS.URL.test(sanitized) && 
         sanitized.length >= LENGTH_LIMITS.URL.min && 
         sanitized.length <= LENGTH_LIMITS.URL.max;
}

/**
 * Validate name format (alphanumeric with spaces)
 */
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  const sanitized = sanitizeInput(name);
  return VALIDATION_PATTERNS.ALPHANUMERIC.test(sanitized) && 
         sanitized.length >= LENGTH_LIMITS.NAME.min && 
         sanitized.length <= LENGTH_LIMITS.NAME.max;
}

/**
 * Validate numeric value
 */
export function validateNumeric(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num >= 0;
}

/**
 * Validate decimal value
 */
export function validateDecimal(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num >= 0;
}

/**
 * Validate UUID format
 */
export function validateUuid(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  return VALIDATION_PATTERNS.UUID.test(uuid);
}

/**
 * Validate date format
 */
export function validateDate(date: string): boolean {
  if (!date || typeof date !== 'string') {
    return false;
  }
  
  if (!VALIDATION_PATTERNS.DATE.test(date)) {
    return false;
  }
  
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

/**
 * Validate datetime format
 */
export function validateDateTime(datetime: string): boolean {
  if (!datetime || typeof datetime !== 'string') {
    return false;
  }
  
  if (!VALIDATION_PATTERNS.DATETIME.test(datetime)) {
    return false;
  }
  
  const dateObj = new Date(datetime);
  return !isNaN(dateObj.getTime());
}

/**
 * Validate card number format
 */
export function validateCardNumber(cardNumber: string): boolean {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false;
  }
  
  return VALIDATION_PATTERNS.CARD_NUMBER.test(cardNumber);
}

/**
 * Validate QR code data
 */
export function validateQrData(qrData: string): boolean {
  if (!qrData || typeof qrData !== 'string') {
    return false;
  }
  
  const sanitized = sanitizeInput(qrData);
  return sanitized.length >= LENGTH_LIMITS.QR_DATA.min && 
         sanitized.length <= LENGTH_LIMITS.QR_DATA.max;
}

/**
 * Validate business ID
 */
export function validateBusinessId(businessId: any): boolean {
  if (!businessId) {
    return false;
  }
  
  const id = String(businessId);
  return VALIDATION_PATTERNS.BUSINESS_ID.test(id) && validateNumeric(id);
}

/**
 * Validate customer ID
 */
export function validateCustomerId(customerId: any): boolean {
  if (!customerId) {
    return false;
  }
  
  const id = String(customerId);
  return VALIDATION_PATTERNS.CUSTOMER_ID.test(id) && validateNumeric(id);
}

/**
 * Validate program ID
 */
export function validateProgramId(programId: any): boolean {
  if (!programId) {
    return false;
  }
  
  const id = String(programId);
  return VALIDATION_PATTERNS.PROGRAM_ID.test(id) && validateNumeric(id);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  const sanitized = sanitizeInput(password);
  
  if (sanitized.length < LENGTH_LIMITS.PASSWORD.min) {
    errors.push(`Password must be at least ${LENGTH_LIMITS.PASSWORD.min} characters long`);
  }
  
  if (sanitized.length > LENGTH_LIMITS.PASSWORD.max) {
    errors.push(`Password cannot exceed ${LENGTH_LIMITS.PASSWORD.max} characters`);
  }
  
  if (!/[a-z]/.test(sanitized)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(sanitized)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(sanitized)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(sanitized)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
    'monkey', 'dragon', 'master', 'football', 'baseball'
  ];
  
  if (commonPasswords.includes(sanitized.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(sanitized)) {
    errors.push('Password cannot contain more than 2 repeated characters');
  }
  
  // Check for sequential characters
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(sanitized)) {
    errors.push('Password cannot contain sequential characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate and sanitize user input data
 */
export function validateUserInput(data: any, schema: Record<string, any>): {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData: any;
} {
  const errors: ValidationError[] = [];
  const sanitizedData: any = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check if field is required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(new ValidationError(
        `${field} is required`,
        field,
        value,
        'REQUIRED'
      ));
      continue;
    }
    
    // Skip validation if field is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // Sanitize input
    const sanitized = sanitizeInput(value);
    sanitizedData[field] = sanitized;
    
    // Validate type
    if (rules.type && typeof sanitized !== rules.type) {
      errors.push(new ValidationError(
        `${field} must be of type ${rules.type}`,
        field,
        sanitized,
        'TYPE_MISMATCH'
      ));
      continue;
    }
    
    // Validate length
    if (rules.minLength && sanitized.length < rules.minLength) {
      errors.push(new ValidationError(
        `${field} must be at least ${rules.minLength} characters long`,
        field,
        sanitized,
        'MIN_LENGTH'
      ));
    }
    
    if (rules.maxLength && sanitized.length > rules.maxLength) {
      errors.push(new ValidationError(
        `${field} cannot exceed ${rules.maxLength} characters`,
        field,
        sanitized,
        'MAX_LENGTH'
      ));
    }
    
    // Validate format
    if (rules.format) {
      let isValid = false;
      
      switch (rules.format) {
        case 'email':
          isValid = validateEmail(sanitized);
          break;
        case 'phone':
          isValid = validatePhone(sanitized);
          break;
        case 'url':
          isValid = validateUrl(sanitized);
          break;
        case 'name':
          isValid = validateName(sanitized);
          break;
        case 'numeric':
          isValid = validateNumeric(sanitized);
          break;
        case 'decimal':
          isValid = validateDecimal(sanitized);
          break;
        case 'uuid':
          isValid = validateUuid(sanitized);
          break;
        case 'date':
          isValid = validateDate(sanitized);
          break;
        case 'datetime':
          isValid = validateDateTime(sanitized);
          break;
        case 'cardNumber':
          isValid = validateCardNumber(sanitized);
          break;
        case 'qrData':
          isValid = validateQrData(sanitized);
          break;
        case 'businessId':
          isValid = validateBusinessId(sanitized);
          break;
        case 'customerId':
          isValid = validateCustomerId(sanitized);
          break;
        case 'programId':
          isValid = validateProgramId(sanitized);
          break;
        case 'password':
          const passwordValidation = validatePassword(sanitized);
          isValid = passwordValidation.isValid;
          if (!isValid) {
            errors.push(new ValidationError(
              passwordValidation.errors.join(', '),
              field,
              sanitized,
              'PASSWORD_WEAK'
            ));
          }
          break;
      }
      
      if (!isValid && rules.format !== 'password') {
        errors.push(new ValidationError(
          `${field} has invalid format`,
          field,
          sanitized,
          'INVALID_FORMAT'
        ));
      }
    }
    
    // Validate custom function
    if (rules.validate && typeof rules.validate === 'function') {
      try {
        const isValid = rules.validate(sanitized);
        if (!isValid) {
          errors.push(new ValidationError(
            rules.message || `${field} validation failed`,
            field,
            sanitized,
            'CUSTOM_VALIDATION'
          ));
        }
      } catch (error) {
        errors.push(new ValidationError(
          `Validation error for ${field}`,
          field,
          sanitized,
          'VALIDATION_ERROR'
        ));
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Common validation schemas
 */
export const VALIDATION_SCHEMAS = {
  USER_REGISTRATION: {
    name: { required: true, type: 'string', format: 'name', maxLength: LENGTH_LIMITS.NAME.max },
    email: { required: true, type: 'string', format: 'email' },
    password: { required: true, type: 'string', format: 'password' },
    phone: { required: false, type: 'string', format: 'phone' }
  },
  
  BUSINESS_PROFILE: {
    business_name: { required: true, type: 'string', format: 'name', maxLength: LENGTH_LIMITS.BUSINESS_NAME.max },
    email: { required: true, type: 'string', format: 'email' },
    phone: { required: false, type: 'string', format: 'phone' },
    address: { required: false, type: 'string', maxLength: LENGTH_LIMITS.ADDRESS.max },
    website: { required: false, type: 'string', format: 'url' },
    description: { required: false, type: 'string', maxLength: LENGTH_LIMITS.DESCRIPTION.max }
  },
  
  LOYALTY_PROGRAM: {
    name: { required: true, type: 'string', format: 'name', maxLength: LENGTH_LIMITS.PROGRAM_NAME.max },
    description: { required: false, type: 'string', maxLength: LENGTH_LIMITS.DESCRIPTION.max },
    points_per_visit: { required: true, type: 'string', format: 'numeric' },
    points_per_dollar: { required: true, type: 'string', format: 'decimal' },
    min_points_for_reward: { required: true, type: 'string', format: 'numeric' }
  },
  
  AWARD_POINTS: {
    customerId: { required: true, type: 'string', format: 'customerId' },
    programId: { required: true, type: 'string', format: 'programId' },
    points: { required: true, type: 'string', format: 'numeric' },
    description: { required: false, type: 'string', maxLength: LENGTH_LIMITS.DESCRIPTION.max }
  }
};