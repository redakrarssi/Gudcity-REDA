/**
 * QR Data Sanitizer
 * 
 * Comprehensive sanitization and validation for QR code data to prevent XSS attacks.
 * This utility ensures that ALL data going into QR codes is safe and validated.
 * 
 * SECURITY: Critical component for preventing XSS through QR codes
 */

import { z } from 'zod';
import { XssProtection } from './xssProtection';

/**
 * Customer QR Code Schema
 * Validates and sanitizes customer QR data
 */
const CustomerQRSchema = z.object({
  type: z.literal('customer'),
  customerId: z.string().uuid(),
  name: z.string().max(100).transform(val => XssProtection.sanitizeText(val)),
  email: z.string().email().optional(),
  cardNumber: z.string().regex(/^GC-[A-Z0-9]{6,12}-[A-Z]$/),
  cardType: z.enum(['STANDARD', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
  timestamp: z.number().int().positive(),
  version: z.literal('1.0').optional()
});

/**
 * Loyalty Card QR Code Schema
 * Validates and sanitizes loyalty card QR data
 */
const LoyaltyCardQRSchema = z.object({
  type: z.literal('loyaltyCard'),
  cardId: z.string().uuid(),
  customerId: z.string().uuid(),
  programId: z.string().uuid(),
  businessId: z.string().uuid(),
  cardNumber: z.string().regex(/^GC-[A-Z0-9]{6,12}-[A-Z]$/),
  programName: z.string().max(100).transform(val => XssProtection.sanitizeText(val)),
  businessName: z.string().max(100).transform(val => XssProtection.sanitizeText(val)),
  points: z.number().int().min(0),
  timestamp: z.number().int().positive(),
  version: z.literal('1.0').optional()
});

/**
 * Promo Code QR Schema
 * Validates and sanitizes promo code QR data
 */
const PromoCodeQRSchema = z.object({
  type: z.literal('promoCode'),
  promoId: z.string().uuid(),
  code: z.string().max(50).transform(val => XssProtection.sanitizeText(val)),
  businessId: z.string().uuid(),
  value: z.number().min(0),
  timestamp: z.number().int().positive(),
  version: z.literal('1.0').optional()
});

/**
 * Generic QR Data Schema (union of all types)
 */
const QRDataSchema = z.union([
  CustomerQRSchema,
  LoyaltyCardQRSchema,
  PromoCodeQRSchema
]);

export type ValidatedQRData = z.infer<typeof QRDataSchema>;
export type CustomerQRData = z.infer<typeof CustomerQRSchema>;
export type LoyaltyCardQRData = z.infer<typeof LoyaltyCardQRSchema>;
export type PromoCodeQRData = z.infer<typeof PromoCodeQRSchema>;

/**
 * Validate and sanitize QR code data
 * 
 * SECURITY: This is the primary entry point for QR data validation
 * All QR data MUST pass through this function before being encoded
 * 
 * @param data - Raw QR data to validate
 * @returns Validated and sanitized QR data
 * @throws Error if data is invalid
 */
export function validateAndSanitizeQRData(data: any): ValidatedQRData {
  try {
    // SECURITY: First pass - Zod validation with automatic sanitization
    const validated = QRDataSchema.parse(data);
    
    // SECURITY: Second pass - Deep sanitization for defense in depth
    const sanitized = deepSanitizeObject(validated);
    
    // SECURITY: Third pass - Size validation (prevent DoS)
    const jsonSize = JSON.stringify(sanitized).length;
    if (jsonSize > 4096) { // 4KB max for QR data
      throw new Error('QR data too large (max 4KB)');
    }
    
    return sanitized as ValidatedQRData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid QR data: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Validate QR data without throwing (returns validation result)
 * 
 * @param data - Raw QR data to validate
 * @returns Validation result with sanitized data or error
 */
export function safeValidateQRData(data: any): {
  success: boolean;
  data?: ValidatedQRData;
  error?: string;
} {
  try {
    const validated = validateAndSanitizeQRData(data);
    return { success: true, data: validated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid QR data'
    };
  }
}

/**
 * Deep sanitize an object (recursive)
 * Removes any potential XSS vectors from all string fields
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
function deepSanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return XssProtection.sanitizeText(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Sanitize key name (prevent prototype pollution)
        const safeKey = XssProtection.sanitizeText(key);
        if (safeKey && !['__proto__', 'constructor', 'prototype'].includes(safeKey)) {
          sanitized[safeKey] = deepSanitizeObject(obj[key]);
        }
      }
    }
    return sanitized;
  }
  
  return null;
}

/**
 * Sanitize SVG content for safe display
 * 
 * SECURITY: Use this before displaying SVG from QR codes
 * Removes script tags, event handlers, and dangerous protocols
 * 
 * @param svgString - SVG content to sanitize
 * @returns Sanitized SVG
 */
export function sanitizeSVG(svgString: string): string {
  if (!svgString || typeof svgString !== 'string') {
    return '';
  }
  
  // Remove dangerous SVG elements and attributes
  let sanitized = svgString
    // Remove script tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data:text/html
    .replace(/data:text\/html/gi, '')
    // Remove data:application/javascript
    .replace(/data:application\/javascript/gi, '')
    // Remove data:text/javascript
    .replace(/data:text\/javascript/gi, '')
    // Remove <foreignObject> (can contain HTML)
    .replace(/<foreignObject[^>]*>.*?<\/foreignObject>/gi, '')
    // Remove <use> with external references
    .replace(/<use[^>]*xlink:href\s*=\s*["']https?:\/\/[^"']*["'][^>]*>/gi, '')
    // Remove imports
    .replace(/@import/gi, '')
    // Remove expression()
    .replace(/expression\s*\(/gi, '');
  
  return sanitized;
}

/**
 * Check if QR data is valid type
 */
export function isValidQRType(type: string): boolean {
  return ['customer', 'loyaltyCard', 'promoCode'].includes(type);
}

/**
 * Get QR data size in bytes
 */
export function getQRDataSize(data: any): number {
  return JSON.stringify(data).length;
}

/**
 * Validate QR data size
 */
export function isQRDataSizeValid(data: any): boolean {
  const size = getQRDataSize(data);
  return size > 0 && size <= 4096; // 4KB max
}

/**
 * Extract safe display info from QR data (for logging/debugging)
 * Removes sensitive information
 */
export function extractSafeDisplayInfo(data: any): {
  type?: string;
  id?: string;
  size: number;
} {
  return {
    type: data?.type || 'unknown',
    id: data?.customerId || data?.cardId || data?.promoId || 'unknown',
    size: getQRDataSize(data)
  };
}

/**
 * Test data against XSS patterns
 * Returns true if data contains potential XSS vectors
 */
export function containsXSSPatterns(data: any): boolean {
  const dataString = JSON.stringify(data);
  
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /data:text\/html/i,
    /vbscript:/i,
    /expression\(/i
  ];
  
  return xssPatterns.some(pattern => pattern.test(dataString));
}

export default {
  validateAndSanitizeQRData,
  safeValidateQRData,
  sanitizeSVG,
  isValidQRType,
  isQRDataSizeValid,
  getQRDataSize,
  extractSafeDisplayInfo,
  containsXSSPatterns
};
