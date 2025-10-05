/**
 * Secure External Request API Endpoints
 * 
 * Protected API endpoints for making external requests with comprehensive
 * SSRF protection and monitoring.
 */

import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { SecureHttpClient } from '../utils/secureHttpClient';
import { SSRFMonitoring } from '../utils/ssrfMonitoring';
import { SSRFProtection } from '../utils/ssrfProtection';

const router = Router();

/**
 * Secure webhook processing endpoint
 */
router.post('/webhook/process', 
  auth, // Require authentication
  async (req: Request, res: Response) => {
    try {
      const { url, data, method = 'POST' } = req.body;
      
      // Validate input
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          error: 'Valid URL required',
          code: 'INVALID_URL'
        });
      }
      
      if (!data) {
        return res.status(400).json({ 
          error: 'Request data required',
          code: 'MISSING_DATA'
        });
      }
      
      // Validate URL for SSRF protection
      const validation = await SSRFProtection.validateUrl(url);
      if (!validation.valid) {
        // Log SSRF attempt
        await SSRFMonitoring.logSSRFAttempt(
          url,
          req.user?.id?.toString(),
          validation.error || 'Invalid URL',
          req.ip,
          req.get('user-agent')
        );
        
        return res.status(400).json({ 
          error: 'Invalid URL: External requests are restricted for security',
          code: 'SSRF_PROTECTION',
          details: 'Only whitelisted domains are allowed'
        });
      }
      
      // Log legitimate request
      await SSRFMonitoring.logLegitimateRequest(
        url,
        req.user?.id?.toString(),
        req.ip,
        req.get('user-agent')
      );
      
      // Make secure external request
      const response = await SecureHttpClient.secureRequest(url, {
        method: method as any,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'GudCity-Webhook-Client/1.0'
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await response.text();
      
      res.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        url: validation.resolvedUrl
      });
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      
      if (error.message.includes('SSRF Protection')) {
        return res.status(400).json({ 
          error: 'Invalid URL: External requests are restricted for security',
          code: 'SSRF_PROTECTION'
        });
      }
      
      res.status(500).json({ 
        error: 'Webhook processing failed',
        code: 'PROCESSING_ERROR'
      });
    }
  }
);

/**
 * Secure image proxy endpoint
 */
router.get('/images/proxy', 
  auth, // Require authentication
  async (req: Request, res: Response) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          error: 'URL parameter required',
          code: 'MISSING_URL'
        });
      }
      
      // Validate URL for SSRF protection
      const validation = await SSRFProtection.validateUrl(url);
      if (!validation.valid) {
        // Log SSRF attempt
        await SSRFMonitoring.logSSRFAttempt(
          url,
          req.user?.id?.toString(),
          validation.error || 'Invalid URL',
          req.ip,
          req.get('user-agent')
        );
        
        return res.status(400).json({ 
          error: 'Invalid image URL: External requests are restricted',
          code: 'SSRF_PROTECTION'
        });
      }
      
      // Log legitimate request
      await SSRFMonitoring.logLegitimateRequest(
        url,
        req.user?.id?.toString(),
        req.ip,
        req.get('user-agent')
      );
      
      // Make secure external request
      const response = await SecureHttpClient.secureRequest(url, {
        method: 'GET'
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: 'Failed to fetch image',
          code: 'FETCH_ERROR'
        });
      }
      
      // Check if response is an image
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        return res.status(400).json({ 
          error: 'URL does not point to an image',
          code: 'NOT_IMAGE'
        });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Original-URL', validation.resolvedUrl!);
      
      // Stream response
      response.body.pipe(res);
      
    } catch (error) {
      console.error('Image proxy error:', error);
      
      if (error.message.includes('SSRF Protection')) {
        return res.status(400).json({ 
          error: 'Invalid image URL: External requests are restricted',
          code: 'SSRF_PROTECTION'
        });
      }
      
      res.status(500).json({ 
        error: 'Image proxy failed',
        code: 'PROXY_ERROR'
      });
    }
  }
);

/**
 * Secure external API call endpoint
 */
