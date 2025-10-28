import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to log and diagnose API requests
 */
export const apiRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, body } = req;
  
  // Log basic request info
  console.log(`API Request: ${method} ${url}`);
  
  // Add a response listener to log the outcome
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    console.log(`API Response: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`);
    
    // Special handling for 405 errors
    if (statusCode === 405) {
      console.error(`405 Method Not Allowed Error: ${method} ${url}`);
      console.error('This typically indicates a route configuration issue or middleware conflict');
      console.error('Check that the route is properly registered with the correct HTTP method');
      console.error('Also verify that no middleware is blocking this request method');
    }
  });
  
  next();
};

/**
 * Middleware to handle CORS and preflight requests
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Allow all origins for development (restrict this in production)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

/**
 * Middleware to properly handle 405 errors
 */
export const methodNotAllowedHandler = (req: Request, res: Response, next: NextFunction) => {
  // Store original methods
  const originalStatus = res.status;
  
  // Override status to intercept 405 responses
  res.status = function(code) {
    if (code === 405) {
      console.warn(`405 Method Not Allowed intercepted: ${req.method} ${req.url}`);
      
      // Add proper Allow header if missing
      if (!res.get('Allow')) {
        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      }
      
      // Enhance 405 responses with more helpful information
      return originalStatus.call(this, 405)
        .json({
          error: 'Method Not Allowed',
          message: `${req.method} is not allowed for this resource`,
          allowedMethods: res.get('Allow'),
          path: req.url,
          helpText: 'This error typically indicates a route configuration issue or middleware conflict'
        });
    }
    
    return originalStatus.call(this, code);
  };
  
  next();
}; 