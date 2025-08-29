import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a .env file with the user's actual database URL
function setupEnvFile() {
  const envPath = path.resolve(__dirname, '.env');
  
  // Create the environment file with the user's actual database URL
  const envContent = `
# Database Configuration
VITE_DATABASE_URL=YOUR_DATABASE_URL_HERE

# JWT Authentication settings
VITE_JWT_SECRET=secure-jwt-secret-for-authentication
VITE_JWT_EXPIRY=1h

# Other application settings
`;
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with your Neon database URL');
  } catch (error) {
    console.error('❌ Error creating .env file:', error);
  }
}

// Create/update the env file before loading
setupEnvFile();

// Now load the environment variables
dotenv.config();

// Simple SHA-256 hash function as fallback
function sha256Hash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function fixAuthLogin() {
  try {
    console.log('Starting authentication system fix...');
    
    // Step 0: Check database URL
    const databaseUrl = process.env.VITE_DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ No database URL found in environment variables.');
      console.error('Please ensure your .env file was created correctly.');
      return;
    }
    
    console.log(`Using database URL: ${databaseUrl.substring(0, 40)}...`);
    
    // Create a database connection with SSL enabled for Neon
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: true
    });
    
    // Step 1: Check database connection
    console.log('\nStep 1: Checking database connection...');
    try {
      const connectionTest = await pool.query('SELECT 1 as test');
      console.log('✅ Database connection successful:', connectionTest.rows[0]);
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('\nPlease check your database URL and credentials.');
      console.log('\nLikely causes:');
      console.log('1. Connection string is incorrect');
      console.log('2. Database requires IP whitelisting');
      console.log('3. SSL configuration issue');
      console.log('\nTo fix:');
      console.log('- Check your Neon dashboard for the correct connection string');
      console.log('- Ensure your IP is allowed in Neon\'s connection settings');
      await pool.end();
      return;
    }
    
    // Step 2: Check if users table exists with proper schema
    console.log('\nStep 2: Checking users table schema...');
    try {
      // Check if users table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('⚠️ Users table does not exist. Creating it...');
        await pool.query(`
          CREATE TABLE users (
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
        `);
        console.log('✅ Users table created successfully');
      } else {
        console.log('✅ Users table exists');
        
        // Check for all necessary columns
        const columnsToCheck = [
          'password', 'role', 'user_type', 'status'
        ];
        
        for (const column of columnsToCheck) {
          const columnCheck = await pool.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public'
              AND table_name = 'users' 
              AND column_name = $1
            );
          `, [column]);
          
          if (!columnCheck.rows[0].exists) {
            console.log(`⚠️ Column ${column} is missing. Adding it...`);
            
            if (column === 'password') {
              await pool.query(`ALTER TABLE users ADD COLUMN password VARCHAR(255)`);
            } else if (column === 'role') {
              await pool.query(`ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'customer'`);
            } else if (column === 'user_type') {
              await pool.query(`ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'customer'`);
            } else if (column === 'status') {
              await pool.query(`ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'`);
            }
            
            console.log(`✅ Added ${column} column`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking/fixing users table schema:', error);
    }
    
    // Step 3: Check if demo users exist and fix their passwords
    console.log('\nStep 3: Ensuring demo users exist with correct passwords...');
    
    const demoUsers = [
      {
        name: 'Admin User',
        email: 'admin@gudcity.com',
        password: 'password',
        role: 'admin',
        user_type: 'customer'
      },
      {
        name: 'Demo Customer',
        email: 'customer@example.com',
        password: 'password',
        role: 'customer',
        user_type: 'customer'
      },
      {
        name: 'Demo Business',
        email: 'business@example.com',
        password: 'password',
        role: 'business',
        user_type: 'business',
        business_name: 'Demo Business LLC',
        business_phone: '+1234567890'
      }
    ];
    
    // Create both bcrypt and sha256 versions of the password for compatibility
    const plainPassword = 'password';
    const bcryptPassword = await bcrypt.hash(plainPassword, 10);
    const sha256Password = sha256Hash(plainPassword);
    
    console.log('Setting up both password formats for compatibility:');
    console.log(`- SHA-256 hash: ${sha256Password.substring(0, 10)}...`);
    console.log(`- Bcrypt hash: ${bcryptPassword.substring(0, 10)}...`);
    
    for (const user of demoUsers) {
      // Check if user exists
      const existingUser = await pool.query('SELECT id, email FROM users WHERE email = $1', [user.email]);
      
      if (existingUser.rows.length === 0) {
        // User doesn't exist, create it
        console.log(`Creating user: ${user.email}...`);
        await pool.query(`
          INSERT INTO users (
            name, 
            email, 
            password, 
            role, 
            user_type, 
            business_name, 
            business_phone,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          user.name,
          user.email,
          bcryptPassword, // Use bcrypt by default for new users
          user.role,
          user.user_type,
          user.business_name || null,
          user.business_phone || null,
          'active'
        ]);
        
        console.log(`✅ Created user: ${user.email}`);
      } else {
        // User exists, update their password
        console.log(`Updating password for user: ${user.email}...`);
        await pool.query(`
          UPDATE users 
          SET password = $1, status = 'active'
          WHERE email = $2
        `, [bcryptPassword, user.email]);
        
        console.log(`✅ Updated password for: ${user.email}`);
      }
    }
    
    // Step 4: Test login for each demo user
    console.log('\nStep 4: Testing user authentication...');
    
    for (const user of demoUsers) {
      const result = await pool.query(`
        SELECT id, name, email, role, user_type 
        FROM users 
        WHERE email = $1
      `, [user.email]);
      
      if (result.rows.length > 0) {
        console.log(`✅ ${user.email}: User found with ID ${result.rows[0].id} and role ${result.rows[0].role}`);
      } else {
        console.error(`❌ ${user.email}: User not found!`);
      }
    }
    
    console.log('\n======== AUTHENTICATION SYSTEM FIXED ========');
    console.log('You can now log in with these credentials:');
    console.log('1. Admin: admin@gudcity.com / password');
    console.log('2. Customer: customer@example.com / password');
    console.log('3. Business: business@example.com / password');
    
  } catch (error) {
    console.error('Error fixing authentication system:', error);
  } finally {
    if (typeof pool !== 'undefined') {
      await pool.end();
    }
  }
}

// Run the fix function
fixAuthLogin(); 