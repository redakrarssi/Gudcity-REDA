/**
 * Utility functions for data validation and formatting
 */

// SECURITY: Define allowed characters and patterns
const ALLOWED_CHARS = /^[a-zA-Z0-9\s\-_\.@]+$/;
const ALLOWED_EMAIL_CHARS = /^[a-zA-Z0-9._%+-@]+$/;
const ALLOWED_PHONE_CHARS = /^[0-9\s\-\(\)\+]+$/;
const ALLOWED_ID_CHARS = /^[a-zA-Z0-9\-_]+$/;

// SECURITY: Maximum lengths to prevent DoS attacks
const MAX_LENGTHS = {
  email: 254,
  phone: 20,
  name: 100,
  id: 50,
  description: 1000,
  url: 2048
};

/**
 * SECURITY: Sanitize input string to prevent injection attacks
 * @param input Input string to sanitize
 * @param allowedPattern Regex pattern for allowed characters
 * @param maxLength Maximum allowed length
 * @returns Sanitized string or empty string if invalid
 */
export const sanitizeInput = (
  input: string, 
  allowedPattern: RegExp = ALLOWED_CHARS,
  maxLength: number = 100
): string => {
  if (typeof input !== 'string') return '';
  
  // Trim whitespace
  const trimmed = input.trim();
  
  // Check length
  if (trimmed.length > maxLength) return '';
  
  // Check for allowed characters only
  if (!allowedPattern.test(trimmed)) return '';
  
  // Remove any potential script tags or dangerous patterns
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  return sanitized;
};

/**
 * Format points value to avoid floating point errors
 * @param points Points value to format
 * @returns Formatted points value (2 decimal places)
 */
export const formatPoints = (points: number): number => {
  if (typeof points !== 'number' || isNaN(points)) return 0;
  if (points < 0) return 0; // SECURITY: Prevent negative points
  return Math.round(points * 100) / 100;
};

/**
 * Validates card data structure with enhanced security
 * @param cardData Card data to validate
 * @returns Whether the card data is valid
 */
export const validateCardData = (cardData: any): boolean => {
  if (!cardData || typeof cardData !== 'object') return false;
  
  // Check required fields
  const requiredFields = ['customerId', 'programId', 'businessId'];
  for (const field of requiredFields) {
    if (!cardData[field] || typeof cardData[field] !== 'string') {
      return false;
    }
    
    // SECURITY: Validate ID format
    if (!ALLOWED_ID_CHARS.test(cardData[field])) {
      return false;
    }
  }
  
  // SECURITY: Check for unexpected fields (prevent injection)
  const allowedFields = [...requiredFields, 'status', 'enrollmentDate', 'points'];
  const unexpectedFields = Object.keys(cardData).filter(key => !allowedFields.includes(key));
  if (unexpectedFields.length > 0) {
    return false;
  }
  
  return true;
};

/**
 * Validates a card enrollment application with enhanced security
 * @param applicationData Card enrollment application data
 * @returns Whether the application is valid
 */
export const validateCardApplication = (applicationData: any): boolean => {
  if (!applicationData || typeof applicationData !== 'object') return false;
  
  // Check required fields
  const requiredFields = ['customerId', 'programId', 'businessId', 'status'];
  for (const field of requiredFields) {
    if (applicationData[field] === undefined || applicationData[field] === null) {
      return false;
    }
    
    // SECURITY: Validate ID format for ID fields
    if (field !== 'status' && typeof applicationData[field] === 'string') {
      if (!ALLOWED_ID_CHARS.test(applicationData[field])) {
        return false;
      }
    }
  }
  
  // Validate status is one of the accepted values (whitelist approach)
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
  if (!validStatuses.includes(applicationData.status)) {
    return false;
  }
  
  // SECURITY: Check for unexpected fields
  const allowedFields = [...requiredFields, 'enrollmentDate', 'notes'];
  const unexpectedFields = Object.keys(applicationData).filter(key => !allowedFields.includes(key));
  if (unexpectedFields.length > 0) {
    return false;
  }
  
  return true;
};