router.post('/external/call',
  auth, // Require authentication
  async (req: Request, res: Response) => {
    try {
      const { url, method = 'GET', headers = {}, body } = req.body;
      
      // Validate input
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          error: 'Valid URL required',
          code: 'INVALID_URL'
        });
      }
      
      // Validate URL for SSRF protection
      const validation = await SSRFProtection.validateUrl(url);
      if (!validation.valid) {
        // Log SSRF attempt
        await SSRFMonitoring.logSSRFAttempt(
          url,
          req.user?.id?.toString(),
          validation.error || 'Invalid URL',
          req.ip,
          req.get('user-agent')
        );
        
        return res.status(400).json({ 
          error: 'Invalid URL: External requests are restricted for security',
          code: 'SSRF_PROTECTION'
        });
      }
      
      // Log legitimate request
      await SSRFMonitoring.logLegitimateRequest(
        url,
        req.user?.id?.toString(),
        req.ip,
        req.get('user-agent')
      );
      
      // Make secure external request
      const response = await SecureHttpClient.secureRequest(url, {
        method: method as any,
        headers: {
          'User-Agent': 'GudCity-API-Client/1.0',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      const responseData = await response.text();
      
      res.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        url: validation.resolvedUrl
      });
      
    } catch (error) {
      console.error('External API call error:', error);
      
      if (error.message.includes('SSRF Protection')) {
        return res.status(400).json({ 
          error: 'Invalid URL: External requests are restricted for security',
          code: 'SSRF_PROTECTION'
        });
      }
      
      res.status(500).json({ 
        error: 'External API call failed',
        code: 'API_ERROR'
      });
    }
  }
);

/**
 * Validate URL endpoint (for client-side validation)
 */
router.post('/validate-url',
  auth, // Require authentication
  async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          error: 'URL parameter required',
          code: 'MISSING_URL'
        });
      }
      
      // Validate URL for SSRF protection
      const validation = await SSRFProtection.validateUrl(url);
      
      if (!validation.valid) {
        // Log SSRF attempt
        await SSRFMonitoring.logSSRFAttempt(
          url,
          req.user?.id?.toString(),
          validation.error || 'Invalid URL',
          req.ip,
          req.get('user-agent')
        );
      }
      
      res.json({
        valid: validation.valid,
        error: validation.error,
        resolvedUrl: validation.resolvedUrl,
        ipAddress: validation.ipAddress,
        hostname: validation.hostname
      });
      
    } catch (error) {
      console.error('URL validation error:', error);
      res.status(500).json({ 
        error: 'URL validation failed',
        code: 'VALIDATION_ERROR'
      });
    }
  }
);

/**
 * Get security statistics endpoint
 */
router.get('/security/stats',
  auth, // Require authentication
  async (req: Request, res: Response) => {
    try {
      // Check if user has admin privileges
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PRIVILEGES'
        });
      }
      
      const stats = await SSRFMonitoring.getSecurityStats();
      
      res.json({
        success: true,
        stats
      });
      
    } catch (error) {
      console.error('Security stats error:', error);
      res.status(500).json({ 
        error: 'Failed to get security statistics',
        code: 'STATS_ERROR'
      });
    }
  }
);

/**
 * Get blocked IPs endpoint
 */
router.get('/security/blocked-ips',
  auth, // Require authentication
  async (req: Request, res: Response) => {
    try {
      // Check if user has admin privileges
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PRIVILEGES'
        });
      }
      
      const blockedIPs = await SSRFMonitoring.getBlockedIPs();
      
      res.json({
        success: true,
        blockedIPs
      });
      
    } catch (error) {
      console.error('Blocked IPs error:', error);
      res.status(500).json({ 
        error: 'Failed to get blocked IPs',
        code: 'BLOCKED_IPS_ERROR'
      });
    }
  }
);

/**
 * Unblock IP endpoint
 */
router.post('/security/unblock-ip',
  auth, // Require authentication
  async (req: Request, res: Response) => {
    try {
      // Check if user has admin privileges
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PRIVILEGES'
        });
      }
      
      const { ipAddress } = req.body;
      
      if (!ipAddress || typeof ipAddress !== 'string') {
        return res.status(400).json({ 
          error: 'IP address required',
          code: 'MISSING_IP'
        });
      }
      
      const success = await SSRFMonitoring.unblockIP(ipAddress);
      
      if (success) {
        res.json({
          success: true,
          message: `IP ${ipAddress} unblocked successfully`
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to unblock IP',
          code: 'UNBLOCK_ERROR'
        });
      }
      
    } catch (error) {
      console.error('Unblock IP error:', error);
      res.status(500).json({ 
        error: 'Failed to unblock IP',
        code: 'UNBLOCK_ERROR'
      });
    }
  }
);

export default router;
