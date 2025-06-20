/**
 * QR Code Validator
 * 
 * Provides comprehensive validation for all QR code types
 * with consistent error handling and standardized messages.
 */
import { 
  QrCodeType, 
  QrCodeData, 
  CustomerQrCodeData, 
  LoyaltyCardQrCodeData, 
  PromoCodeQrCodeData, 
  UnknownQrCodeData,
  isCustomerQrCodeData,
  isLoyaltyCardQrCodeData,
  isPromoCodeQrCodeData
} from '../types/qrCode';
import { QrValidationError } from './qrCodeErrorHandler';

/**
 * Schema definitions for different QR code types
 */
const schemas = {
  // Common required fields for all QR codes
  common: ['type', 'timestamp'],
  
  // Type-specific required fields
  customer: ['customerId'],
  loyaltyCard: ['customerId', 'programId', 'cardId', 'businessId'],
  promoCode: ['code', 'businessId'],
  
  // Type-specific optional fields
  customer_optional: ['name', 'email', 'businessId'],
  loyaltyCard_optional: ['points'],
  promoCode_optional: ['discount', 'expiryDate']
};

/**
 * Validates QR code data against the required schema
 * 
 * @param data The QR code data to validate
 * @returns Validated and normalized QR code data
 * @throws QrValidationError if validation fails
 */
export function validateQrCodeData(data: unknown): QrCodeData {
  // Ensure data is not null or undefined
  if (!data) {
    throw new QrValidationError('QR code data is missing', { data });
  }
  
  // Parse string data if necessary
  let parsedData: unknown;
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
  
  // Check if data has a type property
  if (!('type' in parsedData)) {
    throw new QrValidationError('QR code data must have a type property', {
      data: parsedData
    });
  }
  
  // Get the type
  const qrType = (parsedData as { type: unknown }).type;
  
  // Validate type is a valid QrCodeType
  if (!isValidQrCodeType(qrType)) {
    throw new QrValidationError(`Invalid QR code type: ${String(qrType)}`, {
      data: parsedData,
      invalidType: qrType
    });
  }
  
  // Type-specific validations
  switch (qrType) {
    case 'customer':
      return validateCustomerCard(parsedData);
    case 'loyaltyCard':
      return validateLoyaltyCard(parsedData);
    case 'promoCode':
      return validatePromoCode(parsedData);
    default:
      return validateUnknownData(parsedData);
  }
}

/**
 * Check if a value is a valid QrCodeType
 */
function isValidQrCodeType(type: unknown): type is QrCodeType {
  return typeof type === 'string' && 
    ['customer', 'loyaltyCard', 'promoCode', 'unknown'].includes(type);
}

/**
 * Validate customer card data
 * @param data The data to validate
 * @returns Validated CustomerQrCodeData
 * @throws QrValidationError if validation fails
 */
function validateCustomerCard(data: unknown): CustomerQrCodeData {
  // Check if data is already a valid CustomerQrCodeData
  if (isCustomerQrCodeData(data)) {
    return data;
  }
  
  // If we got here, the data needs further validation
  if (typeof data !== 'object' || data === null) {
    throw new QrValidationError('Customer card data must be an object', { data });
  }
  
  // Check required fields
  const requiredFields = schemas.customer;
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new QrValidationError(`Required field missing for customer: ${field}`, {
        data,
        missingField: field
      });
    }
  }
  
  // Cast to a partial CustomerQrCodeData to check properties
  const partialData = data as Partial<CustomerQrCodeData>;
  
  // Validate customerId
  if (typeof partialData.customerId !== 'string' && typeof partialData.customerId !== 'number') {
    throw new QrValidationError('Customer ID must be a string or number', {
      data,
      customerId: partialData.customerId,
      customerIdType: typeof partialData.customerId
    });
  }
  
  // Validate name if present
  if (partialData.name !== undefined && typeof partialData.name !== 'string') {
    throw new QrValidationError('Customer name must be a string', {
      data,
      name: partialData.name,
      nameType: typeof partialData.name
    });
  }
  
  // Validate email if present
  if (partialData.email !== undefined && typeof partialData.email !== 'string') {
    throw new QrValidationError('Customer email must be a string', {
      data,
      email: partialData.email,
      emailType: typeof partialData.email
    });
  }
  
  // Validate businessId if present
  if (partialData.businessId !== undefined && 
      typeof partialData.businessId !== 'string' && 
      typeof partialData.businessId !== 'number') {
    throw new QrValidationError('Business ID must be a string or number', {
      data,
      businessId: partialData.businessId,
      businessIdType: typeof partialData.businessId
    });
  }
  
  // Construct a valid CustomerQrCodeData
  return {
    type: 'customer',
    customerId: partialData.customerId!,
    name: partialData.name,
    email: partialData.email,
    businessId: partialData.businessId,
    timestamp: partialData.timestamp || Date.now(),
    signature: partialData.signature
  };
}

/**
 * Validate loyalty card data
 * @param data The data to validate
 * @returns Validated LoyaltyCardQrCodeData
 * @throws QrValidationError if validation fails
 */
