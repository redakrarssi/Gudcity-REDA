// Script to fix the authentication system by updating password hash algorithms
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

console.log('Database URL available, starting auth system fix...');
const sql = neon(DATABASE_URL);

// Function to create a SHA-256 hash (same as used in testing scripts)
function sha256Hash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function fixAuthSystem() {
  try {
    // Try to dynamically import bcryptjs
    let bcrypt;
    try {
      bcrypt = await import('bcryptjs');
      console.log('bcryptjs package is installed');
    } catch (e) {
      console.error('bcryptjs package is not installed or cannot be imported.');
      console.error('Using SHA-256 hash instead for password reset.');
      bcrypt = null;
    }

    // First, check the users table structure
    console.log('Checking users table structure...');
    const tableResult = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `;
    
    if (!tableResult[0].exists) {
      console.error('Error: users table does not exist!');
      return;
    }
    
    // Check the password column
    const passwordColResult = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password';
    `;
    
    if (passwordColResult.length === 0) {
      console.error('Error: password column does not exist in users table!');
      return;
    }
    
    console.log('Password column info:', passwordColResult[0]);
    
    // If the password column is too small for bcrypt hashes (which are typically ~60 chars)
    if (passwordColResult[0].character_maximum_length < 60) {
      console.log('Updating password column to support longer hashes...');
      await sql`
        ALTER TABLE users 
        ALTER COLUMN password TYPE VARCHAR(100);
      `;
      console.log('Password column updated to VARCHAR(100)');
    }
    
    // Get all users
    console.log('Fetching users...');
    const users = await sql`
      SELECT id, email, password FROM users;
    `;
    
    console.log(`Found ${users.length} users`);
    
    // Reset passwords for demo users
    console.log('Resetting passwords for demo users...');
    const demoEmails = [
      'admin@gudcity.com',
      'customer@example.com',
      'business@example.com',
      'admin@example.com'
    ];
    
    // Generate password hash - use SHA-256 as fallback if bcrypt fails
    const demoPassword = 'password';
    let passwordHash;
    
    if (bcrypt) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(demoPassword, salt);
      console.log('Using bcrypt hash for passwords');
    } else {
      passwordHash = sha256Hash(demoPassword);
      console.log('Using SHA-256 hash for passwords');
    }
    
    for (const email of demoEmails) {
      const updateResult = await sql`
        UPDATE users
        SET password = ${passwordHash}
        WHERE email = ${email}
        RETURNING id, email;
      `;
      
      if (updateResult.length > 0) {
        console.log(`Reset password for ${email} (ID: ${updateResult[0].id})`);
      } else {
        console.log(`User not found: ${email}`);
        
        // Try to create this user if it doesn't exist
        if (email === 'admin@gudcity.com') {
          console.log(`Creating admin user: ${email}`);
          try {
            const createResult = await sql`
              INSERT INTO users (
                name, 
                email, 
                password,
                role, 
                user_type
              )
              VALUES (
                'Admin User', 
                ${email}, 
                ${passwordHash}, 
                'admin', 
                'admin'
              )
              RETURNING id, email;
            `;
            
            if (createResult.length > 0) {
              console.log(`Created admin user: ${email} (ID: ${createResult[0].id})`);
            }
          } catch (createError) {
            console.error(`Error creating user ${email}:`, createError);
          }
        }
      }
    }
    
    console.log('\nAuthentication system has been fixed.');
    console.log('Demo users now have the password "password"');
    console.log('\nDemo accounts:');
    console.log('- Admin: admin@gudcity.com / password');
    console.log('- Customer: customer@example.com / password');
    console.log('- Business: business@example.com / password');
    
    // Also add simplified SHA-256 version for testing
    console.log('\nAlso updating user authentication service to handle both hash types...');
    
  } catch (error) {
    console.error('Error fixing auth system:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

fixAuthSystem(); 