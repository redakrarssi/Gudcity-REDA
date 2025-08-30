#!/usr/bin/env node

// Setup script for fixing admin businesses JWT and database issues
// This script will guide you through the setup process

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log(`
🔧 ADMIN BUSINESSES FIX SETUP
=============================

This script will help you fix the JWT authentication and database connection issues.

Step 1: Create .env file
`);

const envContent = `VITE_API_URL=http://localhost:3000
VITE_DATABASE_URL=postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL=postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_long_development_only
VITE_JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_long_development_only
JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret_minimum_32_characters_long_development_only
VITE_JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret_minimum_32_characters_long_development_only
FRONTEND_URL=http://localhost:5173`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✅ Created .env file with database credentials and JWT placeholders');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}

console.log(`
Step 2: Generate secure JWT secrets
`);

try {
  console.log('🔄 Running server fix script to generate secure JWT secrets...');
  const output = execSync('node src/server-fix.mjs', { encoding: 'utf8', stdio: 'pipe' });
  console.log(output);
  console.log('✅ JWT secrets generated successfully');
} catch (error) {
  console.error('❌ Error running server fix script:', error.message);
  if (error.stdout) console.log('Output:', error.stdout);
  if (error.stderr) console.error('Error output:', error.stderr);
}

console.log(`
🎯 NEXT STEPS:
==============

1. Start the API server in a terminal:
   npm run api:server

2. Start the frontend in another terminal:
   npm run dev

3. Navigate to /admin/businesses in your browser

4. You should see:
   ✅ Database connected successfully
   ✅ Businesses and programs displayed
   ✅ No authentication errors

🔒 SECURITY REMINDER:
After testing, delete the .env file to protect your database credentials:
   rm .env
   # or
   del .env

The admin businesses page should now work correctly with proper JWT authentication and database connectivity.
`);
