/**
 * Route Diagnostic Middleware
 * 
 * This middleware provides detailed diagnostics for route registration and middleware conflicts.
 * It's specifically designed to help troubleshoot 405 Method Not Allowed errors.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that logs detailed information about route handling
 */
export const routeDiagnosticMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to award-points routes
  if (req.originalUrl.includes('award-points')) {
    console.log('\n🔍 ROUTE DIAGNOSTIC: Award Points Request Detected 🔍');
    console.log(`📌 Timestamp: ${new Date().toISOString()}`);
    console.log(`📌 Method: ${req.method}`);
    console.log(`📌 URL: ${req.url}`);
    console.log(`📌 Original URL: ${req.originalUrl}`);
    console.log(`📌 Base URL: ${req.baseUrl}`);
    console.log(`📌 Path: ${req.path}`);
    
    // Log headers
    console.log('📌 Request Headers:');
    Object.keys(req.headers).forEach(key => {
      console.log(`   ${key}: ${req.headers[key]}`);
    });
    
    // Log body
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('📌 Request Body:');
      console.log(JSON.stringify(req.body, null, 2));
    }
    
    // Log route parameters
    if (req.params && Object.keys(req.params).length > 0) {
      console.log('📌 Route Parameters:');
      console.log(JSON.stringify(req.params, null, 2));
    }
    
    // Log query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      console.log('📌 Query Parameters:');
      console.log(JSON.stringify(req.query, null, 2));
    }
    
    // Log authentication status
    console.log('📌 Authentication Status:');
    console.log(`   User authenticated: ${!!req.user}`);
    if (req.user) {
      console.log(`   User ID: ${req.user.id}`);
      console.log(`   User Role: ${req.user.role}`);
    }
    
    // Override response methods to track the response
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    const originalEnd = res.end;
    
    // Track status code
    let statusCode = 200;
    
    // Override status method
    res.status = function(code) {
      statusCode = code;
      console.log(`📌 Response Status Set: ${code}`);
      return originalStatus.apply(this, [code]);
    };
    
    // Override send method
    res.send = function(body) {
      console.log(`📌 Response Sent (${statusCode}):`);
      if (typeof body === 'string') {
        try {
          const jsonBody = JSON.parse(body);
          console.log(JSON.stringify(jsonBody, null, 2));
        } catch (e) {
          console.log(body.length > 1000 ? body.substring(0, 1000) + '...' : body);
        }
      } else {
        console.log(body);
      }
      console.log('🔍 END ROUTE DIAGNOSTIC 🔍\n');
      return originalSend.apply(this, [body]);
    };
    
    // Override json method
    res.json = function(body) {
      console.log(`📌 JSON Response Sent (${statusCode}):`);
      console.log(JSON.stringify(body, null, 2));
      console.log('🔍 END ROUTE DIAGNOSTIC 🔍\n');
      return originalJson.apply(this, [body]);
    };
    
    // Override end method
    res.end = function(chunk) {
      console.log(`📌 Response Ended (${statusCode})`);
      if (chunk) {
        console.log(chunk);
      }
      console.log('🔍 END ROUTE DIAGNOSTIC 🔍\n');
      return originalEnd.apply(this, [chunk]);
    };
  }
  
  next();
};

/**
 * Middleware that specifically diagnoses 405 Method Not Allowed errors
 */
export const methodNotAllowedDiagnostic = (req: Request, res: Response, next: NextFunction) => {
  // Store original status method
  const originalStatus = res.status;
  
  // Override status method to detect 405 errors
  res.status = function(code) {
    if (code === 405) {
      console.log('\n⚠️ METHOD NOT ALLOWED (405) DETECTED ⚠️');
      console.log(`⚠️ Request: ${req.method} ${req.originalUrl}`);
      
      // Capture stack trace to help identify where the 405 is coming from
      const stackTrace = new Error().stack;
      console.log('⚠️ Stack trace:');
      console.log(stackTrace);
      
      // Check if Allow header is set
      const allowHeader = res.get('Allow');
      console.log(`⚠️ Allow header: ${allowHeader || 'NOT SET'}`);
      
      // If Allow header is not set, try to set it
      if (!allowHeader) {
        res.setHeader('Allow', 'POST');
        console.log('⚠️ Added missing Allow header: POST');
      }
    }
    
    return originalStatus.apply(this, [code]);
  };
  
  next();
};

