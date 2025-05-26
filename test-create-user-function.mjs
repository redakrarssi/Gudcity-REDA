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

// Create SQL client
const sql = neon(DATABASE_URL);

// Hash password function - same as in userService.ts
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Simplified getUserByEmail function from userService.ts
async function getUserByEmail(email) {
  try {
    console.log(`Checking for user with email: ${email}`);
    const result = await sql`
      SELECT id, name, email, password, role, user_type, business_name, business_phone, avatar_url, created_at, last_login 
      FROM users WHERE email = ${email}
    `;
    
    console.log(`Query result for email ${email}:`, result);
    
    if (!result || result.length === 0) {
      console.log(`No user found with email: ${email}`);
      return null;
    }
    
    const user = result[0];
    console.log(`User found with email ${email}:`, { 
      id: user.id, 
      name: user.name, 
      email: user.email
    });
    
    return user;
  } catch (error) {
    console.error(`Error fetching user with email ${email}:`, error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

// Simplified createUser function from userService.ts
async function createUser(user) {
  try {
    console.log('Starting createUser with email:', user.email);
    
    // Check if email already exists
    console.log('Checking if email already exists...');
    const existingUser = await getUserByEmail(user.email);
    if (existingUser) {
      console.error('User with email already exists:', existingUser.email);
      return null;
    }

    // Hash password if provided
    console.log('Hashing password...');
    const hashedPassword = user.password ? hashPassword(user.password) : undefined;

    console.log('Executing INSERT query...');
    try {
      const result = await sql`
        INSERT INTO users (
          name, 
          email, 
          password,
          role, 
          user_type, 
          business_name, 
          business_phone, 
          avatar_url
        )
        VALUES (
          ${user.name}, 
          ${user.email}, 
          ${hashedPassword || ''}, 
          ${user.role || 'customer'}, 
          ${user.user_type || 'customer'}, 
          ${user.business_name || null}, 
          ${user.business_phone || null}, 
          ${user.avatar_url || null}
        )
        RETURNING id, name, email, role, user_type, business_name, business_phone, avatar_url, created_at
      `;
      
      console.log('INSERT query successful, result:', result);
      return result[0];
    } catch (insertError) {
      console.error('Error during SQL INSERT:', insertError);
      if (insertError instanceof Error) {
        console.error('Insert error message:', insertError.message);
      }
      throw insertError;
    }
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

// Test the createUser function with the same flow as AuthContext
async function testCreateUserFunction() {
  try {
    console.log('Testing createUser function...');
    
    // Generate a unique email for testing
    const testEmail = `test_create_user_${Date.now()}@example.com`;
    
    // Define test user data (similar to RegisterData from AuthContext)
    const testData = {
      name: 'Test Create User',
      email: testEmail,
      password: 'password123',
      role: 'customer',
      user_type: 'customer'
    };
    
    console.log('Test data:', { ...testData, password: '[HIDDEN]' });
    
    // Try to create the user
    const createdUser = await createUser(testData);
    
    if (createdUser) {
      console.log('User created successfully:', createdUser);
      
      // Try creating the same user again to test duplicate email handling
      console.log('\nTrying to create the same user again (should fail)...');
      const duplicateUser = await createUser(testData);
      
      if (duplicateUser) {
        console.error('ERROR: Duplicate user creation succeeded but should have failed!');
      } else {
        console.log('Properly failed to create duplicate user');
      }
    } else {
      console.error('Failed to create new user');
    }
    
    // Try creating a user with missing fields
    console.log('\nTrying to create a user with missing password...');
    const incompleteData = {
      name: 'Incomplete User',
      email: `incomplete_${Date.now()}@example.com`
      // missing password
    };
    
    const incompleteUser = await createUser(incompleteData);
    if (incompleteUser) {
      console.log('Created user with defaults for missing fields:', incompleteUser);
    } else {
      console.error('Failed to create user with missing fields');
    }
    
  } catch (error) {
    console.error('Test error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testCreateUserFunction(); 