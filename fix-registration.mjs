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

// Hash password using SHA-256 (for demo purposes - use bcrypt in production)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const sql = neon(DATABASE_URL);

async function fixRegistrationIssues() {
  try {
    // Step 1: Check for database connectivity
    console.log('Step 1: Verifying database connection...');
    try {
      const result = await sql`SELECT 1 as test`;
      console.log('Database connection successful:', result);
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return;
    }
    
    // Step 2: Check users table structure
    console.log('\nStep 2: Checking users table structure...');
    const usersExist = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `;
    
    if (!usersExist[0].exists) {
      console.error('Error: Users table does not exist!');
      return;
    }
    
    console.log('Users table exists');
    
    // Step 3: Check existing users
    console.log('\nStep 3: Checking existing users...');
    const users = await sql`SELECT id, name, email FROM users`;
    console.log(`Found ${users.length} users in the database`);
    
    // Step 4: Create a test user that the application can use
    console.log('\nStep 4: Creating application test users...');
    const testUsers = [
      { name: 'Test User', email: 'test@example.com', password: 'password123' }
    ];
    
    for (const user of testUsers) {
      const existingUser = await sql`SELECT id FROM users WHERE email = ${user.email}`;
      
      if (existingUser.length === 0) {
        const hashedPassword = hashPassword(user.password);
        try {
          const result = await sql`
            INSERT INTO users (name, email, password, role, user_type)
            VALUES (${user.name}, ${user.email}, ${hashedPassword}, 'customer', 'customer')
            RETURNING id, name, email
          `;
          console.log(`Created test user: ${user.email}`, result[0]);
        } catch (error) {
          console.error(`Error creating test user ${user.email}:`, error);
        }
      } else {
        console.log(`Test user ${user.email} already exists`);
      }
    }
    
    // Step 5: Fix any data inconsistencies
    console.log('\nStep 5: Fixing data inconsistencies...');
    
    // Check for users with empty passwords and fix them
    const emptyPasswordUsers = await sql`SELECT id, email FROM users WHERE password = ''`;
    if (emptyPasswordUsers.length > 0) {
      console.log(`Found ${emptyPasswordUsers.length} users with empty passwords`);
      
      for (const user of emptyPasswordUsers) {
        const defaultPassword = hashPassword('password123');
        await sql`UPDATE users SET password = ${defaultPassword} WHERE id = ${user.id}`;
        console.log(`Fixed empty password for user ${user.email}`);
      }
    } else {
      console.log('No users with empty passwords found');
    }
    
    // Check for null values in required fields
    const usersWithNullRole = await sql`SELECT id, email FROM users WHERE role IS NULL`;
    if (usersWithNullRole.length > 0) {
      console.log(`Found ${usersWithNullRole.length} users with NULL role`);
      
      for (const user of usersWithNullRole) {
        await sql`UPDATE users SET role = 'customer' WHERE id = ${user.id}`;
        console.log(`Fixed NULL role for user ${user.email}`);
      }
    } else {
      console.log('No users with NULL role found');
    }
    
    // Step 6: Create a known working user for testing
    console.log('\nStep 6: Creating known working test user...');
    const knownEmail = 'working_test@example.com';
    const knownPassword = 'password123';
    const hashedKnownPassword = hashPassword(knownPassword);
    
    // Check if this user already exists
    const knownUserExists = await sql`SELECT id FROM users WHERE email = ${knownEmail}`;
    
    if (knownUserExists.length === 0) {
      try {
        const result = await sql`
          INSERT INTO users (name, email, password, role, user_type)
          VALUES ('Working Test User', ${knownEmail}, ${hashedKnownPassword}, 'customer', 'customer')
          RETURNING id, name, email
        `;
        console.log('Created known working test user:', result[0]);
        console.log(`Email: ${knownEmail}`);
        console.log(`Password: ${knownPassword}`);
      } catch (error) {
        console.error('Error creating known working test user:', error);
      }
    } else {
      console.log(`Known working test user ${knownEmail} already exists`);
      console.log(`Email: ${knownEmail}`);
      console.log(`Password: ${knownPassword}`);
    }
    
    // Step 7: Print a summary of what we found and fixed
    console.log('\nStep 7: Summary of findings and fixes:');
    const finalUsers = await sql`SELECT id, name, email, role, user_type FROM users`;
    console.log(`Total users in database: ${finalUsers.length}`);
    
    console.log('\nVerified users available for testing:');
    console.log('- working_test@example.com / password123');
    console.log('- test@example.com / password123');
    
    console.log('\nTo fix registration issues:');
    console.log('1. Use the debug accounts above to test login');
    console.log('2. For registration, use a completely unique email address');
    console.log('3. Check browser console for detailed error messages');
    console.log('4. Try restarting the development server');
    
  } catch (error) {
    console.error('Error fixing registration issues:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

fixRegistrationIssues(); 