/**
 * Secure Database Utilities
 * 
 * This module provides SQL injection-safe database operations
 * by implementing proper parameterized queries and input validation.
 * 
 * SECURITY: All database operations use parameterized queries to prevent SQL injection.
 */

import sql from './db';

// Input validation types
export type DbInputType = 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'phone';

// Validation rules for different input types
const VALIDATION_RULES = {
  string: {
    maxLength: 1000,
    pattern: /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+={}[\]|\\:";'<>\/]*$/,
    required: true
  },
  number: {
    min: -2147483648,
    max: 2147483647,
    pattern: /^-?\d+$/,
    required: true
  },
  boolean: {
    pattern: /^(true|false|1|0)$/,
    required: true
  },
  date: {
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    required: true
  },
  uuid: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    required: true
  },
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254,
    required: true
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    maxLength: 20,
    required: true
  }
};

/**
 * Validate input data against specified type and rules
 * @param input The input value to validate
 * @param type The expected data type
 * @param options Optional validation options
 * @returns Validation result with success status and errors
 */
export function validateDbInput(
  input: any, 
  type: DbInputType, 
  options: { required?: boolean; maxLength?: number; min?: number; max?: number } = {}
): { isValid: boolean; errors: string[]; sanitized?: any } {
  const errors: string[] = [];
  const rule = VALIDATION_RULES[type];
  const opts = { ...rule, ...options };

  // Check if input is required
  if (opts.required && (input === null || input === undefined || input === '')) {
    errors.push(`${type} is required`);
    return { isValid: false, errors };
  }

  // Skip validation for optional null/undefined values
  if (!opts.required && (input === null || input === undefined)) {
    return { isValid: true, errors: [], sanitized: null };
  }

  // Type-specific validation
  switch (type) {
    case 'string':
      if (typeof input !== 'string') {
        errors.push('Expected string type');
        return { isValid: false, errors };
      }
      if (input.length > (opts.maxLength || 1000)) {
        errors.push(`String too long (max ${opts.maxLength || 1000} characters)`);
      }
      if (!opts.pattern.test(input)) {
        errors.push('String contains invalid characters');
      }
      break;

    case 'number':
      const numValue = typeof input === 'string' ? parseInt(input, 10) : input;
      if (isNaN(numValue)) {
        errors.push('Invalid number format');
        return { isValid: false, errors };
      }
      if (numValue < (opts.min || -2147483648)) {
        errors.push(`Number too small (min ${opts.min || -2147483648})`);
      }
      if (numValue > (opts.max || 2147483647)) {
        errors.push(`Number too large (max ${opts.max || 2147483647})`);
      }
      break;

    case 'boolean':
      if (typeof input !== 'boolean' && !opts.pattern.test(String(input))) {
        errors.push('Invalid boolean value');
      }
      break;

    case 'date':
      if (typeof input !== 'string' || !opts.pattern.test(input)) {
        errors.push('Invalid date format');
      }
      break;

    case 'uuid':
      if (typeof input !== 'string' || !opts.pattern.test(input)) {
        errors.push('Invalid UUID format');
      }
      break;

    case 'email':
      if (typeof input !== 'string' || !opts.pattern.test(input)) {
        errors.push('Invalid email format');
      }
      if (input.length > opts.maxLength) {
        errors.push(`Email too long (max ${opts.maxLength} characters)`);
      }
      break;

    case 'phone':
      if (typeof input !== 'string' || !opts.pattern.test(input)) {
        errors.push('Invalid phone format');
      }
      if (input.length > opts.maxLength) {
        errors.push(`Phone too long (max ${opts.maxLength} characters)`);
      }
      break;
  }

  // Sanitize input if validation passes
  let sanitized = input;
  if (type === 'string') {
    sanitized = input.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
  } else if (type === 'number') {
    sanitized = parseInt(String(input), 10);
  } else if (type === 'boolean') {
    sanitized = Boolean(input === 'true' || input === '1' || input === true);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Execute a parameterized query with input validation
 * @param query SQL query with parameterized placeholders ($1, $2, etc.)
 * @param params Array of parameters to substitute
 * @param paramTypes Array of expected types for each parameter
 * @returns Promise resolving to query results
 */
export async function executeSecureQuery<T = any>(
  query: string,
  params: any[],
  paramTypes: DbInputType[]
): Promise<T[]> {
  // Validate all parameters
  const validatedParams: any[] = [];
  
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const type = paramTypes[i];
    
    const validation = validateDbInput(param, type);
    if (!validation.isValid) {
      throw new Error(`Parameter ${i + 1} validation failed: ${validation.errors.join(', ')}`);
    }
    
    validatedParams.push(validation.sanitized);
  }

  // Execute the parameterized query
  try {
    const result = await sql.query(query, validatedParams);
    return result;
  } catch (error) {
    console.error('Secure query execution failed:', error);
    throw new Error('Database query execution failed');
  }
}

/**
 * SECURITY: Allowlist of valid column selections
 */
const ALLOWED_COLUMN_PATTERNS = [
  '*',
  /^[a-zA-Z_][a-zA-Z0-9_]*(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*$/, // Simple column list
  /^COUNT\([a-zA-Z_*][a-zA-Z0-9_]*\)$/i, // COUNT function
  /^[a-zA-Z_][a-zA-Z0-9_]*\s+AS\s+[a-zA-Z_][a-zA-Z0-9_]*$/i // Column with alias
];

/**
 * SECURITY: Validate column selection
 */
function validateColumns(columns: string): string {
  if (columns === '*') {
    return columns;
  }
  
  // Check if columns match any allowed pattern
  const isValid = ALLOWED_COLUMN_PATTERNS.some(pattern => {
    if (typeof pattern === 'string') {
      return pattern === columns;
    }
    return pattern.test(columns);
  });
  
  if (!isValid) {
    throw new Error('Invalid column specification. Use simple column names, comma-separated lists, or COUNT(*) only.');
  }
  
  return columns;
}

/**
 * Secure SELECT query builder
 * @param table Table name
 * @param columns Columns to select (default: '*')
 * @param whereClause WHERE clause with parameterized placeholders
 * @param params Parameters for the WHERE clause
 * @param paramTypes Types for the parameters
 * @returns Promise resolving to query results
 */
export async function secureSelect<T = any>(
  table: string,
  columns: string = '*',
  whereClause?: string,
  params: any[] = [],
  paramTypes: DbInputType[] = []
): Promise<T[]> {
  // SECURITY: Validate table name (prevent injection through table name)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error('Invalid table name');
  }
  
  // SECURITY: Validate columns parameter
  const validatedColumns = validateColumns(columns);

  let query = `SELECT ${validatedColumns} FROM ${table}`;
  
  if (whereClause && params.length > 0) {
    query += ` WHERE ${whereClause}`;
    return executeSecureQuery<T>(query, params, paramTypes);
  }
  
  return executeSecureQuery<T>(query, [], []);
}

/**
 * Secure INSERT query builder
 * @param table Table name
 * @param data Object with column-value pairs
 * @returns Promise resolving to inserted record
 */
export async function secureInsert<T = any>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  // Validate table name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error('Invalid table name');
  }

  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  
  // Determine parameter types based on data
  const paramTypes: DbInputType[] = values.map(value => {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      if (value.includes('@')) return 'email';
      if (/^\d+$/.test(value)) return 'string';
      return 'string';
    }
    return 'string';
  });

  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  
  const result = await executeSecureQuery<T>(query, values, paramTypes);
  return result[0];
}

