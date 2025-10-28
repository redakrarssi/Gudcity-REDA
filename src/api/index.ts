import express from 'express';
import userRoutes from './userRoutes';
import businessRoutes from './businessRoutes';
import customerRoutes from './customerRoutes';
import adminBusinessRoutes from './adminBusinessRoutes';
import authRoutes from './authRoutes';
import directApiRoutes from './directApiRoutes'; // Add direct API routes
import testRoutes from './testRoutes'; // Add test routes for debugging

const router = express.Router();

// Log all route registrations for debugging
console.log('📋 Registering API routes in index.ts');

// User routes (auth, profile, etc)
router.use('/users', userRoutes);
console.log('✅ Registered user routes at /api/users');

// Business routes (business management, loyalty programs, etc)
// Debug the business routes registration
console.log('🔍 Registering business routes');
console.log('🔍 Business routes object:', businessRoutes);
// Explicitly register each business route method to ensure they're properly set up
router.use('/businesses', businessRoutes);
console.log('✅ Registered business routes at /api/businesses');

// Special direct route for award points to avoid conflicts
router.post('/businesses/award-points-direct', (req, res) => {
  console.log('🎯 Direct award-points route in index.ts accessed');
  
  // Forward to the business routes handler
  const originalUrl = req.originalUrl;
  req.originalUrl = '/api/businesses/award-points'; // Modify URL to match expected
  
  return businessRoutes(req, res, () => {
    // This will execute if no route handler is found
    console.log('No route handler found in business routes for award-points-direct');
    res.status(404).json({
      error: 'Route handler not found',
      method: req.method,
      path: originalUrl
    });
  });
});
console.log('✅ Registered special direct award points route at /api/businesses/award-points-direct');

// Customer routes (customer profile, loyalty cards, etc)
router.use('/customers', customerRoutes);
console.log('✅ Registered customer routes at /api/customers');

// Admin routes (system management, etc)
router.use('/admin', adminBusinessRoutes);
console.log('✅ Registered admin business routes at /api/admin');

// Auth routes (login, register, etc)
router.use('/auth', authRoutes);
console.log('✅ Registered auth routes at /api/auth');

// Direct API routes (direct SQL operations for problematic endpoints)
router.use('/direct', directApiRoutes);
console.log('✅ Registered direct API routes at /api/direct');

// Test routes (for debugging)
router.use('/debug-test', testRoutes);
console.log('✅ Registered test routes at /api/debug-test');

export default router; 