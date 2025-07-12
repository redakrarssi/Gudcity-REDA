import { Request, Response, NextFunction } from 'express';

/**
 * Detailed route debugging middleware
 * This middleware logs extensive information about incoming requests
 * to help diagnose routing issues.
 */
export const routeDebugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('\n🔍 ROUTE DEBUG 🔍');
  console.log(`📥 Request: ${req.method} ${req.url}`);
  console.log(`📝 Original URL: ${req.originalUrl}`);
  console.log(`🔄 Base URL: ${req.baseUrl}`);
  console.log(`🛣️ Path: ${req.path}`);
  
  // Log headers
  console.log('📋 Headers:');
  Object.keys(req.headers).forEach(key => {
    console.log(`   ${key}: ${req.headers[key]}`);
  });
  
  // Log body if present
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:');
    console.log(JSON.stringify(req.body, null, 2));
  }
  
  // Log route parameters
  if (req.params && Object.keys(req.params).length > 0) {
    console.log('🔢 Route Parameters:');
    console.log(JSON.stringify(req.params, null, 2));
  }

  // Log query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('❓ Query Parameters:');
    console.log(JSON.stringify(req.query, null, 2));
  }

  // Capture Express route stack trace
  const getStackInfo = () => {
    try {
      // Get access to the underlying Express router stack (if possible)
      const router = req.app._router;
      if (router && router.stack) {
        const matchingLayers = router.stack
          .filter((layer: any) => {
            return layer.route && 
              (layer.route.path === req.path || 
               layer.route.path === req.originalUrl ||
               layer.route.path === req.baseUrl + req.path);
          })
          .map((layer: any) => {
            return {
              path: layer.route?.path,
              methods: layer.route?.methods || {}
            };
          });
          
        if (matchingLayers.length > 0) {
          console.log('🛣️ Matching Routes Found:');
          console.log(JSON.stringify(matchingLayers, null, 2));
        } else {
          console.log('⚠️ No matching routes found in router stack');
        }
      }
    } catch (e) {
      console.log('❌ Error accessing route information:', e);
    }
  };
  
  // Get route stack info
  getStackInfo();
  
  // Save the start time for response timing
  const startTime = Date.now();

  // Override res.send to log response info
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    console.log(`📤 Response Status: ${res.statusCode}`);
    console.log(`⏱️ Response Time: ${responseTime}ms`);
    console.log('🔍 END ROUTE DEBUG 🔍\n');
    return originalSend.apply(res, [body]);
  };

  next();
};

/**
 * Special middleware specifically for debugging award-points route
 */
export const awardPointsDebugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.originalUrl.includes('/award-points') || 
    req.path.includes('/award-points') ||
    req.url.includes('/award-points')
  ) {
    console.log('\n🚨 AWARD POINTS ROUTE DEBUG 🚨');
    console.log(`📌 Method: ${req.method}`);
    console.log(`📌 Original URL: ${req.originalUrl}`);
    console.log(`📌 Base URL: ${req.baseUrl}`);
    console.log(`📌 Path: ${req.path}`);
    console.log(`📌 Route: ${req.route ? JSON.stringify(req.route) : 'Not available'}`);
    
    // Log headers related to auth and content
    console.log('📌 Important Headers:');
    ['content-type', 'authorization', 'accept'].forEach(key => {
      if (req.headers[key]) {
        console.log(`   ${key}: ${req.headers[key]}`);
      } else {
        console.log(`   ${key}: MISSING`);
      }
    });
    
    // Log body
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('📌 Body:');
      console.log(JSON.stringify(req.body, null, 2));
    } else {
      console.log('📌 Body: EMPTY OR NOT PARSED');
    }
  }
  
  next();
};

/**
 * Middleware to log all registered routes on app initialization
 */
export const logRegisteredRoutes = (app: any) => {
  console.log('\n📋 REGISTERED ROUTES:');
  
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
            methods
          });
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          // This is a router middleware
          const routerBasePath = basePath + (layer.regexp.source !== '(?:/|\\/$)' ? 
            layer.regexp.source.replace(/\\/g, '').replace(/\?\(\.\*\)\?/g, '') : 
            '');
            
          routes.push(...extractRoutes(layer.handle.stack, routerBasePath));
        }
      });
      
      return routes;
    };
    
    // Extract and log all routes
    if (app._router && app._router.stack) {
      const routes = extractRoutes(app._router.stack);
      
      console.log(`Found ${routes.length} routes:`);
      routes.forEach((route, i) => {
        console.log(`${i + 1}. ${route.methods.join(', ')} ${route.path}`);
      });
    } else {
      console.log('No routes found or router not initialized');
    }
  } catch (e) {
    console.error('Error logging registered routes:', e);
  }
  
  console.log('📋 END REGISTERED ROUTES\n');
}; 