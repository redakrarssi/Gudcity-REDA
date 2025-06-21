/**
 * Runtime Type Validator
 * 
 * This utility provides performance-optimized runtime type validation
 * for critical paths in the application, especially around QR code processing
 * and API boundaries.
 */

import { QrCodeType, QrCodeData, CustomerQrCodeData, LoyaltyCardQrCodeData, PromoCodeQrCodeData } from '../types/qrCode';

// Type guard result cache to improve performance for repeated validations
let validationCache = new WeakMap<object, Record<string, boolean>>();

/**
 * Clears the validation cache
 * Use this when you want to force fresh validation
 */
export function clearValidationCache(): void {
  // WeakMap doesn't have a clear method, so we create a new one
  // @ts-ignore - Intentionally replacing the WeakMap reference
  validationCache = new WeakMap<object, Record<string, boolean>>();
}

/**
 * Validates that an unknown value is a valid QrCodeData object
 * @param value The value to validate
 * @returns A type guard indicating if the value is a valid QrCodeData
 */
export function isQrCodeData(value: unknown): value is QrCodeData {
  if (!value || typeof value !== 'object') return false;
  
  // Check cache first for performance
  if (validationCache.has(value as object)) {
    const cache = validationCache.get(value as object);
    if (cache && 'isQrCodeData' in cache) {
      return cache.isQrCodeData;
    }
  }
  
  const obj = value as Record<string, unknown>;
  
  // Basic structure validation
  const isValid = (
    obj.type !== undefined &&
    typeof obj.type === 'string' &&
    obj.id !== undefined &&
    typeof obj.id === 'string' &&
    obj.timestamp !== undefined &&
    (typeof obj.timestamp === 'number' || typeof obj.timestamp === 'string')
  );
  
  // Cache the result
  if (!validationCache.has(value as object)) {
    validationCache.set(value as object, {});
  }
  validationCache.get(value as object)!.isQrCodeData = isValid;
  
  return isValid;
}

/**
 * Validates that an unknown value is a valid CustomerQrCodeData object
 * @param value The value to validate
 * @returns A type guard indicating if the value is a valid CustomerQrCodeData
 */
export function isCustomerQrCodeData(value: unknown): value is CustomerQrCodeData {
  if (!isQrCodeData(value)) return false;
  
  // Check cache first for performance
  if (validationCache.has(value as object)) {
    const cache = validationCache.get(value as object);
    if (cache && 'isCustomerQrCodeData' in cache) {
      return cache.isCustomerQrCodeData;
    }
  }
  
  const obj = value as any;
  
  // Specific validation for CustomerQrCodeData
  const isValid = (
    obj.type === 'customer' &&
    obj.customerId !== undefined &&
    typeof obj.customerId === 'string' &&
    obj.businessId !== undefined &&
    typeof obj.businessId === 'string'
  );
  
  // Cache the result
  validationCache.get(value as object)!.isCustomerQrCodeData = isValid;
  
  return isValid;
}

/**
 * Validates that an unknown value is a valid LoyaltyCardQrCodeData object
 * @param value The value to validate
 * @returns A type guard indicating if the value is a valid LoyaltyCardQrCodeData
 */
export function isLoyaltyCardQrCodeData(value: unknown): value is LoyaltyCardQrCodeData {
  if (!isQrCodeData(value)) return false;
  
  // Check cache first for performance
  if (validationCache.has(value as object)) {
    const cache = validationCache.get(value as object);
    if (cache && 'isLoyaltyCardQrCodeData' in cache) {
      return cache.isLoyaltyCardQrCodeData;
    }
  }
  
  const obj = value as any;
  
  // Specific validation for LoyaltyCardQrCodeData
  const isValid = (
    obj.type === 'loyaltyCard' &&
    obj.cardId !== undefined &&
    typeof obj.cardId === 'string' &&
    obj.programId !== undefined &&
    typeof obj.programId === 'string' &&
    obj.customerId !== undefined &&
    typeof obj.customerId === 'string'
  );
  
  // Cache the result
  validationCache.get(value as object)!.isLoyaltyCardQrCodeData = isValid;
  
  return isValid;
}

