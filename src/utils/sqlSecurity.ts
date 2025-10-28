/**
 * SQL Security Utilities
 * Prevents SQL injection by sanitizing and validating inputs
 * 
 * This utility class provides comprehensive input sanitization and validation
 * to prevent SQL injection attacks while maintaining application functionality.
 */

export class SqlSecurity {
  /**
   * Sanitize string input for SQL queries
   * Removes dangerous characters and limits length to prevent injection attacks
   * 
   * @param input - The string input to sanitize
   * @param maxLength - Maximum allowed length (default: 255)
   * @returns Sanitized string safe for SQL queries
   */
  static sanitizeString(input: string, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/[<>'"&;]/g, '') // Remove dangerous characters that could be used for injection
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .substring(0, maxLength) // Limit length to prevent buffer overflow
      .trim();
  }

  /**
   * Validate and sanitize numeric ID
   * Ensures ID is a valid positive integer
   * 
   * @param id - The ID to validate (string or number)
   * @returns Valid numeric ID or 0 if invalid
   */
  static sanitizeId(id: string | number): number {
    const numId = parseInt(String(id), 10);
    return isNaN(numId) || numId < 0 ? 0 : numId;
  }

  /**
   * Validate search query for LIKE operations
   * Removes dangerous characters and limits length for search queries
   * 
   * @param query - The search query to sanitize
   * @returns Sanitized search query safe for LIKE operations
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') return '';
    
    return query
      .replace(/[<>'"&;]/g, '') // Remove dangerous characters
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .substring(0, 100) // Limit search length
      .trim();
  }

  /**
   * Validate business ID
   * Ensures business ID is a valid positive integer
   * 
   * @param id - The business ID to validate
   * @returns Valid business ID
   * @throws Error if ID is invalid
   */
  static validateBusinessId(id: string | number): number {
    const numId = parseInt(String(id), 10);
    if (isNaN(numId) || numId <= 0) {
      throw new Error('Invalid business ID: must be a positive integer');
    }
    return numId;
  }

  /**
   * Validate customer ID
   * Ensures customer ID is a valid positive integer
   * 
   * @param id - The customer ID to validate
   * @returns Valid customer ID
   * @throws Error if ID is invalid
   */
  static validateCustomerId(id: string | number): number {
    const numId = parseInt(String(id), 10);
    if (isNaN(numId) || numId <= 0) {
      throw new Error('Invalid customer ID: must be a positive integer');
    }
    return numId;
  }

  /**
   * Validate program ID
   * Ensures program ID is a valid positive integer
   * 
   * @param id - The program ID to validate
   * @returns Valid program ID
   * @throws Error if ID is invalid
   */
  static validateProgramId(id: string | number): number {
    const numId = parseInt(String(id), 10);
    if (isNaN(numId) || numId <= 0) {
      throw new Error('Invalid program ID: must be a positive integer');
    }
    return numId;
  }

  /**
   * Validate card ID
   * Ensures card ID is a valid positive integer
   * 
   * @param id - The card ID to validate
   * @returns Valid card ID
   * @throws Error if ID is invalid
   */
  static validateCardId(id: string | number): number {
    const numId = parseInt(String(id), 10);
    if (isNaN(numId) || numId <= 0) {
      throw new Error('Invalid card ID: must be a positive integer');
    }
    return numId;
  }

  /**
   * Sanitize description text for database storage
   * Removes dangerous characters and limits length
   * 
   * @param description - The description to sanitize
   * @param maxLength - Maximum allowed length (default: 500)
   * @returns Sanitized description safe for database storage
   */
  static sanitizeDescription(description: string, maxLength: number = 500): string {
    if (!description || typeof description !== 'string') return '';
    
    return description
      .replace(/[<>'"&;]/g, '') // Remove dangerous characters
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .substring(0, maxLength) // Limit length
      .trim();
  }

  /**
   * Sanitize transaction reference
   * Ensures transaction reference is safe for database storage
   * 
   * @param transactionRef - The transaction reference to sanitize
   * @returns Sanitized transaction reference
   */
  static sanitizeTransactionRef(transactionRef: string): string {
    if (!transactionRef || typeof transactionRef !== 'string') return '';
    
    return transactionRef
      .replace(/[<>'"&;]/g, '') // Remove dangerous characters
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .substring(0, 100) // Limit length
      .trim();
  }

  /**
   * Validate points value
   * Ensures points is a valid non-negative number
   * 
   * @param points - The points value to validate
   * @returns Valid points value
   * @throws Error if points is invalid
   */
  static validatePoints(points: string | number): number {
    const numPoints = parseFloat(String(points));
    if (isNaN(numPoints) || numPoints < 0) {
      throw new Error('Invalid points value: must be a non-negative number');
    }
    return Math.round(numPoints * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Sanitize source parameter
   * Ensures source parameter is safe for database storage
   * 
   * @param source - The source to sanitize
   * @returns Sanitized source
   */
  static sanitizeSource(source: string): string {
    if (!source || typeof source !== 'string') return 'UNKNOWN';
    
    const allowedSources = ['PURCHASE', 'SCAN', 'WELCOME', 'PROMOTION', 'MANUAL', 'OTHER', 'REDEMPTION', 'ADJUSTMENT'];
    const sanitizedSource = source.toUpperCase().replace(/[^A-Z_]/g, '');
    
    return allowedSources.includes(sanitizedSource) ? sanitizedSource : 'OTHER';
  }

  /**
   * Comprehensive input validation for SQL queries
   * Validates and sanitizes all common input types
   * 
   * @param inputs - Object containing input values to validate
   * @returns Object with validated and sanitized values
   */
  static validateInputs(inputs: {
    businessId?: string | number;
    customerId?: string | number;
    programId?: string | number;
    cardId?: string | number;
    points?: string | number;
    source?: string;
    description?: string;
    transactionRef?: string;
    searchQuery?: string;
  }): {
    businessId?: number;
    customerId?: number;
    programId?: number;
    cardId?: number;
    points?: number;
    source?: string;
    description?: string;
    transactionRef?: string;
    searchQuery?: string;
  } {
    const validated: any = {};

    if (inputs.businessId !== undefined) {
      validated.businessId = this.validateBusinessId(inputs.businessId);
    }
    if (inputs.customerId !== undefined) {
      validated.customerId = this.validateCustomerId(inputs.customerId);
    }
    if (inputs.programId !== undefined) {
      validated.programId = this.validateProgramId(inputs.programId);
    }
    if (inputs.cardId !== undefined) {
      validated.cardId = this.validateCardId(inputs.cardId);
    }
    if (inputs.points !== undefined) {
      validated.points = this.validatePoints(inputs.points);
    }
    if (inputs.source !== undefined) {
      validated.source = this.sanitizeSource(inputs.source);
    }
    if (inputs.description !== undefined) {
      validated.description = this.sanitizeDescription(inputs.description);
    }
    if (inputs.transactionRef !== undefined) {
      validated.transactionRef = this.sanitizeTransactionRef(inputs.transactionRef);
    }
    if (inputs.searchQuery !== undefined) {
      validated.searchQuery = this.sanitizeSearchQuery(inputs.searchQuery);
    }

    return validated;
  }
}

export default SqlSecurity;