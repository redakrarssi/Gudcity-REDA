import { VercelResponse } from '@vercel/node';

/**
 * Standardized API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Send successful response
 */
export function sendSuccess<T>(
  res: VercelResponse,
  data?: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
  
  res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: VercelResponse,
  error: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): void {
  const response: ApiResponse = {
    success: false,
    error,
    code,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.data = details;
  }
  
  res.status(statusCode).json(response);
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: VercelResponse,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): void {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
  
  res.status(200).json(response);
}

/**
 * Send created response (201)
 */
export function sendCreated<T>(
  res: VercelResponse,
  data: T,
  message: string = 'Resource created successfully'
): void {
  sendSuccess(res, data, message, 201);
}

/**
 * Send no content response (204)
 */
export function sendNoContent(res: VercelResponse): void {
  res.status(204).end();
}

/**
 * Extract pagination parameters from query
 */
export function getPaginationParams(query: any): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10)); // Max 100 items
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Validate and extract sort parameters
 */
export function getSortParams(
  query: any,
  allowedFields: string[] = [],
  defaultField: string = 'created_at'
): {
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
} {
  let sortBy = query.sortBy || defaultField;
  let sortOrder: 'ASC' | 'DESC' = (query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  // Validate sort field
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    sortBy = defaultField;
  }
  
  return { sortBy, sortOrder };
}
