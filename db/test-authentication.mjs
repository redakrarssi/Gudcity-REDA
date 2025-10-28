// Script to test the authentication system
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

console.log('Database URL available, testing authentication...');
const sql = neon(DATABASE_URL);

// SHA-256 hash function (same as in test scripts)
function sha256Hash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Simplified version of the verifyPassword function from userService.ts
async function verifyPassword(plainPassword, hashedPassword) {
  try {
    // First try bcrypt
    try {
      const bcrypt = await import('bcryptjs');
      // Check if it's a bcrypt hash (starts with $2a$, $2b$, etc.)
      if (hashedPassword.startsWith('$2')) {
        console.log('Using bcrypt verification');
        return await bcrypt.compare(plainPassword, hashedPassword);
      }
    } catch (bcryptError) {
      console.log('bcryptjs not available, falling back to SHA-256');
    }
    
    // Fallback to SHA-256 hash for legacy passwords
    console.log('Using SHA-256 verification');
    const sha256Hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
    return sha256Hash === hashedPassword;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

// Simplified version of validateUser from userService.ts
async function validateUser(email, password) {
  try {
    console.log(`Attempting to validate user with email: ${email}`);
    const result = await sql`
      SELECT id, name, email, password, role 
      FROM users 
      WHERE email = ${email}
    `;
    
    if (!result || result.length === 0 || !result[0].password) {
      console.log('User not found or no password set');
      return null;
    }

    const user = result[0];
    console.log(`Found user: ${user.name} (${user.email}), role: ${user.role}`);
    
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      console.log('Password verification failed');
      return null;
    }

    console.log('Password verification successful!');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    console.error('Error validating user:', error);
    return null;
  }
}

async function testAuthentication() {
  try {
    // Test login with each demo account
    const testAccounts = [
      { email: 'admin@gudcity.com', password: 'password' },
      { email: 'customer@example.com', password: 'password' },
      { email: 'business@example.com', password: 'password' },
      // Test with wrong password
      { email: 'admin@gudcity.com', password: 'wrongpassword' }
    ];
    
    for (const account of testAccounts) {
      console.log(`\nTesting login for: ${account.email}`);
      const user = await validateUser(account.email, account.password);
      
      if (user) {
        console.log(`✅ Login successful for ${account.email}`);
        console.log(`User details: ${user.name} (ID: ${user.id}, Role: ${user.role})`);
      } else {
        console.log(`❌ Login failed for ${account.email}`);
      }
    }
    
  } catch (error) {
    console.error('Error during authentication test:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testAuthentication(); 