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

async function fixUsersTable() {
  try {
    // Check for existing users and fix any issues
    console.log('Checking users table...');
    
    // First, attempt to fix database issues by making sure columns are properly set up
    const usersExist = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `;
    
    if (!usersExist[0].exists) {
      console.log('Users table does not exist. Creating it...');
      await sql`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL DEFAULT '',
          role VARCHAR(50) NOT NULL DEFAULT 'customer',
          user_type VARCHAR(50) NOT NULL DEFAULT 'customer',
          business_name VARCHAR(255),
          business_phone VARCHAR(50),
          avatar_url VARCHAR(255),
          reset_token VARCHAR(255),
          reset_token_expires TIMESTAMP WITH TIME ZONE,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('Users table created successfully!');
    } else {
      console.log('Users table already exists.');
    }
    
    // Check for unique constraint on email
    const constraints = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
        AND constraint_type = 'UNIQUE'
        AND constraint_schema = 'public'
    `;
    
    if (constraints.length === 0) {
      console.log('Adding unique constraint on email column...');
      await sql`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)`;
      console.log('Added unique constraint on email column');
    } else {
      console.log('Email unique constraint exists:', constraints);
    }
    
    // Add index on email if it doesn't exist
    const indices = await sql`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'users' AND indexname LIKE '%email%'
    `;
    
    if (indices.length === 0) {
      console.log('Creating index on email column...');
      await sql`CREATE INDEX idx_users_email ON users(email)`;
      console.log('Created index on email column');
    } else {
      console.log('Email index exists:', indices);
    }

    // Check existing users
    const users = await sql`SELECT id, name, email FROM users`;
    console.log(`Found ${users.length} existing users:`, users);
    
    // Add test users if they don't exist
    const testUsers = [
      { name: 'Admin User', email: 'admin@example.com', password: 'password', role: 'admin', user_type: 'customer' },
      { name: 'Business User', email: 'business@example.com', password: 'password', role: 'business', user_type: 'business', business_name: 'Test Business', business_phone: '123-456-7890' },
      { name: 'Customer User', email: 'customer@example.com', password: 'password', role: 'customer', user_type: 'customer' }
    ];
    
    console.log('Setting up test users...');
    
    for (const user of testUsers) {
      // Check if user already exists
      const existingUser = await sql`SELECT id FROM users WHERE email = ${user.email}`;
      
      if (existingUser.length === 0) {
        // Hash the password
        const hashedPassword = hashPassword(user.password);
        
        try {
          // Create the user
          const result = await sql`
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
            RETURNING id, name, email
          `;
          
          console.log(`Created test user: ${user.name} (${user.email})`, result[0]);
        } catch (error) {
          console.error(`Error creating user ${user.email}:`, error);
          if (error instanceof Error) {
            console.error('Error message:', error.message);
          }
        }
      } else {
        console.log(`User ${user.email} already exists.`);
      }
    }
    
    // Test user registration by creating a random user
    const randomEmail = `test${Date.now()}@example.com`;
    const randomUser = {
      name: 'Random Test User',
      email: randomEmail,
      password: hashPassword('password'),
      role: 'customer',
      user_type: 'customer'
    };
    
    console.log(`\nTesting user registration with ${randomEmail}...`);
    
    try {
      const result = await sql`
        INSERT INTO users (name, email, password, role, user_type)
        VALUES (${randomUser.name}, ${randomUser.email}, ${randomUser.password}, ${randomUser.role}, ${randomUser.user_type})
        RETURNING id, name, email
      `;
      
      console.log('Test user registration successful:', result[0]);
    } catch (error) {
      console.error('Test user registration failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
    }
    
    // Final verification
    const finalUsers = await sql`SELECT id, name, email, role, user_type FROM users`;
    console.log(`\nFinal user count: ${finalUsers.length}`);
    finalUsers.forEach(u => console.log(`- ${u.id}: ${u.name} (${u.email}) - ${u.role}/${u.user_type}`));
    
  } catch (error) {
    console.error('General error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

fixUsersTable(); 