/**
 * Secure UPDATE query builder
 * @param table Table name
 * @param data Object with column-value pairs to update
 * @param whereClause WHERE clause with parameterized placeholders
 * @param whereParams Parameters for the WHERE clause
 * @param whereParamTypes Types for the WHERE parameters
 * @returns Promise resolving to updated record
 */
export async function secureUpdate<T = any>(
  table: string,
  data: Record<string, any>,
  whereClause: string,
  whereParams: any[],
  whereParamTypes: DbInputType[]
): Promise<T> {
  // Validate table name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error('Invalid table name');
  }

  const updateColumns = Object.keys(data);
  const updateValues = Object.values(data);
  const updatePlaceholders = updateColumns.map((_, index) => `${updateColumns[index]} = $${index + 1}`);
  
  // Determine parameter types for update values
  const updateParamTypes: DbInputType[] = updateValues.map(value => {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      if (value.includes('@')) return 'email';
      return 'string';
    }
    return 'string';
  });

  const allParams = [...updateValues, ...whereParams];
  const allParamTypes = [...updateParamTypes, ...whereParamTypes];
  
  const query = `UPDATE ${table} SET ${updatePlaceholders.join(', ')} WHERE ${whereClause} RETURNING *`;
  
  const result = await executeSecureQuery<T>(query, allParams, allParamTypes);
  return result[0];
}

/**
 * Secure DELETE query builder
 * @param table Table name
 * @param whereClause WHERE clause with parameterized placeholders
 * @param params Parameters for the WHERE clause
 * @param paramTypes Types for the parameters
 * @returns Promise resolving to deletion result
 */
export async function secureDelete(
  table: string,
  whereClause: string,
  params: any[],
  paramTypes: DbInputType[]
): Promise<{ deletedCount: number }> {
  // Validate table name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error('Invalid table name');
  }

  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  
  const result = await executeSecureQuery(query, params, paramTypes);
  return { deletedCount: result.length };
}

/**
 * Sanitize database identifier (table/column names)
 * @param identifier The identifier to sanitize
 * @returns Sanitized identifier
 */
export function sanitizeDbIdentifier(identifier: string): string {
  // Remove any characters that could be used for SQL injection
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Log database operations for security monitoring
 * @param operation The database operation being performed
 * @param table The table being accessed
 * @param params The parameters used in the query
 */
export function logDbOperation(operation: string, table: string, params: any[]): void {
  console.log(`DB_OPERATION: ${operation} on ${table} with ${params.length} parameters`);
}

// Export the secure database utilities
export default {
  validateDbInput,
  executeSecureQuery,
  secureSelect,
  secureInsert,
  secureUpdate,
  secureDelete,
  sanitizeDbIdentifier,
  logDbOperation
};