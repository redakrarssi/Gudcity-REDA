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
 * Enhanced string sanitization for SQL queries
 */
export function sanitizeString(str: any): string {
  if (str === undefined || str === null) {
    return '';
  }
  
  // SECURITY: Enhanced string conversion and validation
  const strValue = String(str);
  
  // SECURITY: Prevent SQL injection through string manipulation
  if (strValue.length > 10000) { // Reasonable limit to prevent DoS
    throw new Error('String value is too long');
  }
  
  // SECURITY: Remove potentially dangerous characters and patterns
  return strValue
    .replace(/'/g, "''") // Escape single quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x1f\x7f-\x9f]/g, ''); // Remove control characters
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
<<<<<<< Current (Your changes)
=======
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
>>>>>>> Incoming (Background Agent changes)
} 