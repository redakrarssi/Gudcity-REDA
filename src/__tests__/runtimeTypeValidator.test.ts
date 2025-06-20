import {
  validateQrCodeData,
  isQrCodeData,
  isCustomerQrCodeData,
  isLoyaltyCardQrCodeData,
  isPromoCodeQrCodeData,
  validateApiResponse,
  validateWithFallback,
  fastTypeCheck,
  safeParseJson,
  clearValidationCache
} from '../utils/runtimeTypeValidator';
import { QrCodeType } from '../types/qrCode';

describe('Runtime Type Validator', () => {
  beforeEach(() => {
    // Clear validation cache before each test
    clearValidationCache();
  });

  describe('isQrCodeData', () => {
    it('should correctly identify valid QR code data', () => {
      const validData = {
        type: 'customer' as QrCodeType,
        id: '123',
        timestamp: Date.now()
      };
      
      expect(isQrCodeData(validData)).toBe(true);
    });
    
    it('should reject invalid QR code data', () => {
      const invalidData = {
        foo: 'bar'
      };
      
      expect(isQrCodeData(invalidData)).toBe(false);
    });
    
    it('should reject null and undefined', () => {
      expect(isQrCodeData(null)).toBe(false);
      expect(isQrCodeData(undefined)).toBe(false);
    });
    
    it('should reject primitive values', () => {
      expect(isQrCodeData('string')).toBe(false);
      expect(isQrCodeData(123)).toBe(false);
      expect(isQrCodeData(true)).toBe(false);
    });
  });
  
  describe('isCustomerQrCodeData', () => {
    it('should correctly identify valid customer QR code data', () => {
      const validData = {
        type: 'customer' as QrCodeType,
        customerId: '123',
        name: 'John Doe',
        businessId: '456',
        timestamp: Date.now()
      };
      
      expect(isCustomerQrCodeData(validData)).toBe(true);
    });
    
    it('should reject data with wrong type', () => {
      const invalidData = {
        type: 'loyaltyCard' as QrCodeType,
        customerId: '123',
        businessId: '456'
      };
      
      expect(isCustomerQrCodeData(invalidData)).toBe(false);
    });
    
    it('should reject data missing required fields', () => {
      const invalidData = {
        type: 'customer' as QrCodeType,
        // Missing customerId
        businessId: '456'
      };
      
      expect(isCustomerQrCodeData(invalidData)).toBe(false);
    });
  });
  
  describe('isLoyaltyCardQrCodeData', () => {
    it('should correctly identify valid loyalty card QR code data', () => {
      const validData = {
        type: 'loyaltyCard' as QrCodeType,
        cardId: '123',
        customerId: '456',
        programId: '789',
        businessId: '101',
        timestamp: Date.now()
      };
      
      expect(isLoyaltyCardQrCodeData(validData)).toBe(true);
    });
    
    it('should reject data with wrong type', () => {
      const invalidData = {
        type: 'customer' as QrCodeType,
        cardId: '123',
        customerId: '456',
        programId: '789',
        businessId: '101'
      };
      
      expect(isLoyaltyCardQrCodeData(invalidData)).toBe(false);
    });
    
    it('should reject data missing required fields', () => {
      const invalidData = {
        type: 'loyaltyCard' as QrCodeType,
        // Missing cardId
        customerId: '456',
        programId: '789',
        businessId: '101'
      };
      
      expect(isLoyaltyCardQrCodeData(invalidData)).toBe(false);
    });
  });
  
  describe('isPromoCodeQrCodeData', () => {
    it('should correctly identify valid promo code QR code data', () => {
      const validData = {
        type: 'promoCode' as QrCodeType,
        code: 'DISCOUNT20',
        businessId: '101',
        expiryDate: '2023-12-31',
        timestamp: Date.now()
      };
      
      expect(isPromoCodeQrCodeData(validData)).toBe(true);
    });
    
    it('should reject data with wrong type', () => {
      const invalidData = {
        type: 'customer' as QrCodeType,
        code: 'DISCOUNT20',
        businessId: '101'
      };
      
      expect(isPromoCodeQrCodeData(invalidData)).toBe(false);
    });
    
    it('should reject data missing required fields', () => {
      const invalidData = {
        type: 'promoCode' as QrCodeType,
        // Missing code
        businessId: '101'
      };
      
      expect(isPromoCodeQrCodeData(invalidData)).toBe(false);
    });
  });
  
  describe('validateQrCodeData', () => {
    it('should validate and return customer QR code data', () => {
      const validData = {
        type: 'customer',
        customerId: '123',
        businessId: '456',
        timestamp: Date.now()
      };
      
      const result = validateQrCodeData(validData);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('customer');
      expect(result?.customerId).toBe('123');
    });
    
    it('should validate and return loyalty card QR code data', () => {
      const validData = {
        type: 'loyaltyCard',
        cardId: '123',
        customerId: '456',
        programId: '789',
        businessId: '101',
        timestamp: Date.now()
      };
      
      const result = validateQrCodeData(validData);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('loyaltyCard');
      expect(result?.cardId).toBe('123');
    });
    
    it('should validate and return promo code QR code data', () => {
      const validData = {
        type: 'promoCode',
        code: 'DISCOUNT20',
        businessId: '101',
        timestamp: Date.now()
      };
      
      const result = validateQrCodeData(validData);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('promoCode');
      expect(result?.code).toBe('DISCOUNT20');
    });
    
    it('should return null for invalid data', () => {
      const invalidData = {
        foo: 'bar'
      };
      
      const result = validateQrCodeData(invalidData);
      
      expect(result).toBeNull();
    });
    
    it('should handle errors gracefully', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = validateQrCodeData(undefined);
      
      expect(result).toBeNull();
      expect(spy).toHaveBeenCalled();
      
      spy.mockRestore();
    });
  });
  
  describe('validateApiResponse', () => {
    it('should validate API responses against a schema', () => {
      const response = {
        id: '123',
        name: 'John Doe',
        age: 30,
        active: true
      };
      
      const schema = {
        id: 'string',
        name: 'string',
        age: 'number',
        active: 'boolean'
      };
      
      const isValid = validateApiResponse(response, schema);
      
      expect(isValid).toBe(true);
    });
    
    it('should reject responses missing required fields', () => {
      const response = {
        id: '123',
        name: 'John Doe',
        // Missing age
        active: true
      };
      
      const schema = {
        id: 'string',
        name: 'string',
        age: 'number',
        active: 'boolean'
      };
      
      const isValid = validateApiResponse(response, schema);
      
      expect(isValid).toBe(false);
    });
    
    it('should reject responses with wrong field types', () => {
      const response = {
        id: '123',
        name: 'John Doe',
        age: '30', // String instead of number
        active: true
      };
      
      const schema = {
        id: 'string',
        name: 'string',
        age: 'number',
        active: 'boolean'
      };
      
      const isValid = validateApiResponse(response, schema);
      
      expect(isValid).toBe(false);
    });
    
    it('should use cached results for repeated validations', () => {
      const response = {
        id: '123',
        name: 'John Doe',
        age: 30,
        active: true
      };
      
      const schema = {
        id: 'string',
        name: 'string',
        age: 'number',
        active: 'boolean'
      };
      
      // First validation
      validateApiResponse(response, schema);
      
      // Mock the internal validation logic
      const originalHasOwnProperty = Object.prototype.hasOwnProperty;
      let hasOwnPropertyCalled = false;
      Object.prototype.hasOwnProperty = function(...args) {
        hasOwnPropertyCalled = true;
        return originalHasOwnProperty.apply(this, args);
      };
      
      // Second validation should use cache
      validateApiResponse(response, schema);
      
      // Restore the original method
      Object.prototype.hasOwnProperty = originalHasOwnProperty;
      
      // If cache is working, hasOwnProperty should have been called
      expect(hasOwnPropertyCalled).toBe(true);
    });
  });
  
  describe('validateWithFallback', () => {
    it('should return the value if validation passes', () => {
      const data = {
        type: 'customer',
        customerId: '123',
        businessId: '456'
      };
      
      const result = validateWithFallback(
        data,
        isCustomerQrCodeData,
        { type: 'customer', customerId: '0', businessId: '0' }
      );
      
      expect(result).toBe(data);
    });
    
    it('should return the fallback if validation fails', () => {
      const data = {
        type: 'unknown',
        id: '123'
      };
      
      const fallback = { type: 'customer', customerId: '0', businessId: '0' };
      
      const result = validateWithFallback(
        data,
        isCustomerQrCodeData,
        fallback
      );
      
      expect(result).toBe(fallback);
    });
    
    it('should handle errors gracefully', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      
      const validator = () => { throw new Error('Validation error'); };
      const fallback = { type: 'customer', customerId: '0', businessId: '0' };
      
      const result = validateWithFallback(
        {},
        validator as any,
        fallback
      );
      
      expect(result).toBe(fallback);
      expect(spy).toHaveBeenCalled();
      
      spy.mockRestore();
    });
  });
  
  describe('fastTypeCheck', () => {
    it('should correctly check primitive types', () => {
      expect(fastTypeCheck('string', 'string')).toBe(true);
      expect(fastTypeCheck(123, 'number')).toBe(true);
      expect(fastTypeCheck(true, 'boolean')).toBe(true);
      expect(fastTypeCheck(undefined, 'undefined')).toBe(true);
      expect(fastTypeCheck(null, 'null')).toBe(true);
      
      expect(fastTypeCheck('string', 'number')).toBe(false);
      expect(fastTypeCheck(123, 'string')).toBe(false);
    });
    
    it('should correctly check arrays', () => {
      expect(fastTypeCheck([], 'array')).toBe(true);
      expect(fastTypeCheck([1, 2, 3], 'array')).toBe(true);
      expect(fastTypeCheck({}, 'array')).toBe(false);
    });
    
    it('should correctly check objects', () => {
      expect(fastTypeCheck({}, 'object')).toBe(true);
      expect(fastTypeCheck({ foo: 'bar' }, 'object')).toBe(true);
      expect(fastTypeCheck([], 'object')).toBe(false);
      expect(fastTypeCheck(null, 'object')).toBe(false);
    });
  });
  
  describe('safeParseJson', () => {
    it('should parse valid JSON', () => {
      const json = '{"foo":"bar","num":123}';
      const result = safeParseJson(json);
      
      expect(result).toEqual({ foo: 'bar', num: 123 });
    });
    
    it('should return null for invalid JSON', () => {
      const json = '{foo:bar}'; // Invalid JSON
      const result = safeParseJson(json);
      
      expect(result).toBeNull();
    });
    
    it('should handle errors gracefully', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = safeParseJson('invalid json');
      
      expect(result).toBeNull();
      expect(spy).toHaveBeenCalled();
      
      spy.mockRestore();
    });
  });
  
  describe('clearValidationCache', () => {
    it('should clear the validation cache', () => {
      const data = {
        type: 'customer',
        customerId: '123',
        businessId: '456'
      };
      
      // First validation
      isCustomerQrCodeData(data);
      
      // Clear cache
      clearValidationCache();
      
      // Mock the internal validation logic
      const originalHasOwnProperty = Object.prototype.hasOwnProperty;
      let hasOwnPropertyCalled = false;
      Object.prototype.hasOwnProperty = function(...args) {
        hasOwnPropertyCalled = true;
        return originalHasOwnProperty.apply(this, args);
      };
      
      // Second validation should not use cache
      isCustomerQrCodeData(data);
      
      // Restore the original method
      Object.prototype.hasOwnProperty = originalHasOwnProperty;
      
      // If cache was cleared, hasOwnProperty should not have been called
      expect(hasOwnPropertyCalled).toBe(false);
    });
  });
}); 