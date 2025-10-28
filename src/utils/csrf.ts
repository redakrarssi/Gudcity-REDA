// Enhanced CSRF protection utilities with crypto.randomBytes only and expiration
// Client: send X-CSRF-Token header from a cookie value
// Server: validate header matches cookie (double-submit pattern) with expiration

import crypto from 'crypto';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_TOKEN_EXPIRY_MINUTES = 15;

// Token structure: {token}.{timestamp}
interface CsrfTokenData {
  token: string;
  timestamp: number;
}

// Generate a cryptographically secure CSRF token using crypto.randomBytes only
export function generateCsrfToken(): string {
  try {
    // Use crypto.randomBytes for maximum security - no fallbacks
    const randomToken = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    return `${randomToken}.${timestamp}`;
  } catch (error) {
    throw new Error('CSRF token generation failed: crypto.randomBytes not available');
  }
}

// Parse token and validate expiration
export function parseCsrfToken(tokenString: string): CsrfTokenData | null {
  try {
    const parts = tokenString.split('.');
    if (parts.length !== 2) {
      return null;
    }
    
    const token = parts[0];
    const timestamp = parseInt(parts[1], 10);
    
    if (!token || isNaN(timestamp)) {
      return null;
    }
    
    return { token, timestamp };
  } catch {
    return null;
  }
}

// Check if token is expired (15 minutes)
export function isCsrfTokenExpired(tokenData: CsrfTokenData): boolean {
  const now = Date.now();
  const expiryTime = tokenData.timestamp + (CSRF_TOKEN_EXPIRY_MINUTES * 60 * 1000);
  return now > expiryTime;
}

// Validate CSRF token with expiration check
export function validateCsrfToken(tokenString: string): boolean {
  const tokenData = parseCsrfToken(tokenString);
  if (!tokenData) {
    return false;
  }
  
  return !isCsrfTokenExpired(tokenData);
}

// Enhanced CSRF middleware with expiration validation
export function csrfMiddleware(req: any, res: any, next: any) {
  try {
    // Only enforce on state-changing methods
    const method = (req.method || 'GET').toUpperCase();
    const isStateChanging = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    // Skip for non-API routes
    const isApi = typeof req.path === 'string' && req.path.startsWith('/api/');

    if (!isApi || !isStateChanging) {
      return next();
    }

    const headerToken = (req.headers?.[CSRF_HEADER_NAME] as string) || (req.headers?.[CSRF_HEADER_NAME.toUpperCase()] as string);

    // Parse cookies
    const cookieHeader: string = req.headers?.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) cookies[k.trim()] = decodeURIComponent(v.trim());
    });
    const cookieToken = cookies[CSRF_COOKIE_NAME];

    // Enhanced validation with expiration check
    if (!headerToken || !cookieToken) {
      return res.status(403).json({ error: 'CSRF token missing' });
    }

    if (headerToken !== cookieToken) {
      return res.status(403).json({ error: 'CSRF token mismatch' });
    }

    // Validate token format and expiration
    if (!validateCsrfToken(headerToken)) {
      return res.status(403).json({ error: 'CSRF token expired or invalid' });
    }

    return next();
  } catch (e) {
    return res.status(403).json({ error: 'CSRF validation error' });
  }
}

// Helper to set CSRF cookie if missing or expired (to be called on safe GET to /api/*)
export function ensureCsrfCookie(req: any, res: any, next: any) {
  try {
    const cookieHeader: string = req.headers?.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) cookies[k.trim()] = decodeURIComponent(v.trim());
    });
    
    const existingToken = cookies[CSRF_COOKIE_NAME];
    let needsNewToken = !existingToken;
    
    // Check if existing token is expired
    if (existingToken && !validateCsrfToken(existingToken)) {
      needsNewToken = true;
    }
    
    if (needsNewToken) {
      const token = generateCsrfToken();
      // Set cookie with SameSite=Lax so it is sent on top-level navigations within site
      // Add HttpOnly for additional security
      res.setHeader('Set-Cookie', `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Secure; HttpOnly`);
    }
  } catch (error) {
    console.warn('Failed to set CSRF cookie:', error);
  } finally {
    next();
  }
}


