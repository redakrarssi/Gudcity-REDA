import type { CurrencyCode } from '../types/currency';

/**
 * Enhanced SQL Safety Utilities
 * 
 * This file contains utility functions to help prevent SQL injection
 * and validate inputs before they are used in database queries.
 */

/**
 * Validates if a business ID is in the expected format
 * @param id The business ID to validate
 * @throws Error if the business ID is invalid
 */
export function validateBusinessId(id: unknown): string {
  // SECURITY: Enhanced validation with strict type checking
  if (id === null || id === undefined) {
    throw new Error('Business ID is required');
  }
  
  const stringId = String(id).trim();
  
  // Check if the ID is empty
  if (!stringId) {
    throw new Error('Business ID cannot be empty');
  }

  // SECURITY: Prevent SQL injection by validating format strictly
  if (/^\d+$/.test(stringId)) {
    // Check for unreasonable lengths to prevent DoS attacks
    if (stringId.length > 20) {
      throw new Error('Business ID is too long');
    }
    
    // SECURITY: Additional validation for numeric IDs
    const numId = parseInt(stringId, 10);
    if (isNaN(numId) || numId <= 0 || numId > Number.MAX_SAFE_INTEGER) {
      throw new Error('Invalid business ID value');
    }
    
    return stringId;
  }
  
  // SECURITY: UUID validation with strict format checking
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stringId)) {
    return stringId;
  }
  
  // SECURITY: If the validation fails, throw an error
  throw new Error('Invalid business ID format');
}

/**
 * Validates if a period value is in the allowed set of values
 * @param period The period value to validate
 * @throws Error if the period is invalid
 */
export function validatePeriod(period: unknown): 'day' | 'week' | 'month' | 'year' {
  if (!period || typeof period !== 'string') {
    throw new Error('Period is required and must be a string');
  }
  
  const normalizedPeriod = period.toLowerCase().trim();
  
  // SECURITY: Strict validation against allowed values
  if (!['day', 'week', 'month', 'year'].includes(normalizedPeriod)) {
    throw new Error('Invalid period value. Must be one of: day, week, month, year');
  }
  
  return normalizedPeriod as 'day' | 'week' | 'month' | 'year';
}

/**
 * Validates if a currency code is in the expected format
 * @param currencyCode The currency code to validate
 * @throws Error if the currency code is invalid
 */
export function validateCurrencyCode(currencyCode: unknown): CurrencyCode {
  if (!currencyCode || typeof currencyCode !== 'string') {
    throw new Error('Currency code is required and must be a string');
  }
  
  const normalizedCode = currencyCode.toUpperCase().trim();
  
  // SECURITY: Strict validation for currency code format
  if (!/^[A-Z]{3}$/.test(normalizedCode)) {
    throw new Error('Invalid currency code format. Expected 3-letter ISO format (e.g., USD)');
  }
  
  return normalizedCode as CurrencyCode;
}

/**
 * Validates an email address format with enhanced security
 * @param email The email address to validate
 * @throws Error if the email is invalid
 */
export function validateEmail(email: unknown): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // SECURITY: Enhanced email validation regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }
  
  // SECURITY: Prevent unreasonably long emails to avoid DoS attacks
  if (normalizedEmail.length > 254) {
    throw new Error('Email address is too long');
  }
  
  // SECURITY: Additional validation for suspicious patterns
  if (normalizedEmail.includes('..') || normalizedEmail.includes('--')) {
    throw new Error('Invalid email format');
  }
  
  return normalizedEmail;
}

/**
 * Validates a user ID with enhanced security
 * @param id The user ID to validate
 * @throws Error if the user ID is invalid
 */
export function validateUserId(id: unknown): string {
  // SECURITY: Enhanced user ID validation
  if (id === null || id === undefined) {
    throw new Error('User ID is required');
  }
  
  const stringId = String(id).trim();
  
  if (!stringId) {
    throw new Error('User ID cannot be empty');
  }
  
  // SECURITY: Numeric ID validation
  if (/^\d+$/.test(stringId)) {
    if (stringId.length > 20) {
      throw new Error('User ID is too long');
    }
    
    const numId = parseInt(stringId, 10);
    if (isNaN(numId) || numId <= 0 || numId > Number.MAX_SAFE_INTEGER) {
      throw new Error('Invalid user ID value');
    }
    
    return stringId;
  }
  
  // SECURITY: UUID validation
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stringId)) {
    return stringId;
  }
  
  throw new Error('Invalid user ID format');
}

/**
 * Enhanced database identifier sanitization
 * for use in dynamic SQL queries (not parameterized)
 * 
 * WARNING: Avoid dynamic table/column names when possible.
 * Use this only when absolutely necessary.
 * 
 * @param identifier The database identifier to sanitize
 */
