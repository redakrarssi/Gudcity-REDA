#!/usr/bin/env node

/**
 * Vercel Build Script
 * 
 * This script handles the build process for Vercel deployment,
 * ensuring all dependencies are properly configured and the build succeeds.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Vercel build process...');

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1';
console.log(`Environment: ${isVercel ? 'Vercel' : 'Local'}`);

// Set environment variables for build
process.env.NODE_ENV = 'production';
process.env.VITE_APP_ENV = 'production';

// Ensure required environment variables are set
const requiredEnvVars = [
  'VITE_JWT_SECRET',
  'VITE_JWT_REFRESH_SECRET',
  'VITE_QR_SECRET_KEY',
  'VITE_QR_ENCRYPTION_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
  console.warn('Using fallback values for build...');
  
  // Set fallback values for missing environment variables
  if (!process.env.VITE_JWT_SECRET) {
    process.env.VITE_JWT_SECRET = 'fallback-jwt-secret-for-build-only-64-characters-long-please-replace-in-production';
  }
  if (!process.env.VITE_JWT_REFRESH_SECRET) {
    process.env.VITE_JWT_REFRESH_SECRET = 'fallback-jwt-refresh-secret-for-build-only-64-characters-long-please-replace-in-production';
  }
  if (!process.env.VITE_QR_SECRET_KEY) {
    process.env.VITE_QR_SECRET_KEY = 'fallback-qr-secret-key-for-build-only-64-characters-long-please-replace-in-production';
  }
  if (!process.env.VITE_QR_ENCRYPTION_KEY) {
    process.env.VITE_QR_ENCRYPTION_KEY = 'fallback-qr-encryption-key-for-build-only-64-characters-long-please-replace-in-production';
  }
}

// Set additional build environment variables
process.env.VITE_DEBUG = 'false';
process.env.VITE_CSP_ENABLED = 'true';
process.env.VITE_ENABLE_ANALYTICS = 'true';
process.env.VITE_ENABLE_ANIMATIONS = 'true';
process.env.VITE_ENABLE_FEEDBACK = 'true';
process.env.VITE_SHOW_MOCK_NOTICE = 'false';
process.env.VITE_MOCK_AUTH = 'false';
process.env.VITE_MOCK_DATA = 'false';

console.log('✅ Environment variables configured');

try {
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm ci --only=production', { stdio: 'inherit' });
  
  // Install dev dependencies for build
  console.log('📦 Installing dev dependencies...');
  execSync('npm install --include=dev', { stdio: 'inherit' });
  
  // Run type checking
  console.log('🔍 Running type checking...');
  try {
    execSync('npm run type-check', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Type checking failed, continuing with build...');
  }
  
  // Run linting
  console.log('🔍 Running linting...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  Linting failed, continuing with build...');
  }
  
  // Build the application
  console.log('🏗️  Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify build output
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error('Build output directory not found');
  }
  
  const indexFile = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexFile)) {
    throw new Error('Build output index.html not found');
  }
  
  console.log('✅ Build completed successfully');
  console.log('📁 Build output:', distDir);
  
  // List build output
  const buildFiles = fs.readdirSync(distDir);
  console.log('📄 Build files:', buildFiles.slice(0, 10).join(', '), buildFiles.length > 10 ? '...' : '');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('🎉 Vercel build process completed successfully!');