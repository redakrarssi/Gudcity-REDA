/**
 * Authentication Token API Routes
 * 
 * Server-side routes for JWT token operations
 * Following reda.md security guidelines
 */

import { Router } from 'express';
import {
  generateTokens,
  verifyToken,
  refreshTokens,
  revokeUserTokens
} from './authTokenHandler';

const router = Router();

// Generate new JWT tokens (called after successful login)
router.post('/generate-tokens', generateTokens);

// Verify an access token
router.post('/verify-token', verifyToken);

// Refresh access token using refresh token
router.post('/refresh-token', refreshTokens);

// Revoke all tokens for a user (logout)
router.post('/revoke-tokens', revokeUserTokens);

export default router;

