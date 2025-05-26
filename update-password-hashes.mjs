import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { readFileSync } from 'fs';

// Manually load the .env.local file
try {
  const envFile = readFileSync('.env.local', 'utf8');
  const envVars = envFile.split('\n').filter(line => line.trim() !== '');
  
  for (const line of envVars) {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  }
} catch (error) {
  console.error('Error loading .env.local file:', error.message);
}

const DATABASE_URL = process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Node.js server-side hash function (uses crypto)
function nodeHashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Browser-compatible hash function (simulate the Web Crypto API output)
async function browserHashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function updatePasswordHashes() {
  try {
    // Get all test users
    console.log('Fetching test users...');
    const testUsers = await sql`
      SELECT id, email FROM users 
      WHERE email IN ('test@example.com', 'working_test@example.com', 'admin@example.com', 'customer@example.com', 'business@example.com')
    `;
    
    console.log(`Found ${testUsers.length} test users to update passwords for`);
    
    // The plain text password for our test users
    const plainPassword = 'password123';
    
    // Generate the browser-compatible hash
    const browserHash = await browserHashPassword(plainPassword);
    console.log(`Generated browser-compatible hash: ${browserHash}`);
    
    // Update each test user's password hash
    for (const user of testUsers) {
      console.log(`Updating password hash for user: ${user.email}`);
      await sql`UPDATE users SET password = ${browserHash} WHERE id = ${user.id}`;
    }
    
    console.log('Password hashes updated successfully!');
    
    // Verify the updates
    const updatedUsers = await sql`
      SELECT id, email, password FROM users
      WHERE email IN ('test@example.com', 'working_test@example.com', 'admin@example.com', 'customer@example.com', 'business@example.com')
    `;
    
    console.log('Updated user passwords:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.password}`);
    });
    
    console.log('\nYou can now log in with these users using password: "password123"');
    
  } catch (error) {
    console.error('Error updating password hashes:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

updatePasswordHashes(); 