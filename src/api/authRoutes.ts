/**
 * Authentication API Routes
 * Combines all authentication-related endpoints
 * Following reda.md security guidelines
 */

import { Router } from 'express';
import authTokenRoutes from './authTokenRoutes';

const router = Router();

// Register token management routes
// These handle JWT token generation, verification, refresh, and revocation
router.use('/', authTokenRoutes);

console.log('✅ Registered auth token routes');

export default router;

