// PII (Personally Identifiable Information) anonymization utilities
// Implements secure data anonymization following reda.md security guidelines
// Protects customer privacy while maintaining data utility

import crypto from 'crypto';

/**
 * Anonymize email addresses while preserving domain structure
 * @param email - Email address to anonymize
 * @param preserveDomain - Whether to preserve the domain (default: true)
 * @returns Anonymized email
 */
export function anonymizeEmail(email: string, preserveDomain: boolean = true): string {
  if (!email || !email.includes('@')) {
    return 'anonymous@example.com';
  }
  
  const [localPart, domain] = email.split('@');
  
  // Anonymize local part (before @)
  const anonymizedLocal = localPart.length <= 2 
    ? '***' 
    : localPart.charAt(0) + '*'.repeat(localPart.length - 2) + localPart.charAt(localPart.length - 1);
  
  if (preserveDomain) {
    return `${anonymizedLocal}@${domain}`;
  }
  
  return `${anonymizedLocal}@example.com`;
}

/**
 * Anonymize phone numbers while preserving country code
 * @param phone - Phone number to anonymize
 * @param preserveCountryCode - Whether to preserve country code (default: true)
 * @returns Anonymized phone number
 */
export function anonymizePhone(phone: string, preserveCountryCode: boolean = true): string {
  if (!phone) {
    return '***-***-****';
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 4) {
    return '***-***-****';
  }
  
  if (preserveCountryCode && digits.length > 10) {
    const countryCode = digits.slice(0, -10);
    const localNumber = digits.slice(-10);
    const anonymizedLocal = '***-***-' + localNumber.slice(-4);
    return `+${countryCode} ${anonymizedLocal}`;
  }
  
  // Standard US format
  if (digits.length >= 10) {
    const lastFour = digits.slice(-4);
    return `***-***-${lastFour}`;
  }
  
  return '***-***-****';
}

/**
 * Anonymize names while preserving structure
 * @param name - Name to anonymize
 * @param preserveInitials - Whether to preserve first and last initials (default: true)
 * @returns Anonymized name
 */
export function anonymizeName(name: string, preserveInitials: boolean = true): string {
  if (!name || name.trim().length === 0) {
    return 'Anonymous User';
  }
  
  const nameParts = name.trim().split(/\s+/);
  
  if (nameParts.length === 1) {
    // Single name - show first letter only
    return preserveInitials ? `${nameParts[0].charAt(0)}***` : 'Anonymous';
  }
  
  if (preserveInitials) {
    // Multiple names - preserve first and last initials
    const firstInitial = nameParts[0].charAt(0);
    const lastInitial = nameParts[nameParts.length - 1].charAt(0);
    return `${firstInitial}*** ${lastInitial}***`;
  }
  
  return 'Anonymous User';
}

/**
 * Anonymize addresses while preserving general location
 * @param address - Address to anonymize
 * @param preserveCity - Whether to preserve city (default: false)
 * @returns Anonymized address
 */
export function anonymizeAddress(address: string, preserveCity: boolean = false): string {
  if (!address) {
    return 'Address Not Available';
  }
  
  const parts = address.split(',').map(part => part.trim());
  
  if (parts.length === 1) {
    // Single line address
    const words = parts[0].split(' ');
    if (words.length <= 2) {
      return '*** *** Street';
    }
    
    const anonymized = words.map((word, index) => {
      if (index < 2) return '*'.repeat(word.length);
      return word;
    }).join(' ');
    
    return anonymized;
  }
  
  // Multi-line address
  const anonymizedParts = parts.map((part, index) => {
    if (index === 0) {
      // Street address - anonymize
      const words = part.split(' ');
      return words.map(word => '*'.repeat(word.length)).join(' ');
    }
    
    if (preserveCity && index === 1) {
      // City - preserve
      return part;
    }
    
    // Other parts (state, zip, country) - anonymize partially
    return part.split(' ').map(word => {
      if (word.length <= 2) return word;
      return word.charAt(0) + '*'.repeat(word.length - 2) + word.charAt(word.length - 1);
    }).join(' ');
  });
  
  return anonymizedParts.join(', ');
}

/**
 * Anonymize credit card numbers
 * @param cardNumber - Credit card number to anonymize
 * @returns Anonymized card number
 */
export function anonymizeCardNumber(cardNumber: string): string {
  if (!cardNumber) {
    return '****-****-****-****';
  }
  
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 4) {
    return '****-****-****-****';
  }
  
  const lastFour = digits.slice(-4);
  const masked = '*'.repeat(digits.length - 4);
  
  // Format based on length
  if (digits.length === 16) {
    return `****-****-****-${lastFour}`;
  } else if (digits.length === 15) {
    return `****-****-***-${lastFour}`;
  } else {
    return `${masked}-${lastFour}`;
  }
}