function validateLoyaltyCard(data: unknown): LoyaltyCardQrCodeData {
  // Check if data is already a valid LoyaltyCardQrCodeData
  if (isLoyaltyCardQrCodeData(data)) {
    return data;
  }
  
  // If we got here, the data needs further validation
  if (typeof data !== 'object' || data === null) {
    throw new QrValidationError('Loyalty card data must be an object', { data });
  }
  
  // Check required fields
  const requiredFields = schemas.loyaltyCard;
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new QrValidationError(`Required field missing for loyalty card: ${field}`, {
        data,
        missingField: field
      });
    }
  }
  
  // Cast to a partial LoyaltyCardQrCodeData to check properties
  const partialData = data as Partial<LoyaltyCardQrCodeData>;
  
  // Validate customerId
  if (typeof partialData.customerId !== 'string' && typeof partialData.customerId !== 'number') {
    throw new QrValidationError('Customer ID must be a string or number', {
      data,
      customerId: partialData.customerId,
      customerIdType: typeof partialData.customerId
    });
  }
  
  // Validate programId
  if (typeof partialData.programId !== 'string' && typeof partialData.programId !== 'number') {
    throw new QrValidationError('Program ID must be a string or number', {
      data,
      programId: partialData.programId,
      programIdType: typeof partialData.programId
    });
  }
  
  // Validate cardId
  if (typeof partialData.cardId !== 'string' && typeof partialData.cardId !== 'number') {
    throw new QrValidationError('Card ID must be a string or number', {
      data,
      cardId: partialData.cardId,
      cardIdType: typeof partialData.cardId
    });
  }
  
  // Validate businessId
  if (typeof partialData.businessId !== 'string' && typeof partialData.businessId !== 'number') {
    throw new QrValidationError('Business ID must be a string or number', {
      data,
      businessId: partialData.businessId,
      businessIdType: typeof partialData.businessId
    });
  }
  
  // Validate points if present
  if (partialData.points !== undefined && typeof partialData.points !== 'number') {
    throw new QrValidationError('Points must be a number', {
      data,
      points: partialData.points,
      pointsType: typeof partialData.points
    });
  }
  
  // Construct a valid LoyaltyCardQrCodeData
  return {
    type: 'loyaltyCard',
    cardId: partialData.cardId!,
    customerId: partialData.customerId!,
    programId: partialData.programId!,
    businessId: partialData.businessId!,
    points: partialData.points,
    timestamp: partialData.timestamp || Date.now(),
    signature: partialData.signature
  };
}

/**
 * Validate promo code data
 * @param data The data to validate
 * @returns Validated PromoCodeQrCodeData
 * @throws QrValidationError if validation fails
 */
function validatePromoCode(data: unknown): PromoCodeQrCodeData {
  // Check if data is already a valid PromoCodeQrCodeData
  if (isPromoCodeQrCodeData(data)) {
    return data;
  }
  
  // If we got here, the data needs further validation
  if (typeof data !== 'object' || data === null) {
    throw new QrValidationError('Promo code data must be an object', { data });
  }
  
  // Check required fields
  const requiredFields = schemas.promoCode;
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new QrValidationError(`Required field missing for promo code: ${field}`, {
        data,
        missingField: field
      });
    }
  }
  
  // Cast to a partial PromoCodeQrCodeData to check properties
  const partialData = data as Partial<PromoCodeQrCodeData>;
  
  // Validate code
  if (typeof partialData.code !== 'string') {
    throw new QrValidationError('Promo code must be a string', {
      data,
      code: partialData.code,
      codeType: typeof partialData.code
    });
  }
  
  // Validate businessId
  if (typeof partialData.businessId !== 'string' && typeof partialData.businessId !== 'number') {
    throw new QrValidationError('Business ID must be a string or number', {
      data,
      businessId: partialData.businessId,
      businessIdType: typeof partialData.businessId
    });
  }
  
  // Validate discount if present
  if (partialData.discount !== undefined && typeof partialData.discount !== 'number') {
    throw new QrValidationError('Discount must be a number', {
      data,
      discount: partialData.discount,
      discountType: typeof partialData.discount
    });
  }
  
  // Validate expiryDate if present
  if (partialData.expiryDate !== undefined && typeof partialData.expiryDate !== 'string') {
    throw new QrValidationError('Expiry date must be a string', {
      data,
      expiryDate: partialData.expiryDate,
      expiryDateType: typeof partialData.expiryDate
    });
  }
  
  // Construct a valid PromoCodeQrCodeData
  return {
    type: 'promoCode',
    code: partialData.code!,
    businessId: partialData.businessId!,
    discount: partialData.discount,
    expiryDate: partialData.expiryDate,
    timestamp: partialData.timestamp || Date.now(),
    signature: partialData.signature
  };
}

/**
 * Validate unknown data
 * @param data The data to validate
 * @returns Validated UnknownQrCodeData
 */
function validateUnknownData(data: unknown): UnknownQrCodeData {
  // Convert any data to UnknownQrCodeData
  const rawData = typeof data === 'string' ? data : JSON.stringify(data);
  
  return {
    type: 'unknown',
    rawData,
    timestamp: Date.now()
  };
}

/**
 * Validates a QR code safely, returning validation result instead of throwing
 * 
 * @param data The QR code data to validate
 * @returns Object with validation result and errors if any
 */
export function safeValidateQrCode(data: unknown): { 
  valid: boolean; 
  data?: QrCodeData; 
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
