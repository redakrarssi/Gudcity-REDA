/**
 * QR Code Validator
 * 
 * Provides comprehensive validation for all QR code types
 * with consistent error handling and standardized messages.
 */
import { StandardQrCodeData } from './standardQrCodeGenerator';
import { QrValidationError, QrErrorCategory } from './qrCodeErrorHandler';

/**
 * Schema definitions for different QR code types
 */
const schemas = {
  // Common required fields for all QR codes
  common: ['type', 'qrUniqueId', 'timestamp', 'version'],
  
  // Type-specific required fields
  CUSTOMER_CARD: ['customerId'],
  LOYALTY_CARD: ['customerId', 'programId', 'cardId', 'businessId'],
  PROMO_CODE: ['promoCode', 'businessId'],
  
  // Type-specific optional fields
  CUSTOMER_CARD_optional: ['customerName', 'businessId'],
  LOYALTY_CARD_optional: [],
  PROMO_CODE_optional: []
};

/**
 * Type guards for QR code data
 */
export function isStandardQrCodeData(data: any): data is StandardQrCodeData {
  return (
    data &&
    typeof data === 'object' &&
    (data.type === 'CUSTOMER_CARD' || 
     data.type === 'LOYALTY_CARD' || 
     data.type === 'PROMO_CODE') &&
    typeof data.qrUniqueId === 'string' &&
    typeof data.timestamp === 'number' &&
    typeof data.version === 'string'
  );
}

/**
 * Validates QR code data against the required schema
 * 
 * @param data The QR code data to validate
 * @returns Validated and normalized QR code data
 * @throws QrValidationError if validation fails
 */
export function validateQrCodeData(data: unknown): StandardQrCodeData {
  // Ensure data is not null or undefined
  if (!data) {
    throw new QrValidationError('QR code data is missing', { data });
  }
  
  // Parse string data if necessary
  let parsedData: any;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      throw new QrValidationError('QR code contains invalid JSON', { 
        data, 
        parseError: (error as Error).message 
      });
    }
  } else {
    parsedData = data;
  }
  
  // Validate data is an object
  if (typeof parsedData !== 'object' || parsedData === null) {
    throw new QrValidationError('QR code data must be an object', { 
      data: parsedData,
      dataType: typeof parsedData
    });
  }
  
  // Check common required fields
  for (const field of schemas.common) {
    if (parsedData[field] === undefined || parsedData[field] === null) {
      throw new QrValidationError(`Required field missing: ${field}`, {
        data: parsedData,
        missingField: field
      });
    }
  }
  
  // Validate type-specific fields
  const type = parsedData.type as string;
  if (!['CUSTOMER_CARD', 'LOYALTY_CARD', 'PROMO_CODE'].includes(type)) {
    throw new QrValidationError(`Invalid QR code type: ${type}`, {
      data: parsedData,
      invalidType: type
    });
  }
  
  // Check required fields for the specific type
  const requiredFields = schemas[type as keyof typeof schemas] || [];
  for (const field of requiredFields) {
    if (parsedData[field] === undefined || parsedData[field] === null) {
      throw new QrValidationError(`Required field missing for ${type}: ${field}`, {
        data: parsedData,
        qrType: type,
        missingField: field
      });
    }
  }
  
  // Type-specific validations
  switch (type) {
    case 'CUSTOMER_CARD':
      validateCustomerCard(parsedData);
      break;
    case 'LOYALTY_CARD':
      validateLoyaltyCard(parsedData);
      break;
    case 'PROMO_CODE':
      validatePromoCode(parsedData);
      break;
  }
  
  // Return validated data
  return parsedData as StandardQrCodeData;
}

/**
 * Validate customer card specific fields
 */
function validateCustomerCard(data: any): void {
  // Validate customerId
  if (typeof data.customerId !== 'string' && typeof data.customerId !== 'number') {
    throw new QrValidationError('Customer ID must be a string or number', {
      data,
      customerId: data.customerId,
      customerIdType: typeof data.customerId
    });
  }
  
  // Validate optional fields if present
  if (data.customerName !== undefined && typeof data.customerName !== 'string') {
    throw new QrValidationError('Customer name must be a string', {
      data,
      customerName: data.customerName,
      customerNameType: typeof data.customerName
    });
  }
  
  if (data.businessId !== undefined && 
      typeof data.businessId !== 'string' && 
      typeof data.businessId !== 'number') {
    throw new QrValidationError('Business ID must be a string or number', {
      data,
      businessId: data.businessId,
      businessIdType: typeof data.businessId
    });
  }
}

/**
 * Validate loyalty card specific fields
 */
function validateLoyaltyCard(data: any): void {
  // Validate customerId
  if (typeof data.customerId !== 'string' && typeof data.customerId !== 'number') {
    throw new QrValidationError('Customer ID must be a string or number', {
      data,
      customerId: data.customerId,
      customerIdType: typeof data.customerId
    });
  }
  
  // Validate programId
  if (typeof data.programId !== 'string' && typeof data.programId !== 'number') {
    throw new QrValidationError('Program ID must be a string or number', {
      data,
      programId: data.programId,
      programIdType: typeof data.programId
    });
  }
  
  // Validate cardId
  if (typeof data.cardId !== 'string' && typeof data.cardId !== 'number') {
    throw new QrValidationError('Card ID must be a string or number', {
      data,
      cardId: data.cardId,
      cardIdType: typeof data.cardId
    });
  }
  
  // Validate businessId
  if (typeof data.businessId !== 'string' && typeof data.businessId !== 'number') {
    throw new QrValidationError('Business ID must be a string or number', {
      data,
      businessId: data.businessId,
      businessIdType: typeof data.businessId
    });
  }
}

/**
 * Validate promo code specific fields
 */
function validatePromoCode(data: any): void {
  // Validate promoCode
  if (typeof data.promoCode !== 'string') {
    throw new QrValidationError('Promo code must be a string', {
      data,
      promoCode: data.promoCode,
      promoCodeType: typeof data.promoCode
    });
  }
  
  // Validate businessId
  if (typeof data.businessId !== 'string' && typeof data.businessId !== 'number') {
    throw new QrValidationError('Business ID must be a string or number', {
      data,
      businessId: data.businessId,
      businessIdType: typeof data.businessId
    });
  }
}

/**
 * Validates a QR code safely, returning validation result instead of throwing
 * 
 * @param data The QR code data to validate
 * @returns Object with validation result and errors if any
 */
export function safeValidateQrCode(data: unknown): { 
  valid: boolean; 
  data?: StandardQrCodeData; 
  error?: QrValidationError;
} {
  try {
    const validatedData = validateQrCodeData(data);
    return { valid: true, data: validatedData };
  } catch (error) {
    if (error instanceof QrValidationError) {
      return { valid: false, error };
    }
    // Convert other errors to QrValidationError
    return { 
      valid: false, 
      error: new QrValidationError(
        (error instanceof Error) ? error.message : 'Unknown validation error',
        { originalError: error }
      ) 
    };
  }
}