/**
 * Validate a QR code data structure with enhanced security
 * @param qrData QR code data to validate
 * @returns Whether the QR code data is valid
 */
export const validateQrData = (qrData: any): boolean => {
  if (!qrData || typeof qrData !== 'object') return false;
  
  // SECURITY: Validate QR type against whitelist
  const validTypes = ['customer', 'loyaltyCard', 'promotion'];
  if (!validTypes.includes(qrData.type)) {
    return false;
  }
  
  // Validate basic structure based on QR type
  if (qrData.type === 'customer') {
    return !!qrData.customerId && ALLOWED_ID_CHARS.test(qrData.customerId);
  } else if (qrData.type === 'loyaltyCard') {
    return !!qrData.cardId && !!qrData.customerId && !!qrData.programId &&
           ALLOWED_ID_CHARS.test(qrData.cardId) && 
           ALLOWED_ID_CHARS.test(qrData.customerId) && 
           ALLOWED_ID_CHARS.test(qrData.programId);
  } else if (qrData.type === 'promotion') {
    return !!qrData.promoId && !!qrData.businessId &&
           ALLOWED_ID_CHARS.test(qrData.promoId) && 
           ALLOWED_ID_CHARS.test(qrData.businessId);
  }
  
  return false;
};

/**
 * Ensure value is a valid number with security checks
 * @param value Value to check
 * @param defaultValue Default value if invalid
 * @param maxValue Maximum allowed value
 * @returns Valid number or default value
 */
export const ensureNumber = (value: any, defaultValue: number = 0, maxValue: number = 999999): number => {
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > maxValue) return defaultValue;
  return num;
};

/**
 * Ensure value is a valid string ID with security validation
 * @param id ID to ensure
 * @returns String ID or empty string if invalid
 */
export const ensureId = (id: string | number | undefined | null): string => {
  if (id === undefined || id === null) return '';
  const idStr = String(id);
  
  // SECURITY: Validate ID format
  if (!ALLOWED_ID_CHARS.test(idStr) || idStr.length > MAX_LENGTHS.id) {
    return '';
  }
  
  return idStr;
};

/**
 * Validate an email address with enhanced security
 * @param email Email to validate
 * @returns Whether the email is valid
 */
export const validateEmail = (email: string): boolean => {
  if (typeof email !== 'string') return false;
  
  // SECURITY: Check length
  if (email.length > MAX_LENGTHS.email) return false;
  
  // SECURITY: Check for allowed characters only
  if (!ALLOWED_EMAIL_CHARS.test(email)) return false;
  
  // Enhanced email regex (more comprehensive than basic)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  
  // SECURITY: Check for common injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /data:/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(email)) return false;
  }
  
  return true;
};

/**
 * Validate a phone number with enhanced security
 * @param phone Phone number to validate
 * @returns Whether the phone number is valid
 */
export const validatePhone = (phone: string): boolean => {
  if (typeof phone !== 'string') return false;
  
  // SECURITY: Check length
  if (phone.length > MAX_LENGTHS.phone) return false;
  
  // SECURITY: Check for allowed characters only
  if (!ALLOWED_PHONE_CHARS.test(phone)) return false;
  
  // Extract digits and validate
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return false;
  
  return true;
};

/**
 * SECURITY: Validate and sanitize user input
 * @param input User input to validate
 * @param type Type of input to validate
 * @returns Sanitized input or null if invalid
 */
export const validateUserInput = (input: any, type: 'name' | 'email' | 'phone' | 'id' | 'text'): string | null => {
  if (typeof input !== 'string') return null;
  
  switch (type) {
    case 'name':
      return sanitizeInput(input, /^[a-zA-Z\s\-']+$/, MAX_LENGTHS.name);
    case 'email':
      return validateEmail(input) ? input : null;
    case 'phone':
      return validatePhone(input) ? input : null;
    case 'id':
      return ALLOWED_ID_CHARS.test(input) && input.length <= MAX_LENGTHS.id ? input : null;
    case 'text':
      return sanitizeInput(input, ALLOWED_CHARS, MAX_LENGTHS.description);
    default:
      return null;
  }
}; 