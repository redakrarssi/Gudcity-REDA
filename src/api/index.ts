import express from 'express';
import userRoutes from './userRoutes';
import businessRoutes from './businessRoutes';
import customerRoutes from './customerRoutes';
import adminRoutes from './adminRoutes';
import authRoutes from './authRoutes';
import directApiRoutes from './directApiRoutes'; // Add direct API routes

const router = express.Router();

// User routes (auth, profile, etc)
router.use('/users', userRoutes);

// Business routes (business management, loyalty programs, etc)
router.use('/businesses', businessRoutes);

// Customer routes (customer profile, loyalty cards, etc)
router.use('/customers', customerRoutes);

// Admin routes (system management, etc)
router.use('/admin', adminRoutes);

// Auth routes (login, register, etc)
router.use('/auth', authRoutes);

// Direct API routes (direct SQL operations for problematic endpoints)
router.use('/direct', directApiRoutes);

export default router; 