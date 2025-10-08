import type { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { requireSql } from './db';

export interface AuthUser {
  id: number;
  email?: string;
  role?: string;
}

export async function verifyAuth(req: VercelRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return null;
  const secret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as any;
    // Optional blacklist check
    try {
      const sql = requireSql();
      if (payload?.jti) {
        const rows = await sql`SELECT 1 FROM revoked_tokens WHERE jti = ${payload.jti} LIMIT 1`;
        if (rows && rows.length > 0) return null;
      }
    } catch (_) {}

    return { id: Number(payload.userId), email: payload.email, role: payload.role };
  } catch (_) {
    return null;
  }
}

export async function verifyBusinessAccess(userId: number, businessId: string | number): Promise<boolean> {
  try {
    const sql = requireSql();
    const rows = await sql`
      SELECT 1 FROM users 
      WHERE id = ${Number(businessId)} 
        AND (id = ${userId} OR role IN ('admin','owner'))
      LIMIT 1
    `;
    return rows && rows.length > 0;
  } catch (_) {
    return false;
  }
}

export function cors(res: any, origin?: string) {
  const allowedOrigins = [
    process.env.VITE_APP_URL,
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[];
  const reqOrigin = origin || allowedOrigins[0] || '*';
  res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export function rateLimitFactory(limit: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();
  return (key: string) => {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count++;
    return entry.count <= limit;
  };
}

