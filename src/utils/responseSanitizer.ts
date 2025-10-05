/**
 * API Response Sanitizer
 * 
 * SECURITY: Removes sensitive data from API responses
 * Prevents accidental exposure of passwords, tokens, and other sensitive information
 */

/**
 * Fields that should NEVER be in API responses
 */
const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'passwordHash',
  'hashedPassword',
  'hashed_password',
  'salt',
  'password_salt',
  'passwordSalt',
  'reset_token',
  'resetToken',
  'verification_token',
  'verificationToken',
  'secret',
  'api_key',
  'apiKey',
  'private_key',
  'privateKey',
  'encryption_key',
  'encryptionKey',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'session_id',
  'sessionId',
  'ssn',
  'social_security',
  'socialSecurity',
  'credit_card',
  'creditCard',
  'card_number',
  'cardNumber',
  'cvv',
  'bank_account',
  'bankAccount',
  'routing_number',
  'routingNumber',
  'internal_notes',
  'internalNotes',
  'admin_notes',
  'adminNotes',
];

/**
 * Remove sensitive fields from an object
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Handle objects
  const sanitized: any = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Skip sensitive fields
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey === field.toLowerCase() || lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        // Don't include sensitive fields at all
        continue;
      }
      
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  
  return sanitized;
}

/**
 * Sanitize user data for API responses
 */
export function sanitizeUser(user: any): any {
  if (!user) return user;
  
  const sanitized = sanitizeObject(user);
  
  // Additional user-specific sanitization
  // Mask email if needed
  if (sanitized.email && typeof sanitized.email === 'string') {
    sanitized.emailMasked = maskEmail(sanitized.email);
  }
  
  // Mask phone if present
  if (sanitized.phone && typeof sanitized.phone === 'string') {
    sanitized.phoneMasked = maskPhone(sanitized.phone);
  }
  
  return sanitized;
}

/**
 * Sanitize array of users
 */
export function sanitizeUsers(users: any[]): any[] {
  if (!Array.isArray(users)) return [];
  return users.map(sanitizeUser);
}

/**
 * Safe user response (only essential public fields)
 */
export function safeUserResponse(user: any): any {
  if (!user) return null;
  
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.user_type || user.userType,
    status: user.status,
    createdAt: user.created_at || user.createdAt,
    updatedAt: user.updated_at || user.updatedAt,
    avatarUrl: user.avatar_url || user.avatarUrl,
    // Only include what's absolutely needed for client
  };
}

/**
 * Mask email address: j***@example.com
 */
function maskEmail(email: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '***';
  }
  
  const [local, domain] = email.split('@');
  if (local.length <= 1) {
    return `*@${domain}`;
  }
  
  return `${local[0]}***@${domain}`;
}

/**
 * Mask phone number: ***-***-1234
 */
function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '***';
  }
  
  // Keep only last 4 digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '***';
  }
  
  return `***-***-${digits.slice(-4)}`;
}

/**
 * Sanitize business data
 */
export function sanitizeBusiness(business: any): any {
  if (!business) return business;
  
  const sanitized = sanitizeObject(business);
  
  // Business-specific sanitization
  return sanitized;
}

/**
 * Sanitize error messages (remove sensitive information)
 */
export function sanitizeErrorMessage(error: any): string {
  if (!error) return 'An error occurred';
  
  let message = error.message || error.toString();
  
  // Remove SQL error details
  if (message.includes('SQL') || message.includes('postgres') || message.includes('database')) {
    return 'A database error occurred';
  }
  
  // Remove file paths
  message = message.replace(/\/[^\s]+/g, '[path]');
  message = message.replace(/[A-Z]:\\[^\s]+/gi, '[path]'); // Windows paths
  
  // Remove stack trace lines
  if (message.includes('\n')) {
    message = message.split('\n')[0];
  }
  
  // Remove connection strings
  message = message.replace(/postgres:\/\/[^\s]+/gi, '[connection-string]');
  message = message.replace(/mysql:\/\/[^\s]+/gi, '[connection-string]');
  
  return message;
}

/**
 * Check if object contains sensitive data
 */
export function containsSensitiveData(obj: any): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  // Check keys
  const keys = Object.keys(obj);
  const hasSensitiveKey = keys.some(key => {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_FIELDS.some(field => 
      lowerKey === field.toLowerCase() || lowerKey.includes(field.toLowerCase())
    );
  });
  
  if (hasSensitiveKey) {
    return true;
  }
  
  // Recursively check nested objects
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (containsSensitiveData(obj[key])) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Express middleware to automatically sanitize responses
 */
export function responseSanitizerMiddleware(req: any, res: any, next: any) {
  // Intercept res.json to sanitize data
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    // Sanitize the response data
    const sanitized = sanitizeObject(data);
    
    // Check if we removed sensitive data
    if (containsSensitiveData(data)) {
      console.warn(`⚠️  Sensitive data detected in response to ${req.path} - sanitized before sending`);
    }
    
    return originalJson(sanitized);
  };
  
  next();
}

export default {
  sanitizeObject,
  sanitizeUser,
  sanitizeUsers,
  safeUserResponse,
  sanitizeBusiness,
  sanitizeErrorMessage,
  containsSensitiveData,
  responseSanitizerMiddleware,
  maskEmail,
  maskPhone,
};