/**
 * Validates that an unknown value is a valid PromoCodeQrCodeData object
 * @param value The value to validate
 * @returns A type guard indicating if the value is a valid PromoCodeQrCodeData
 */
export function isPromoCodeQrCodeData(value: unknown): value is PromoCodeQrCodeData {
  if (!isQrCodeData(value)) return false;
  
  // Check cache first for performance
  if (validationCache.has(value as object)) {
    const cache = validationCache.get(value as object);
    if (cache && 'isPromoCodeQrCodeData' in cache) {
      return cache.isPromoCodeQrCodeData;
    }
  }
  
  const obj = value as any;
  
  // Specific validation for PromoCodeQrCodeData
  const isValid = (
    obj.type === 'promoCode' &&
    obj.promoId !== undefined &&
    typeof obj.promoId === 'string' &&
    obj.businessId !== undefined &&
    typeof obj.businessId === 'string' &&
    obj.expiryDate !== undefined &&
    (typeof obj.expiryDate === 'number' || typeof obj.expiryDate === 'string')
  );
  
  // Cache the result
  validationCache.get(value as object)!.isPromoCodeQrCodeData = isValid;
  
  return isValid;
}

/**
 * Validates QR code data and returns the appropriate type
 * @param data The data to validate
 * @returns The validated data with its specific type, or null if invalid
 */
export function validateQrCodeData(data: unknown): QrCodeData | null {
  try {
    // Basic format validation
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    // Handle customer type specially with relaxed validation
    if (typeof data === 'object' && data !== null && 'type' in data) {
      const typeValue = (data as any).type;
      
      // Special handling for customer type with flexible validation
      if (typeof typeValue === 'string' && 
          (typeValue.toLowerCase().includes('customer') || 
           typeValue === 'customer' || 
           typeValue === 'CUSTOMER' || 
           typeValue === 'customer_card' || 
           typeValue === 'CUSTOMER_CARD')) {
        
        // Check for customerId (or id as fallback)
        const customerId = (data as any).customerId || (data as any).id;
        
        if (customerId) {
          // Construct a valid CustomerQrCodeData object
          return {
            type: 'customer',
            customerId: String(customerId),
            name: (data as any).name || (data as any).customerName || '',
            email: (data as any).email || '',
            businessId: (data as any).businessId,
            timestamp: (data as any).timestamp || Date.now(),
            signature: (data as any).signature,
            text: JSON.stringify(data)
          };
        }
      }
    }
    
    // Standard validation path for other types
    if (!isQrCodeData(data)) {
      return null;
    }
    
    // Check specific QR code types
    if (isCustomerQrCodeData(data)) {
      return data;
    }
    
    if (isLoyaltyCardQrCodeData(data)) {
      return data;
    }
    
    if (isPromoCodeQrCodeData(data)) {
      return data;
    }
    
    // It's a valid QrCodeData but not a specific subtype we recognize
    return data;
  } catch (error) {
    console.error('Error validating QR code data:', error);
    return null;
  }
}

/**
 * Type guard for API response validation with performance optimization
 * @param response The API response to validate
 * @param schema The expected schema of the response
 * @returns A boolean indicating if the response matches the expected schema
 */
