import {
  QrCodeType,
  CustomerQrCodeData,
  LoyaltyCardQrCodeData,
  PromoCodeQrCodeData,
  UnknownQrCodeData,
  isCustomerQrCodeData,
  isLoyaltyCardQrCodeData,
  isPromoCodeQrCodeData,
  isQrCodeData,
  ensureId
} from '../types/qrCode';

describe('QR Code Type System', () => {
  describe('Type Guards', () => {
    test('isCustomerQrCodeData correctly identifies customer QR code data', () => {
      const validCustomerData: CustomerQrCodeData = {
        type: 'customer',
        customerId: '12345',
        timestamp: Date.now()
      };
      
      const invalidData1 = { type: 'customer' };
      const invalidData2 = { customerId: '12345' };
      const invalidData3 = { type: 'loyaltyCard', customerId: '12345' };
      
      expect(isCustomerQrCodeData(validCustomerData)).toBe(true);
      expect(isCustomerQrCodeData(invalidData1)).toBe(false);
      expect(isCustomerQrCodeData(invalidData2)).toBe(false);
      expect(isCustomerQrCodeData(invalidData3)).toBe(false);
      expect(isCustomerQrCodeData(null)).toBe(false);
      expect(isCustomerQrCodeData(undefined)).toBe(false);
    });
    
    test('isLoyaltyCardQrCodeData correctly identifies loyalty card QR code data', () => {
      const validLoyaltyCardData: LoyaltyCardQrCodeData = {
        type: 'loyaltyCard',
        cardId: '7890',
        customerId: '12345',
        programId: '456',
        businessId: '789',
        timestamp: Date.now()
      };
      
      const invalidData1 = { type: 'loyaltyCard' };
      const invalidData2 = { cardId: '7890' };
      const invalidData3 = { type: 'customer', cardId: '7890' };
      
      expect(isLoyaltyCardQrCodeData(validLoyaltyCardData)).toBe(true);
      expect(isLoyaltyCardQrCodeData(invalidData1)).toBe(false);
      expect(isLoyaltyCardQrCodeData(invalidData2)).toBe(false);
      expect(isLoyaltyCardQrCodeData(invalidData3)).toBe(false);
      expect(isLoyaltyCardQrCodeData(null)).toBe(false);
      expect(isLoyaltyCardQrCodeData(undefined)).toBe(false);
    });
    
    test('isPromoCodeQrCodeData correctly identifies promo code QR code data', () => {
      const validPromoCodeData: PromoCodeQrCodeData = {
        type: 'promoCode',
        code: 'SUMMER25',
        businessId: '789',
        timestamp: Date.now()
      };
      
      const invalidData1 = { type: 'promoCode' };
      const invalidData2 = { code: 'SUMMER25' };
      const invalidData3 = { type: 'customer', code: 'SUMMER25' };
      
      expect(isPromoCodeQrCodeData(validPromoCodeData)).toBe(true);
      expect(isPromoCodeQrCodeData(invalidData1)).toBe(false);
      expect(isPromoCodeQrCodeData(invalidData2)).toBe(false);
      expect(isPromoCodeQrCodeData(invalidData3)).toBe(false);
      expect(isPromoCodeQrCodeData(null)).toBe(false);
      expect(isPromoCodeQrCodeData(undefined)).toBe(false);
    });
    
    test('isQrCodeData correctly identifies any valid QR code data', () => {
      const customerData: CustomerQrCodeData = {
        type: 'customer',
        customerId: '12345',
        timestamp: Date.now()
      };
      
      const loyaltyCardData: LoyaltyCardQrCodeData = {
        type: 'loyaltyCard',
        cardId: '7890',
        customerId: '12345',
        programId: '456',
        businessId: '789',
        timestamp: Date.now()
      };
      
      const promoCodeData: PromoCodeQrCodeData = {
        type: 'promoCode',
        code: 'SUMMER25',
        businessId: '789',
        timestamp: Date.now()
      };
      
      const unknownData: UnknownQrCodeData = {
        type: 'unknown',
        rawData: 'some-raw-data',
        timestamp: Date.now()
      };
      
      const invalidData = { foo: 'bar' };
      
      expect(isQrCodeData(customerData)).toBe(true);
      expect(isQrCodeData(loyaltyCardData)).toBe(true);
      expect(isQrCodeData(promoCodeData)).toBe(true);
      expect(isQrCodeData(unknownData)).toBe(true);
      expect(isQrCodeData(invalidData)).toBe(false);
      expect(isQrCodeData(null)).toBe(false);
      expect(isQrCodeData(undefined)).toBe(false);
    });
  });
  
  describe('Utility Functions', () => {
    test('ensureId handles various input types correctly', () => {
      expect(ensureId('12345')).toBe('12345');
      expect(ensureId(12345)).toBe('12345');
      expect(ensureId(null)).toBe('0');
      expect(ensureId(undefined)).toBe('0');
      expect(ensureId('')).toBe('');
    });
  });
  
  describe('Type Compatibility', () => {
    test('QR code types are compatible with the type system', () => {
      // This is a compile-time check, but we can verify runtime behavior
      const qrTypes: QrCodeType[] = ['customer', 'loyaltyCard', 'promoCode', 'unknown'];
      
      qrTypes.forEach(type => {
        expect(['customer', 'loyaltyCard', 'promoCode', 'unknown'].includes(type)).toBe(true);
      });
    });
    
    test('QR code data objects can be created with the correct shape', () => {
      const customerData: CustomerQrCodeData = {
        type: 'customer',
        customerId: '12345',
        name: 'John Doe',
        email: 'john@example.com',
        businessId: '789',
        timestamp: Date.now()
      };
      
      const loyaltyCardData: LoyaltyCardQrCodeData = {
        type: 'loyaltyCard',
        cardId: '7890',
        customerId: '12345',
        programId: '456',
        businessId: '789',
        points: 100,
        timestamp: Date.now()
      };
      
      const promoCodeData: PromoCodeQrCodeData = {
        type: 'promoCode',
        code: 'SUMMER25',
        businessId: '789',
        discount: 25,
        expiryDate: '2023-12-31',
        timestamp: Date.now()
      };
      
      const unknownData: UnknownQrCodeData = {
        type: 'unknown',
        rawData: 'some-raw-data',
        timestamp: Date.now()
      };
      
      // These assertions verify that the objects match their expected types
      expect(customerData.type).toBe('customer');
      expect(loyaltyCardData.type).toBe('loyaltyCard');
      expect(promoCodeData.type).toBe('promoCode');
      expect(unknownData.type).toBe('unknown');
      
      // Verify required fields
      expect(customerData.customerId).toBeDefined();
      expect(loyaltyCardData.cardId).toBeDefined();
      expect(promoCodeData.code).toBeDefined();
      expect(unknownData.rawData).toBeDefined();
    });
  });
}); 