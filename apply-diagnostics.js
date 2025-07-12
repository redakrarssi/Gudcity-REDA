/**
 * Award Points System Diagnostics Script
 * 
 * This script applies diagnostic middleware to the server to help identify
 * issues with the award points system.
 * 
 * How to use:
 * 1. Add this file to your project
 * 2. Import it at the top of your server.ts file:
 *    import './apply-diagnostics.js';
 * 3. Restart your server
 * 4. Check the console logs for detailed diagnostics
 */

// Check if we're in a Node.js environment
if (typeof process !== 'undefined') {
  console.log('🔍 Award Points System Diagnostics Script Loaded');
  
  // Monkey patch Express Router to track route registration
  try {
    // Try to require Express
    const express = require('express');
    if (express && express.Router) {
      // Store original Router
      const originalRouter = express.Router;
      
      // Override Router to track route registration
      express.Router = function(...args) {
        const router = originalRouter.apply(this, args);
        
        // Store original route methods
        const originalMethods = {
          get: router.get,
          post: router.post,
          put: router.put,
          delete: router.delete,
          all: router.all
        };
        
        // Override route methods to track registration
        router.get = function(path, ...handlers) {
          console.log(`📝 Router: Registering GET ${path}`);
          return originalMethods.get.apply(this, [path, ...handlers]);
        };
        
        router.post = function(path, ...handlers) {
          console.log(`📝 Router: Registering POST ${path}`);
          return originalMethods.post.apply(this, [path, ...handlers]);
        };
        
        router.put = function(path, ...handlers) {
          console.log(`📝 Router: Registering PUT ${path}`);
          return originalMethods.put.apply(this, [path, ...handlers]);
        };
        
        router.delete = function(path, ...handlers) {
          console.log(`📝 Router: Registering DELETE ${path}`);
          return originalMethods.delete.apply(this, [path, ...handlers]);
        };
        
        router.all = function(path, ...handlers) {
          console.log(`📝 Router: Registering ALL ${path}`);
          return originalMethods.all.apply(this, [path, ...handlers]);
        };
        
        return router;
      };
      
      console.log('✅ Express Router monkey patched for diagnostics');
    }
  } catch (e) {
    console.error('❌ Failed to monkey patch Express Router:', e);
  }
  
  // Monkey patch app.use to track middleware registration
  try {
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    // Override require to intercept Express
    Module.prototype.require = function(path) {
      const result = originalRequire.apply(this, arguments);
      
      // Check if this is Express
      if (path === 'express' && result && typeof result === 'function') {
        // Store original express function
        const originalExpress = result;
        
        // Create wrapper function
        const expressWrapper = function() {
          const app = originalExpress.apply(this, arguments);
          
          // Store original use method
          const originalUse = app.use;
          
          // Override use method to track middleware registration
          app.use = function(path, ...handlers) {
            if (typeof path === 'function') {
              handlers.unshift(path);
              path = '*';
            }
            
            const handlerNames = handlers.map(h => h.name || 'anonymous').join(', ');
            console.log(`📝 App: Registering middleware at ${path}: ${handlerNames}`);
            
            // Special handling for award-points routes
            if (
              typeof path === 'string' && 
              (path.includes('award-points') || 
               (handlers[0] && handlers[0].toString && handlers[0].toString().includes('award-points')))
            ) {
              console.log('⚠️ AWARD POINTS ROUTE DETECTED:');
              console.log('⚠️ Path:', path);
              console.log('⚠️ Handlers:', handlerNames);
              
              // Print stack trace to see where this is being registered
              console.log('⚠️ Registration stack trace:');
              console.log(new Error().stack);
            }
            
            return originalUse.apply(this, [path, ...handlers]);
          };
          
          // Store original methods
          const originalMethods = {
            get: app.get,
            post: app.post,
            put: app.put,
            delete: app.delete,
            all: app.all
          };
          
          // Override route methods to track registration
          app.get = function(path, ...handlers) {
            console.log(`📝 App: Registering GET ${path}`);
            return originalMethods.get.apply(this, [path, ...handlers]);
          };
          
          app.post = function(path, ...handlers) {
            console.log(`📝 App: Registering POST ${path}`);
            
            // Special handling for award-points routes
            if (path.includes('award-points')) {
              console.log('⚠️ AWARD POINTS POST ROUTE DETECTED:');
              console.log('⚠️ Path:', path);
              console.log('⚠️ Handlers:', handlers.map(h => h.name || 'anonymous').join(', '));
              
              // Print stack trace to see where this is being registered
              console.log('⚠️ Registration stack trace:');
              console.log(new Error().stack);
            }
            
            return originalMethods.post.apply(this, [path, ...handlers]);
          };
          
          app.put = function(path, ...handlers) {
            console.log(`📝 App: Registering PUT ${path}`);
            return originalMethods.put.apply(this, [path, ...handlers]);
          };
          
          app.delete = function(path, ...handlers) {
            console.log(`📝 App: Registering DELETE ${path}`);
            return originalMethods.delete.apply(this, [path, ...handlers]);
          };
          
          app.all = function(path, ...handlers) {
            console.log(`📝 App: Registering ALL ${path}`);
            return originalMethods.all.apply(this, [path, ...handlers]);
          };
          
          return app;
        };
        
        // Copy properties from original express
        Object.keys(originalExpress).forEach(key => {
          expressWrapper[key] = originalExpress[key];
        });
        
        return expressWrapper;
      }
      
      return result;
    };
    
    console.log('✅ Module.require monkey patched for Express diagnostics');
  } catch (e) {
    console.error('❌ Failed to monkey patch Module.require:', e);
  }
  
  // Add process uncaught exception handler
  process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
    console.error('Stack trace:', err.stack);
  });
  
  // Add process unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
    if (reason instanceof Error) {
      console.error('Stack trace:', reason.stack);
    }
  });
  
  console.log('🔍 Award Points System Diagnostics Ready');
} 