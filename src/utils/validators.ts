/**
 * Utility functions for data validation and formatting
 */

/**
 * Format points value to avoid floating point errors
 * @param points Points value to format
 * @returns Formatted points value (2 decimal places)
 */
export const formatPoints = (points: number): number => {
  return Math.round(points * 100) / 100;
};

/**
 * Validates card data structure
 * @param cardData Card data to validate
 * @returns Whether the card data is valid
 */
export const validateCardData = (cardData: any): boolean => {
  if (!cardData) return false;
  
  // Check required fields
  const requiredFields = ['customerId', 'programId', 'businessId'];
  for (const field of requiredFields) {
    if (!cardData[field]) {
      return false;
    }
  }
  
  return true;
};

/**
 * Validates a card enrollment application
 * @param applicationData Card enrollment application data
 * @returns Whether the application is valid
 */
export const validateCardApplication = (applicationData: any): boolean => {
  if (!applicationData) return false;
  
  // Check required fields
  const requiredFields = ['customerId', 'programId', 'businessId', 'status'];
  for (const field of requiredFields) {
    if (applicationData[field] === undefined || applicationData[field] === null) {
      return false;
    }
  }
  
  // Validate status is one of the accepted values
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
  if (!validStatuses.includes(applicationData.status)) {
    return false;
  }
  
  return true;
};

/**
 * Validate a QR code data structure
 * @param qrData QR code data to validate
 * @returns Whether the QR code data is valid
 */
export const validateQrData = (qrData: any): boolean => {
  if (!qrData) return false;
  
  // Validate basic structure based on QR type
  if (qrData.type === 'customer') {
    return !!qrData.customerId;
  } else if (qrData.type === 'loyaltyCard') {
    return !!qrData.cardId && !!qrData.customerId && !!qrData.programId;
  } else if (qrData.type === 'promotion') {
    return !!qrData.promoId && !!qrData.businessId;
  }
  
  return false;
};

/**
 * Ensure value is a valid number
 * @param value Value to check
 * @param defaultValue Default value if invalid
 * @returns Valid number or default value
 */
export const ensureNumber = (value: any, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Ensure value is a valid string ID
 * @param id ID to ensure
 * @returns String ID
 */
export const ensureId = (id: string | number | undefined | null): string => {
  if (id === undefined || id === null) return '';
  return String(id);
};

/**
 * Validate an email address
 * @param email Email to validate
 * @returns Whether the email is valid
 */
export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate a phone number
 * @param phone Phone number to validate
 * @returns Whether the phone number is valid
 */
export const validatePhone = (phone: string): boolean => {
  // Simple validation - at least 10 digits
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}; 