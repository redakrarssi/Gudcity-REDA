// Minimal CSRF protection utilities (non-invasive)
// Client: send X-CSRF-Token header from a cookie value
// Server: validate header matches cookie (double-submit pattern)

import crypto from 'crypto';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a cryptographically secure CSRF token with proper fallbacks
export function generateCsrfToken(): string {
  try {
    // Primary method: Use crypto.randomBytes for maximum security
    if (crypto && typeof crypto.randomBytes === 'function') {
      return crypto.randomBytes(32).toString('hex');
    }
  } catch (error) {
    console.warn('crypto.randomBytes not available, trying fallback methods');
  }

  try {
    // Fallback 1: Use crypto.randomUUID if available
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // @ts-ignore - randomUUID may not be in all crypto type definitions
      return crypto.randomUUID();
    }
  } catch (error) {
    console.warn('crypto.randomUUID not available, trying final fallback');
  }

  try {
    // Fallback 2: Use Web Crypto API if available (browser environment)
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
      const array = new Uint8Array(32);
      globalThis.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch (error) {
    console.warn('Web Crypto API not available, using timestamp-based fallback');
  }

  // Final fallback: Timestamp + process hrtime (better than Math.random)
  // This is cryptographically weak but better than Math.random()
  try {
    if (typeof process !== 'undefined' && process.hrtime) {
      const hrTime = process.hrtime();
      const timestamp = Date.now().toString(36);
      const nanoTime = (hrTime[0] * 1e9 + hrTime[1]).toString(36);
      return `${timestamp}_${nanoTime}_${Date.now().toString(16)}`;
    }
  } catch {
    // Fall through to absolute final fallback
  }

  // Absolute final fallback: Enhanced timestamp-based token (avoid Math.random)
  const timestamp = Date.now();
  const performanceNow = typeof performance !== 'undefined' ? performance.now() : 0;
  const randomValue = timestamp ^ (performanceNow * 1000000);
  return `${timestamp.toString(36)}_${randomValue.toString(36)}_${(timestamp + performanceNow).toString(16)}`;
}

// Express-style middleware signature kept generic to avoid importing express types
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

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
    return next();
  } catch (e) {
    return res.status(403).json({ error: 'CSRF validation error' });
  }
}

// Helper to set CSRF cookie if missing (to be called on safe GET to /api/*)
export function ensureCsrfCookie(req: any, res: any, next: any) {
  try {
    const cookieHeader: string = req.headers?.cookie || '';
    const hasCookie = cookieHeader.includes(`${CSRF_COOKIE_NAME}=`);
    if (!hasCookie) {
      const token = generateCsrfToken();
      // Set cookie with SameSite=Lax so it is sent on top-level navigations within site
      res.setHeader('Set-Cookie', `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Secure`);
    }
  } catch {
    // ignore
  } finally {
    next();
  }
}


