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

// Hash password using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const sql = neon(DATABASE_URL);

// Log exact values to compare with frontend
const emailToCheck = 'test@example.com';
const password = 'password123';
const hashedPassword = hashPassword(password);

async function debugRegistrationIssues() {
  try {
    // Step 1: Check if the email already exists
    console.log(`Step 1: Checking if email '${emailToCheck}' already exists...`);
    const existingUsers = await sql`
      SELECT id, name, email FROM users WHERE email = ${emailToCheck}
    `;
    
    if (existingUsers.length > 0) {
      console.log('User with this email already exists:', existingUsers[0]);
      console.log('This is why registration fails - the email is taken!');
    } else {
      console.log('No user found with this email!');
    }

    // Step 2: Check if email exact case matters
    console.log('\nStep 2: Testing case sensitivity...');
    const upperEmail = emailToCheck.toUpperCase();
    const upperCaseUsers = await sql`
      SELECT id, name, email FROM users WHERE email = ${upperEmail}
    `;
    
    if (upperCaseUsers.length > 0) {
      console.log('Email is NOT case sensitive, found user with different case:', upperCaseUsers[0]);
    } else {
      console.log('Email is case sensitive');
    }
    
    // Step 3: Try creating a user with a random email
    const randomEmail = `test_${Date.now()}@example.com`;
    console.log(`\nStep 3: Attempting to create a test user with '${randomEmail}'...`);
    
    try {
      const result = await sql`
        INSERT INTO users (
          name, 
          email, 
          password,
          role,
          user_type
        ) VALUES (
          'Debug Test User', 
          ${randomEmail}, 
          ${hashedPassword}, 
          'customer', 
          'customer'
        )
        RETURNING id, name, email
      `;
      
      if (result && result[0]) {
        console.log('User created successfully:', result[0]);
        console.log('Registration should work for new unique emails!');
      } else {
        console.log('Query executed but no user was created.');
      }
    } catch (error) {
      console.error('Error creating test user:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
    }
    
    // Step 4: Check database constraints
    console.log('\nStep 4: Checking database constraints on users table...');
    const constraints = await sql`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE t.relname = 'users'
      AND n.nspname = 'public'
    `;
    
    console.log('Constraints on users table:');
    constraints.forEach(c => console.log(`- ${c.conname} (${c.contype}): ${c.pg_get_constraintdef}`));
    
    // Step 5: Check all users in the database
    console.log('\nStep 5: Listing all users in the database:');
    const allUsers = await sql`SELECT id, name, email, role, user_type FROM users ORDER BY id`;
    allUsers.forEach(user => console.log(`- ${user.id}: ${user.name} (${user.email}) - ${user.role}/${user.user_type}`));
    
    console.log(`\nTotal users in database: ${allUsers.length}`);
    
    // Step 6: Test specific registration data from frontend
    console.log('\nStep 6: Test registration with the common input data:');
    const testRegistration = {
      name: 'Frontend Test User',
      email: `frontend_test_${Date.now()}@example.com`,
      password: hashedPassword,
      role: 'customer',
      user_type: 'customer'
    };
    
    console.log(`Testing with data: ${JSON.stringify({...testRegistration, password: '[HIDDEN]'})}`);
    
    try {
      const result = await sql`
        INSERT INTO users (name, email, password, role, user_type)
        VALUES (
          ${testRegistration.name},
          ${testRegistration.email},
          ${testRegistration.password},
          ${testRegistration.role},
          ${testRegistration.user_type}
        )
        RETURNING id, name, email
      `;
      
      console.log('Registration test successful:', result[0]);
    } catch (error) {
      console.error('Registration test failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
    }
  } catch (error) {
    console.error('General error in debug script:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

debugRegistrationIssues(); 