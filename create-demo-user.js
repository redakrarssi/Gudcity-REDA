/**
 * Script to create demo users for testing the login endpoint
 * Run with: node create-demo-user.js
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.log('💡 Set it in your .env file or environment');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function createDemoUser() {
  console.log('👤 Creating Demo User for Login Testing');
  console.log('=====================================\n');

  try {
    // Demo user credentials
    const demoUser = {
      email: 'demo@gudcity.com',
      password: 'Demo123!@#',
      name: 'Demo User',
      role: 'USER',
      status: 'ACTIVE'
    };

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(demoUser.password, 12);

    console.log('🔍 Checking if user already exists...');
    const existingUsers = await sql`
      SELECT id, email FROM users WHERE LOWER(email) = LOWER(${demoUser.email})
    `;

    if (existingUsers.length > 0) {
      console.log('✅ Demo user already exists!');
      console.log('📧 Email:', demoUser.email);
      console.log('🔑 Password:', demoUser.password);
      return;
    }

    console.log('➕ Creating new demo user...');
    const newUsers = await sql`
      INSERT INTO users (email, password, name, role, status, created_at, updated_at)
      VALUES (
        ${demoUser.email.toLowerCase()}, 
        ${hashedPassword}, 
        ${demoUser.name}, 
        ${demoUser.role}, 
        ${demoUser.status}, 
        NOW(), 
        NOW()
      )
      RETURNING id, email, name, role, status, created_at
    `;

    const createdUser = newUsers[0];
    
    console.log('✅ Demo user created successfully!');
    console.log('📧 Email:', demoUser.email);
    console.log('🔑 Password:', demoUser.password);
    console.log('👤 User ID:', createdUser.id);
    console.log('📝 Name:', createdUser.name);
    console.log('👑 Role:', createdUser.role);
    console.log('🚦 Status:', createdUser.status);
    
    console.log('\n=====================================');
    console.log('🎯 Demo User Ready for Testing!');
    console.log('=====================================');
    console.log('💡 Use these credentials to test login:');
    console.log('   Email: demo@gudcity.com');
    console.log('   Password: Demo123!@#');

  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    
    if (error.message.includes('relation "users" does not exist')) {
      console.log('\n💡 It looks like the users table doesn\'t exist yet.');
      console.log('   You may need to run database migrations first.');
    }
  }
}

createDemoUser().catch(console.error);