/**
 * Anonymize customer ID while maintaining uniqueness
 * @param customerId - Customer ID to anonymize
 * @param preservePrefix - Whether to preserve a prefix (default: true)
 * @returns Anonymized customer ID
 */
export function anonymizeCustomerId(customerId: string, preservePrefix: boolean = true): string {
  if (!customerId) {
    return 'ANON-****';
  }
  
  if (preservePrefix && customerId.includes('-')) {
    const parts = customerId.split('-');
    const prefix = parts[0];
    return `${prefix}-****`;
  }
  
  // Hash the ID to create a consistent anonymized version
  const hash = crypto.createHash('sha256').update(customerId).digest('hex');
  return `ANON-${hash.slice(0, 8).toUpperCase()}`;
}

/**
 * Anonymize business ID while maintaining structure
 * @param businessId - Business ID to anonymize
 * @returns Anonymized business ID
 */
export function anonymizeBusinessId(businessId: string): string {
  if (!businessId) {
    return 'BIZ-****';
  }
  
  const hash = crypto.createHash('sha256').update(businessId).digest('hex');
  return `BIZ-${hash.slice(0, 8).toUpperCase()}`;
}

/**
 * Anonymize program ID while maintaining type
 * @param programId - Program ID to anonymize
 * @returns Anonymized program ID
 */
export function anonymizeProgramId(programId: string): string {
  if (!programId) {
    return 'PROG-****';
  }
  
  const hash = crypto.createHash('sha256').update(programId).digest('hex');
  return `PROG-${hash.slice(0, 8).toUpperCase()}`;
}

/**
 * Anonymize entire customer object
 * @param customer - Customer object to anonymize
 * @param options - Anonymization options
 * @returns Anonymized customer object
 */
export function anonymizeCustomer(customer: any, options: {
  preserveEmailDomain?: boolean;
  preserveNameInitials?: boolean;
  preserveAddressCity?: boolean;
  preservePhoneCountryCode?: boolean;
} = {}): any {
  const {
    preserveEmailDomain = true,
    preserveNameInitials = true,
    preserveAddressCity = false,
    preservePhoneCountryCode = true
  } = options;
  
  return {
    id: anonymizeCustomerId(customer.id),
    name: anonymizeName(customer.name, preserveNameInitials),
    email: anonymizeEmail(customer.email, preserveEmailDomain),
    phone: anonymizePhone(customer.phone, preservePhoneCountryCode),
    address: anonymizeAddress(customer.address, preserveAddressCity),
    // Preserve non-PII fields
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    userType: customer.userType,
    // Anonymize business relationships
    businessId: customer.businessId ? anonymizeBusinessId(customer.businessId) : undefined,
    programIds: customer.programIds ? customer.programIds.map((id: string) => anonymizeProgramId(id)) : []
  };
}

/**
 * Anonymize business object
 * @param business - Business object to anonymize
 * @returns Anonymized business object
 */
export function anonymizeBusiness(business: any): any {
  return {
    id: anonymizeBusinessId(business.id),
    name: anonymizeName(business.name, true),
    email: anonymizeEmail(business.email, true),
    phone: anonymizePhone(business.phone, true),
    address: anonymizeAddress(business.address, true),
    // Preserve non-PII fields
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
    userType: business.userType,
    businessType: business.businessType
  };
}

/**
 * Anonymize transaction data
 * @param transaction - Transaction object to anonymize
 * @returns Anonymized transaction object
 */
export function anonymizeTransaction(transaction: any): any {
  return {
    id: transaction.id ? `TXN-${crypto.createHash('sha256').update(transaction.id).digest('hex').slice(0, 8).toUpperCase()}` : undefined,
    customerId: anonymizeCustomerId(transaction.customerId),
    businessId: anonymizeBusinessId(transaction.businessId),
    programId: anonymizeProgramId(transaction.programId),
    amount: transaction.amount,
    points: transaction.points,
    type: transaction.type,
    status: transaction.status,
    createdAt: transaction.createdAt,
    // Remove sensitive details
    description: transaction.description ? 'Transaction Details' : undefined,
    metadata: undefined
  };
}

/**
 * Check if data contains PII
 * @param data - Data to check
 * @returns True if data likely contains PII
 */
export function containsPII(data: any): boolean {
  if (typeof data !== 'string') {
    return false;
  }
  
  const piiPatterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone
    /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/, // Credit card
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b[A-Za-z]{2}\d{6}\b/ // Driver's license pattern
  ];
  
  return piiPatterns.some(pattern => pattern.test(data));
}

/**
 * Remove PII from text content
 * @param text - Text to sanitize
 * @returns Sanitized text with PII removed
 */
export function removePIIFromText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, '[CARD]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
}