// Minimal CSRF protection utilities (non-invasive)
// Client: send X-CSRF-Token header from a cookie value
// Server: validate header matches cookie (double-submit pattern)

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a lightweight CSRF token (cryptographically strong if crypto available)
export function generateCsrfToken(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch {
    // fallthrough
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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


