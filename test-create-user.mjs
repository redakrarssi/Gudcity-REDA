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

// Hash password using SHA-256 (for demo purposes - use bcrypt in production)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function testCreateUser() {
  try {
    // Generate a random email to avoid duplicates
    const randomSuffix = Math.floor(Math.random() * 10000);
    const testUser = {
      name: 'Test User',
      email: `test${randomSuffix}@example.com`,
      password: hashPassword('password123'),
      role: 'customer',
      user_type: 'customer'
    };
    
    console.log(`Attempting to create user with email: ${testUser.email}`);
    
    // First check if a user with this email already exists
    const existingUser = await sql`
      SELECT id, email FROM users WHERE email = ${testUser.email}
    `;
    
    if (existingUser.length > 0) {
      console.error('User with this email already exists:', existingUser);
      return;
    }
    
    console.log('No existing user found with this email, proceeding with creation...');
    
    // Try to insert the user
    try {
      const result = await sql`
        INSERT INTO users (
          name, 
          email, 
          password,
          role, 
          user_type
        )
        VALUES (
          ${testUser.name}, 
          ${testUser.email}, 
          ${testUser.password}, 
          ${testUser.role}, 
          ${testUser.user_type}
        )
        RETURNING id, name, email, role, user_type, created_at
      `;
      
      console.log('User created successfully:', result[0]);
    } catch (insertError) {
      console.error('Error during SQL INSERT:', insertError);
      if (insertError.message) {
        console.error('Error message:', insertError.message);
      }
      
      // Check if there's a constraint violation
      if (insertError.code === '23505') {
        console.error('Duplicate key violation (email already exists)');
      }
    }
    
    // Check if the user was actually created
    const createdUser = await sql`
      SELECT id, name, email FROM users WHERE email = ${testUser.email}
    `;
    
    if (createdUser.length > 0) {
      console.log('Confirmed user exists in database:', createdUser[0]);
    } else {
      console.error('Failed to find user in database after creation attempt');
    }
    
    // List all columns in the users table
    console.log('\nUsers table columns:');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
    `;
    columns.forEach(col => console.log(`${col.column_name} (${col.data_type})`));
    
    // List some users to check
    console.log('\nExisting users:');
    const users = await sql`SELECT id, name, email, role, user_type FROM users LIMIT 5`;
    users.forEach(user => console.log(`${user.id}: ${user.name} (${user.email})`));
    
  } catch (error) {
    console.error('Error in testCreateUser:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testCreateUser(); 