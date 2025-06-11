import type { CurrencyCode } from '../types/currency';

/**
 * SQL Safety Utilities
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
  // Ensure the id is a string or a number that can be converted to string
  if (id === null || id === undefined) {
    throw new Error('Business ID is required');
  }
  
  const stringId = String(id).trim();
  
  // Check if the ID is empty
  if (!stringId) {
    throw new Error('Business ID cannot be empty');
  }

  // If the ID is numeric (which our DB expects), validate it further
  if (/^\d+$/.test(stringId)) {
    // Check for unreasonable lengths to prevent DoS attacks
    if (stringId.length > 20) {
      throw new Error('Business ID is too long');
    }
    
    return stringId;
  }
  
  // If using UUID format
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stringId)) {
    return stringId;
  }
  
  // If the validation fails, throw an error
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
  
  // Check if the period is in the allowed list
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
  
  // Check if the currency code is in the expected format (3 uppercase letters)
  if (!/^[A-Z]{3}$/.test(normalizedCode)) {
    throw new Error('Invalid currency code format. Expected 3-letter ISO format (e.g., USD)');
  }
  
  return normalizedCode as CurrencyCode;
}

/**
 * Validates an email address format
 * @param email The email address to validate
 * @throws Error if the email is invalid
 */
export function validateEmail(email: unknown): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Use a basic regex for email validation
  // In production, consider a more comprehensive solution or email validation library
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }
  
  // Prevent unreasonably long emails to avoid DoS attacks
  if (normalizedEmail.length > 254) {
    throw new Error('Email address is too long');
  }
  
  return normalizedEmail;
}

/**
 * Validates a user ID
 * @param id The user ID to validate
 * @throws Error if the user ID is invalid
 */
export function validateUserId(id: unknown): string {
  // For simplicity, user IDs follow the same validation as business IDs
  return validateBusinessId(id);
}

/**
 * Sanitize a database identifier (table name, column name)
 * for use in dynamic SQL queries (not parameterized)
 * 
 * WARNING: Avoid dynamic table/column names when possible.
 * Use this only when absolutely necessary.
 * 
 * @param identifier The database identifier to sanitize
 */
export function sanitizeDbIdentifier(identifier: string): string {
  // Allow only alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error('Invalid database identifier');
  }
  
  return identifier;
}

/**
 * Validates if a string is safe to use in a LIKE clause
 * @param value The string to use in a LIKE clause
 */
export function escapeLikeValue(value: string): string {
  // Escape special LIKE characters: % _ \
  return value.replace(/[\\%_]/g, '\\$&');
} 