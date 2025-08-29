// Environment variables utility for server-side use
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// JWT configuration
export const JWT_SECRET = process.env.VITE_JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.VITE_JWT_REFRESH_SECRET;
export const JWT_EXPIRY = process.env.VITE_JWT_EXPIRY || '1h';
export const JWT_REFRESH_EXPIRY = process.env.VITE_JWT_REFRESH_EXPIRY || '7d';

// Database configuration
export const DATABASE_URL = process.env.VITE_DATABASE_URL;

// API configuration
export const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';
export const PORT = process.env.VITE_PORT || 3000;

// Security configuration
export const QR_SECRET_KEY = process.env.VITE_QR_SECRET_KEY;

// Environment
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const APP_ENV = process.env.VITE_APP_ENV || 'development';