export function validateApiResponse<T extends Record<string, unknown>>(
  response: unknown, 
  schema: Record<string, string>
): response is T {
  if (!response || typeof response !== 'object') return false;
  
  // Check cache first for performance
  const cacheKey = JSON.stringify(schema);
  if (validationCache.has(response as object)) {
    const cache = validationCache.get(response as object);
    if (cache && cacheKey in cache) {
      return cache[cacheKey];
    }
  }
  
  const obj = response as Record<string, unknown>;
  
  // Validate each field against the schema
  let isValid = true;
  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in obj)) {
      isValid = false;
      break;
    }
    
    const value = obj[key];
    
    // Check type
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') isValid = false;
        break;
      case 'number':
        if (typeof value !== 'number') isValid = false;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') isValid = false;
        break;
      case 'object':
        if (typeof value !== 'object' || value === null) isValid = false;
        break;
      case 'array':
        if (!Array.isArray(value)) isValid = false;
        break;
      default:
        // For custom types, we just check existence
        break;
    }
    
    if (!isValid) break;
  }
  
  // Cache the result
  if (!validationCache.has(response as object)) {
    validationCache.set(response as object, {});
  }
  validationCache.get(response as object)![cacheKey] = isValid;
  
  return isValid;
}

/**
 * Safely parse and validate JSON data
 * @param jsonString The JSON string to parse
 * @returns The parsed object or null if invalid
 */
export function safeParseJson(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

/**
 * Creates a validation error with structured information
 * @param message Error message
 * @param expected Expected type
 * @param received Actual value received
 * @param path Path to the error in the object
 * @returns A structured validation error
 */
export function createValidationError(
  message: string,
  expected: string,
  received: unknown,
  path: string = ''
): Error {
  const error = new Error(message);
  (error as any).validation = {
    expected,
    received: typeof received,
    receivedValue: received,
    path
  };
  return error;
}

/**
 * Validates input data with graceful degradation
 * @param data The data to validate
 * @param validator The validation function
 * @param fallback Optional fallback value if validation fails
 * @returns The validated data or fallback value
 */
export function validateWithFallback<T, F = null>(
  data: unknown, 
  validator: (value: unknown) => value is T,
  fallback: F = null as unknown as F
): T | F {
  try {
    return validator(data) ? data : fallback;
  } catch (error) {
    console.error('Validation error with fallback:', error);
    return fallback;
  }
}

/**
 * Performance-optimized type check that avoids unnecessary deep validation
 * for hot paths in the code
 * @param value The value to check
 * @param expectedType The expected type
 * @returns A boolean indicating if the value matches the expected type
 */
export function fastTypeCheck(value: unknown, expectedType: string): boolean {
  // Quick check for primitives
  if (expectedType === 'string') return typeof value === 'string';
  if (expectedType === 'number') return typeof value === 'number';
  if (expectedType === 'boolean') return typeof value === 'boolean';
  if (expectedType === 'undefined') return value === undefined;
  if (expectedType === 'null') return value === null;
  
  // Check for arrays
  if (expectedType === 'array') return Array.isArray(value);
  
  // Check for objects
  if (expectedType === 'object') {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  
  // For more complex types, we do a basic existence check
  return value !== undefined && value !== null;
}

/**
 * Monitor type violations and report them
 * @param context The context where validation is happening
 * @param isValid Whether the validation succeeded
 * @param data The data being validated
 * @param expectedType The expected type
 */
export function monitorTypeViolation(
  context: string,
  isValid: boolean,
  data: unknown,
  expectedType: string
): void {
  if (!isValid) {
    // Log the violation
    console.error(`Type violation in ${context}:`, {
      expected: expectedType,
      received: typeof data,
      data: JSON.stringify(data).substring(0, 100) + (JSON.stringify(data).length > 100 ? '...' : '')
    });
    
    // In a production system, you might want to send this to an error tracking service
    // sendToErrorTrackingService({
    //   type: 'type_violation',
    //   context,
    //   expected: expectedType,
    //   received: typeof data
    // });
  }
}

/**
 * Validate data at API boundaries
 * @param endpoint The API endpoint
 * @param data The data to validate
 * @param schema The expected schema
 * @returns A boolean indicating if the data is valid
 */
export function validateApiData(
  endpoint: string,
  data: unknown,
  schema: Record<string, string>
): boolean {
  const isValid = validateApiResponse(data, schema);
  
  // Monitor violations
  monitorTypeViolation(`API ${endpoint}`, isValid, data, JSON.stringify(schema));
  
  return isValid;
} 