export function sanitizeDbIdentifier(identifier: string): string {
  // SECURITY: Enhanced validation for database identifiers
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Database identifier is required and must be a string');
  }
  
  const trimmed = identifier.trim();
  
  // SECURITY: Strict validation - only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    throw new Error('Invalid database identifier format');
  }
  
  // SECURITY: Prevent SQL injection through identifier manipulation
  if (trimmed.length > 63) { // PostgreSQL identifier limit
    throw new Error('Database identifier is too long');
  }
  
  // SECURITY: Prevent reserved keyword usage
  const reservedKeywords = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
    'TABLE', 'DATABASE', 'USER', 'PASSWORD', 'ADMIN', 'ROOT'
  ];
  
  if (reservedKeywords.includes(trimmed.toUpperCase())) {
    throw new Error('Database identifier cannot be a reserved keyword');
  }
  
  return trimmed;
}

/**
 * Enhanced LIKE clause value escaping
 * @param value The string to use in a LIKE clause
 */
export function escapeLikeValue(value: string): string {
  // SECURITY: Enhanced escaping for LIKE clauses
  if (!value || typeof value !== 'string') {
    throw new Error('Value is required and must be a string');
  }
  
  // Escape special LIKE characters: % _ \
  return value.replace(/[\\%_]/g, '\\$&');
}

/**
 * Enhanced program ID validation
 */
export function validateProgramId(programId: any): number {
  if (programId === undefined || programId === null) {
    throw new Error('Program ID is required');
  }
  
  // SECURITY: Enhanced type conversion and validation
  let programIdNum: number;
  
  if (typeof programId === 'string') {
    programIdNum = parseInt(programId, 10);
  } else if (typeof programId === 'number') {
    programIdNum = programId;
  } else {
    throw new Error('Program ID must be a string or number');
  }
  
  // SECURITY: Comprehensive number validation
  if (isNaN(programIdNum) || !isFinite(programIdNum)) {
    throw new Error('Invalid program ID: not a valid number');
  }
  
  if (programIdNum <= 0 || programIdNum > Number.MAX_SAFE_INTEGER) {
    throw new Error('Invalid program ID: out of valid range');
  }
  
  return programIdNum;
}

/**
 * Enhanced string validation and sanitization for database operations
 * 
 * IMPORTANT: This function provides different levels of sanitization based on context.
 * For parameterized queries (recommended), minimal sanitization is needed.
 * For dynamic SQL (not recommended), more aggressive sanitization is applied.
 * 
 * @param str - Input string to sanitize
 * @param options - Sanitization options
 */
interface SanitizeOptions {
  /** Maximum allowed length (default: 10000) */
  maxLength?: number;
  /** Whether to preserve formatting characters like newlines/tabs (default: true) */
  preserveFormatting?: boolean;
  /** Whether to escape SQL special characters (default: false, use parameterized queries instead) */
  escapeSqlChars?: boolean;
  /** Whether to allow Unicode characters (default: true) */
  allowUnicode?: boolean;
  /** Custom pattern to remove (applied after standard sanitization) */
  customPattern?: RegExp;
}

export function sanitizeString(str: any, options: SanitizeOptions = {}): string {
  if (str === undefined || str === null) {
    return '';
  }
  
  // SECURITY: Set default options
  const {
    maxLength = 10000,
    preserveFormatting = true,
    escapeSqlChars = false,
    allowUnicode = true,
    customPattern
  } = options;
  
  // SECURITY: Convert to string safely
  const strValue = String(str);
  
  // SECURITY: Prevent DoS through extremely long strings
  if (strValue.length > maxLength) {
    throw new Error(`String value exceeds maximum length of ${maxLength} characters`);
  }
  
  let sanitized = strValue;
  
  // SECURITY: Always remove null bytes and other dangerous control characters
  sanitized = sanitized.replace(/\0/g, ''); // Remove null bytes
  
  // SECURITY: Remove dangerous control characters but preserve formatting if requested
  if (preserveFormatting) {
    // Remove only dangerous control characters, keep newlines, tabs, carriage returns
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    // Remove all control characters including formatting
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }
  
  // SECURITY: Handle Unicode characters if not allowed
  if (!allowUnicode) {
    // Keep only ASCII characters
    sanitized = sanitized.replace(/[^\x20-\x7E\r\n\t]/g, '');
  }
  
  // SECURITY: SQL escaping (only if explicitly requested - use parameterized queries instead)
  if (escapeSqlChars) {
    console.warn('WARNING: Using SQL character escaping. Consider using parameterized queries instead.');
    sanitized = sanitized
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/\\/g, '\\\\'); // Escape backslashes
  }
  
  // SECURITY: Apply custom pattern removal if provided
  if (customPattern) {
    sanitized = sanitized.replace(customPattern, '');
  }
  
  return sanitized;
}

