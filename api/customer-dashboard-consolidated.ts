/**
 * Consolidated Customer Dashboard API Handler
 * This file consolidates all customer dashboard endpoints to stay within 12 serverless function limit
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from './_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from './_lib/auth.js';

const allow = rateLimitFactory(240, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const segments = (req.query.segments as string[] | undefined) || [];
  const sql = requireSql();

  // Handle public routes that don't require auth
  const publicRoutes = ['promotions'];
  const isPublicRoute = segments.length > 0 && publicRoutes.includes(segments[0]);

  const user = !isPublicRoute ? await verifyAuth(req) : null;
  if (!isPublicRoute && !user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Route: GET /api/dashboard
    if (segments.length === 1 && segments[0] === 'dashboard' && req.method === 'GET') {
      return handleDashboard(req, res, user!, sql);
    }

    // Route: GET /api/cards
    if (segments.length === 1 && segments[0] === 'cards' && req.method === 'GET') {
      return handleCards(req, res, user!, sql);
    }

    // Route: GET /api/promotions
    if (segments.length === 1 && segments[0] === 'promotions' && req.method === 'GET') {
      return handlePromotions(req, res, sql);
    }

    // Route: GET /api/qr-card
    if (segments.length === 1 && segments[0] === 'qr-card' && req.method === 'GET') {
      return handleQrCard(req, res, user!, sql);
    }

    // Route: GET /api/settings
    if (segments.length === 1 && segments[0] === 'settings' && req.method === 'GET') {
      return handleSettings(req, res, user!, sql);
    }

    // Route: PUT /api/settings
    if (segments.length === 1 && segments[0] === 'settings' && req.method === 'PUT') {
      return handleUpdateSettings(req, res, user!, sql);
    }

    // Route: GET /api/notifications
    if (segments.length === 1 && segments[0] === 'notifications' && req.method === 'GET') {
      return handleNotifications(req, res, user!, sql);
    }

    // Route: PUT /api/notifications/:id
    if (segments.length === 2 && segments[0] === 'notifications' && req.method === 'PUT') {
      return handleUpdateNotification(req, res, user!, sql, segments[1]);
    }

    // Route: GET /api/loyalty/cards/customer/:customerId
    if (segments.length === 4 && 
        segments[0] === 'loyalty' && 
        segments[1] === 'cards' && 
        segments[2] === 'customer' && 
        segments[3]) {
      return handleCustomerCards(req, res, user!, sql, segments[3]);
    }

    // Route: GET /api/customers/:customerId/programs
    if (segments.length === 3 && 
        segments[0] === 'customers' && 
        segments[1] && 
        segments[2] === 'programs') {
      return handleCustomerPrograms(req, res, user!, sql, segments[1]);
    }

    // Route: GET /api/users/:id
    if (segments.length === 2 && segments[0] === 'users' && segments[1]) {
      return handleUserById(req, res, user!, sql, segments[1]);
    }

    // Route: GET /api/security/audit
    if (segments.length === 2 && 
        segments[0] === 'security' && 
        segments[1] === 'audit') {
      return handleSecurityAudit(req, res, user!, sql);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Customer Dashboard API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Handler functions would be implemented here...
// (The actual implementation is in the customer-dashboard-unified.ts file)
