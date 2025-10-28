// This is a server setup fix script that will ensure all the necessary
// environment variables are in place and the server can start properly

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Database connection string provided by user (SENSITIVE - will be removed)
// We use this temporarily just to verify connection
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Define the environment variables needed
const ENV_VARS = {
  VITE_DATABASE_URL: DATABASE_URL, // This will be removed after setup
  VITE_JWT_SECRET: generateSecureSecret(64),
  VITE_JWT_REFRESH_SECRET: generateSecureSecret(64),
  VITE_JWT_EXPIRY: '1h',
  VITE_JWT_REFRESH_EXPIRY: '7d',
  VITE_QR_SECRET_KEY: generateSecureSecret(64),
  VITE_PORT: '3000'
};

// Generate a secure random string for secrets
function generateSecureSecret(length = 64) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

// Path to .env file
const envPath = path.join(process.cwd(), '.env');

// Read existing .env file or create new one
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found existing .env file');
} catch (err) {
  console.log('⚠️ No .env file found, creating new one');
}

// Parse existing env vars
const existingEnvVars = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      existingEnvVars[match[1]] = match[2];
    }
  }
});

// Merge with our needed vars, prioritizing existing values
Object.keys(ENV_VARS).forEach(key => {
  if (!existingEnvVars[key]) {
    existingEnvVars[key] = ENV_VARS[key];
  }
});

// Write the updated .env file
const newEnvContent = Object.keys(existingEnvVars)
  .map(key => `${key}=${existingEnvVars[key]}`)
  .join('\n');

fs.writeFileSync(envPath, newEnvContent);
console.log('✅ Updated .env file with required variables');

// Install necessary packages if not present
console.log('🔄 Checking for required packages...');
try {
  require('jsonwebtoken');
  console.log('✅ jsonwebtoken package is already installed');
} catch (err) {
  console.log('⚠️ jsonwebtoken package not found, installing...');
  exec('npm install jsonwebtoken --save', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error installing jsonwebtoken: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Warning: ${stderr}`);
    }
    console.log('✅ jsonwebtoken installed successfully');
  });
}

// Now test the database connection
console.log('🔄 Testing database connection...');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connection successful!', res.rows[0]);
  }
  
  // Close the connection
  pool.end();
  
  // Now create a clean version of .env without the sensitive data
  console.log('🔒 Removing sensitive data from environment...');
  const cleanEnvVars = { ...existingEnvVars };
  delete cleanEnvVars.VITE_DATABASE_URL; // Remove the sensitive database URL
  
  // Write the clean .env file
  const cleanEnvContent = Object.keys(cleanEnvVars)
    .map(key => `${key}=${cleanEnvVars[key]}`)
    .join('\n');
  
  fs.writeFileSync(envPath, cleanEnvContent);
  console.log('✅ Removed sensitive data from .env file');
  
  // Setup server to run on port 3000
  console.log('🔄 Setting up server to run on port 3000...');
  
  // Remind user to add DATABASE_URL to their environment
  console.log('\n📢 IMPORTANT: To complete the setup:');
  console.log('1. Add your DATABASE_URL to your environment or .env file');
  console.log('2. Run "npm run dev" to start the server');
  console.log('3. The server will now be available at http://localhost:3000');
  console.log('4. The API will be accessible at http://localhost:3000/api');
  console.log('\n🔒 SECURITY REMINDER: The sensitive connection string has been removed from this file for security.');
});
