import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';

// Script to create .env file with proper configurations
console.log('Creating .env file with proper database configuration...');
try {
  const envContent = `# Database Configuration
VITE_DATABASE_URL=postgres://default:defaultpassword@localhost:5432/gudcity

# JWT Configuration
VITE_JWT_SECRET=jwt-secret-for-authentication-change-in-production
VITE_JWT_REFRESH_SECRET=jwt-refresh-secret-for-authentication-change-in-production
VITE_JWT_EXPIRY=1h
VITE_JWT_REFRESH_EXPIRY=7d

# Application Configuration
VITE_PORT=3000
VITE_APP_URL=http://localhost:5173
`;

  writeFileSync('.env.local', envContent);
  console.log('.env.local file created successfully with the proper database connection string');
} catch (error) {
  console.error('Failed to create .env.local file:', error.message);
}

// Hardcoded DATABASE_URL for testing
// In a real environment, this should be loaded from environment variables
const DATABASE_URL = 'postgres://default:defaultpassword@localhost:5432/gudcity';

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

// Hash password using SHA-256 (for script purposes only)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const sql = neon(DATABASE_URL);

async function fixAuthIssues() {
  try {
    console.log('Starting authentication system repair...');
    console.log('Using database URL:', DATABASE_URL);
    
    // Step 1: Verify database connection
    console.log('\nStep 1: Verifying database connection...');
    try {
      const result = await sql`SELECT 1 as connected`;
      console.log('Database connection successful:', result[0]);
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return;
    }
    
    // Step 2: Check and fix users table structure
    console.log('\nStep 2: Checking users table structure...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255),
          role VARCHAR(50) DEFAULT 'customer',
          user_type VARCHAR(50) DEFAULT 'customer',
          business_name VARCHAR(255),
          business_phone VARCHAR(100),
          avatar_url VARCHAR(500),
          reset_token VARCHAR(255),
          reset_token_expires TIMESTAMP,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'active'
        )
      `;
      console.log('Users table structure verified/created');
    } catch (tableError) {
      console.error('Error creating/verifying users table:', tableError);
    }
    
    // Step 3: Check for email case sensitivity issues
    console.log('\nStep 3: Checking for email case sensitivity issues...');
    const duplicateEmails = await sql`
      SELECT LOWER(email) as lower_email, COUNT(*) 
      FROM users 
      GROUP BY LOWER(email) 
      HAVING COUNT(*) > 1
    `;
    
    if (duplicateEmails.length > 0) {
      console.log(`Found ${duplicateEmails.length} case-insensitive email duplicates`);
      for (const dup of duplicateEmails) {
        console.log(`- ${dup.lower_email} appears ${dup.count} times`);
        
        // Get all users with this email (case insensitive)
        const users = await sql`
          SELECT id, email, created_at
          FROM users
          WHERE LOWER(email) = LOWER(${dup.lower_email})
          ORDER BY created_at ASC
        `;
        
        // Keep the oldest account, delete newer duplicates
        if (users.length > 1) {
          const keepUser = users[0];
          console.log(`  Keeping oldest user: ${keepUser.email} (ID: ${keepUser.id})`);
          
          for (let i = 1; i < users.length; i++) {
            console.log(`  Deleting duplicate: ${users[i].email} (ID: ${users[i].id})`);
            await sql`DELETE FROM users WHERE id = ${users[i].id}`;
          }
        }
      }
    } else {
      console.log('No case-insensitive email duplicates found');
    }
    
    // Step 4: Create demo users if they don't exist
    console.log('\nStep 4: Creating demo users if needed...');
    const demoUsers = [
      { email: 'admin@gudcity.com', name: 'Admin User', password: 'password', role: 'admin', user_type: 'customer' },
      { email: 'customer@example.com', name: 'Demo Customer', password: 'password', role: 'customer', user_type: 'customer' },
      { email: 'business@example.com', name: 'Demo Business', password: 'password', role: 'business', user_type: 'business', business_name: 'Demo Business LLC', business_phone: '+1234567890' }
    ];
    
    for (const user of demoUsers) {
      const existingUser = await sql`
        SELECT id FROM users WHERE LOWER(email) = LOWER(${user.email})
      `;
      
      if (existingUser.length === 0) {
        const hashedPassword = hashPassword(user.password);
        await sql`
          INSERT INTO users (name, email, password, role, user_type, business_name, business_phone)
          VALUES (
            ${user.name}, 
            ${user.email}, 
            ${hashedPassword}, 
            ${user.role}, 
            ${user.user_type}, 
            ${user.business_name || null}, 
            ${user.business_phone || null}
          )
        `;
        console.log(`Created demo user: ${user.email}`);
      } else {
        console.log(`Demo user ${user.email} already exists`);
      }
    }
    
    // Step 5: Verify all is working
    console.log('\nStep 5: Verifying user authentication system...');
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`Total users in database: ${userCount[0].count}`);
    
    console.log('\nAuthentication system repair complete!');
    console.log('\nDemo accounts available for testing:');
    console.log('- admin@gudcity.com / password');
    console.log('- customer@example.com / password');
    console.log('- business@example.com / password');
    
  } catch (error) {
    console.error('Error fixing authentication issues:', error);
  }
}

fixAuthIssues(); 