/**
 * Function to print all registered routes in an Express app
 */
export function printRegisteredRoutes(app: any) {
  console.log('\n📋 REGISTERED ROUTES DIAGNOSTIC:');
  
  try {
    // Function to extract routes from a router stack
    const extractRoutes = (stack: any, basePath = '') => {
      const routes: any[] = [];
      
      stack.forEach((layer: any) => {
        if (layer.route) {
          // This is a route
          const path = basePath + (layer.route.path || '');
          const methods = Object.keys(layer.route.methods || {})
            .filter((method: string) => layer.route.methods[method]);
            
          routes.push({
            path,
            methods,
            stack: layer.route.stack?.map((s: any) => ({
              name: s.name,
              handle: s.handle?.name || 'anonymous'
            }))
          });
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          // This is a router middleware
          const routerBasePath = basePath + (layer.regexp.source !== '(?:/|\\/$)' ? 
            layer.regexp.source.replace(/\\/g, '').replace(/\?\(\.\*\)\?/g, '') : 
            '');
            
          routes.push(...extractRoutes(layer.handle.stack, routerBasePath));
        } else {
          // This is a middleware
          routes.push({
            path: basePath + (layer.regexp ? layer.regexp.source : '*'),
            middleware: layer.name,
            handle: layer.handle?.name || 'anonymous'
          });
        }
      });
      
      return routes;
    };
    
    // Extract and log all routes
    if (app._router && app._router.stack) {
      const routes = extractRoutes(app._router.stack);
      
      console.log(`Found ${routes.length} routes and middleware:`);
      routes.forEach((route, i) => {
        if (route.methods) {
          console.log(`${i + 1}. ROUTE: ${route.methods.join(', ')} ${route.path}`);
          if (route.stack) {
            console.log(`   Handlers: ${route.stack.map((s: any) => s.handle).join(', ')}`);
          }
        } else {
          console.log(`${i + 1}. MIDDLEWARE: ${route.middleware || 'anonymous'} (${route.handle}) - ${route.path}`);
        }
      });
    } else {
      console.log('No routes found or router not initialized');
    }
  } catch (e) {
    console.error('Error printing registered routes:', e);
  }
  
  console.log('📋 END REGISTERED ROUTES DIAGNOSTIC\n');
}

/**
 * Middleware to specifically diagnose award-points endpoint issues
 */
export const awardPointsDiagnosticMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.originalUrl.includes('/award-points') || 
    req.path.includes('/award-points')
  ) {
    console.log('\n🎯 AWARD POINTS ENDPOINT ACCESSED 🎯');
    console.log(`🎯 Method: ${req.method}`);
    console.log(`🎯 URL: ${req.originalUrl}`);
    
    // Check if this is the direct handler
    const isDirect = req.originalUrl.includes('/direct/');
    console.log(`🎯 Is direct handler: ${isDirect}`);
    
    // Check authentication
    console.log(`🎯 Is authenticated: ${!!req.user}`);
    
    // Check body parser
    console.log(`🎯 Body parsed: ${!!req.body && typeof req.body === 'object'}`);
    
    // Check content type
    console.log(`🎯 Content-Type: ${req.headers['content-type']}`);
    
    // Check if OPTIONS request
    if (req.method === 'OPTIONS') {
      console.log('🎯 OPTIONS request detected - should be handled by CORS middleware');
    }
    
    // Check if POST request
    if (req.method === 'POST') {
      console.log('🎯 POST request detected - should be handled by award points handler');
    }
  }
  
  next();
};

/**
 * Apply all diagnostic middleware to the app
 */
export function applyDiagnosticMiddleware(app: any) {
  console.log('🔧 Applying diagnostic middleware...');
  
  // Apply the diagnostic middleware
  app.use(routeDiagnosticMiddleware);
  app.use(methodNotAllowedDiagnostic);
  app.use(awardPointsDiagnosticMiddleware);
  
  // Print all registered routes
  printRegisteredRoutes(app);
  
  console.log('✅ Diagnostic middleware applied');
} 