/**
 * Specialized sanitization for user-generated content that will be stored in the database
 * Preserves legitimate formatting while removing dangerous characters
 * 
 * @param content - User content to sanitize
 */
export function sanitizeUserContent(content: any): string {
  return sanitizeString(content, {
    maxLength: 50000, // Allow longer content for user posts/comments
    preserveFormatting: true,
    escapeSqlChars: false, // Use parameterized queries instead
    allowUnicode: true, // Allow international characters
  });
}

/**
 * Specialized sanitization for search queries
 * More restrictive to prevent search-based attacks
 * 
 * @param query - Search query to sanitize
 */
export function sanitizeSearchQuery(query: any): string {
  return sanitizeString(query, {
    maxLength: 500, // Shorter limit for search queries
    preserveFormatting: false, // Remove formatting characters
    escapeSqlChars: false, // Use parameterized queries
    allowUnicode: true,
    customPattern: /[<>]/g // Remove HTML-like characters
  });
}

/**
 * Specialized sanitization for identifiers and names
 * Conservative approach for system identifiers
 * 
 * @param identifier - Identifier to sanitize
 */
export function sanitizeIdentifier(identifier: any): string {
  return sanitizeString(identifier, {
    maxLength: 255,
    preserveFormatting: false,
    escapeSqlChars: false,
    allowUnicode: true,
    customPattern: /[<>'"]/g // Remove potentially dangerous characters
  });
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use sanitizeString with appropriate options instead
 */
export function sanitizeStringLegacy(str: any): string {
  console.warn('sanitizeStringLegacy is deprecated. Use sanitizeString with appropriate options instead.');
  return sanitizeString(str, {
    maxLength: 10000,
    preserveFormatting: false,
    escapeSqlChars: true,
    allowUnicode: false
  });
}

/**
 * Enhanced date string validation
 */
export function validateDateString(dateStr: any): string {
  if (!dateStr) {
    throw new Error('Date is required');
  }
  
  // SECURITY: Enhanced date parsing and validation
  let date: Date;
  
  if (dateStr instanceof Date) {
    date = dateStr;
  } else if (typeof dateStr === 'string' || typeof dateStr === 'number') {
    date = new Date(dateStr);
  } else {
    throw new Error('Date must be a string, number, or Date object');
  }
  
  // SECURITY: Validate date is valid
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  
  // SECURITY: Prevent dates too far in the past or future
  const now = new Date();
  const minDate = new Date(1900, 0, 1);
  const maxDate = new Date(now.getFullYear() + 100, 11, 31);
  
  if (date < minDate || date > maxDate) {
    throw new Error('Date is outside valid range');
  }
  
  // Return ISO format
  return date.toISOString();
}

/**
 * SECURITY: Additional validation for numeric values
 */
export function validateNumericValue(value: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
  if (value === undefined || value === null) {
    throw new Error('Numeric value is required');
  }
  
  let numValue: number;
  
  if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    throw new Error('Value must be a string or number');
  }
  
  if (isNaN(numValue) || !isFinite(numValue)) {
    throw new Error('Invalid numeric value');
  }
  
  if (numValue < min || numValue > max) {
    throw new Error(`Numeric value must be between ${min} and ${max}`);
  }
  
  return numValue;
}

/**
 * Test suite for string sanitization functions
 * Run these tests to ensure functionality isn't broken
 */
export function runSanitizationTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, testFn: () => void): void {
    try {
      testFn();
      results.push(`✅ ${name}`);
      passed++;
    } catch (error) {
      results.push(`❌ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  // Test basic string sanitization
  test('Basic string sanitization preserves normal text', () => {
    const input = 'Hello World! This is a normal string.';
    const result = sanitizeString(input);
    if (result !== input) {
      throw new Error(`Expected "${input}", got "${result}"`);
    }
  });

  test('Formatting preservation works', () => {
    const input = 'Line 1\nLine 2\tTabbed\rCarriage Return';
    const result = sanitizeString(input, { preserveFormatting: true });
    if (!result.includes('\n') || !result.includes('\t')) {
      throw new Error('Formatting characters were removed when they should be preserved');
    }
  });

  test('Formatting removal works', () => {
    const input = 'Line 1\nLine 2\tTabbed';
    const result = sanitizeString(input, { preserveFormatting: false });
    if (result.includes('\n') || result.includes('\t')) {
      throw new Error('Formatting characters were not removed');
    }
  });

  test('Null bytes are always removed', () => {
    const input = 'Hello\0World';
    const result = sanitizeString(input);
    if (result.includes('\0')) {
      throw new Error('Null bytes were not removed');
    }
    if (result !== 'HelloWorld') {
      throw new Error(`Expected "HelloWorld", got "${result}"`);
    }
  });

  test('Unicode characters are preserved by default', () => {
    const input = 'Héllo Wørld! 中文 🎉';
    const result = sanitizeString(input);
    if (result !== input) {
      throw new Error(`Unicode characters were modified: expected "${input}", got "${result}"`);
    }
  });

  test('Unicode can be filtered when requested', () => {
    const input = 'Hello 中文 World';
    const result = sanitizeString(input, { allowUnicode: false });
    if (result.includes('中文')) {
      throw new Error('Unicode characters were not filtered');
    }
  });

  test('Length limits are enforced', () => {
    const input = 'x'.repeat(100);
    try {
      sanitizeString(input, { maxLength: 50 });
      throw new Error('Length limit was not enforced');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('maximum length')) {
        throw new Error('Wrong error type for length limit');
      }
    }
  });

  test('SQL escaping works when requested', () => {
    const input = "It's a test with 'quotes' and \\backslashes";
    const result = sanitizeString(input, { escapeSqlChars: true });
    if (!result.includes("''") || !result.includes("\\\\")) {
      throw new Error('SQL escaping did not work');
    }
  });

  test('Custom pattern removal works', () => {
    const input = 'Hello <script>alert("xss")</script> World';
    const result = sanitizeString(input, { customPattern: /<[^>]*>/g });
    if (result.includes('<script>') || result.includes('</script>')) {
      throw new Error('Custom pattern was not removed');
    }
  });

  // Test specialized functions
  test('User content sanitization preserves formatting', () => {
    const input = 'User post\nWith multiple lines\nAnd émojis 🎉';
    const result = sanitizeUserContent(input);
    if (!result.includes('\n') || !result.includes('🎉')) {
      throw new Error('User content sanitization too aggressive');
    }
  });

  test('Search query sanitization removes HTML', () => {
    const input = 'search term <script>alert("xss")</script>';
    const result = sanitizeSearchQuery(input);
    if (result.includes('<') || result.includes('>')) {
      throw new Error('HTML characters not removed from search query');
    }
  });

  test('Identifier sanitization removes quotes', () => {
    const input = 'user_name"with\'quotes';
    const result = sanitizeIdentifier(input);
    if (result.includes('"') || result.includes("'")) {
      throw new Error('Quotes not removed from identifier');
    }
  });

  // Test edge cases
  test('Empty string handling', () => {
    const result = sanitizeString('');
    if (result !== '') {
      throw new Error('Empty string not handled correctly');
    }
  });

  test('Null/undefined handling', () => {
    const result1 = sanitizeString(null);
    const result2 = sanitizeString(undefined);
    if (result1 !== '' || result2 !== '') {
      throw new Error('Null/undefined not handled correctly');
    }
  });

  test('Number conversion works', () => {
    const input = 123.45;
    const result = sanitizeString(input);
    if (result !== '123.45') {
      throw new Error(`Number conversion failed: expected "123.45", got "${result}"`);
    }
  });

  test('Boolean conversion works', () => {
    const result1 = sanitizeString(true);
    const result2 = sanitizeString(false);
    if (result1 !== 'true' || result2 !== 'false') {
      throw new Error('Boolean conversion failed');
    }
  });

  // Test legitimate business use cases
  test('Business names with special characters', () => {
    const input = "O'Reilly & Associates, Inc.";
    const result = sanitizeUserContent(input);
    if (!result.includes("'") || !result.includes("&")) {
      throw new Error('Legitimate business name characters were removed');
    }
  });

  test('Addresses with newlines', () => {
    const input = "123 Main St\nApt 4B\nNew York, NY 10001";
    const result = sanitizeUserContent(input);
    if (!result.includes('\n')) {
      throw new Error('Address formatting was removed');
    }
  });

  test('International names and text', () => {
    const input = "José García-Martínez from São Paulo";
    const result = sanitizeUserContent(input);
    if (result !== input) {
      throw new Error('International characters were modified');
    }
  });

  test('Product descriptions with formatting', () => {
    const input = "Product Features:\n• Feature 1\n• Feature 2\n\tSpecial note";
    const result = sanitizeUserContent(input);
    if (!result.includes('\n') || !result.includes('\t') || !result.includes('•')) {
      throw new Error('Product description formatting was damaged');
    }
  });

  return { passed, failed, results };
}

// Export a simple test runner for development
export function testSqlSafety(): void {
  console.log('🧪 Running SQL Safety Tests...\n');
  const { passed, failed, results } = runSanitizationTests();
  
  results.forEach(result => console.log(result));
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.error('❌ Some tests failed. Please review the sanitization functions.');
  } else {
    console.log('✅ All tests passed! String sanitization is working correctly.');
  }
} 