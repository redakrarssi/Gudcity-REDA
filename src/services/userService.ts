import sql from '../utils/db';
import env from '../utils/env';
import * as cryptoUtils from '../utils/cryptoUtils';
import { revokeAllUserTokens } from './authService';

export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role?: string;
  user_type?: string;
  business_name?: string;
  business_phone?: string;
  avatar_url?: string;
  reset_token?: string;
  reset_token_expires?: Date;
  last_login?: Date;
  created_at?: Date;
  status?: 'active' | 'banned' | 'restricted';
}

export type UserType = 'customer' | 'business';
export type UserRole = 'admin' | 'customer' | 'business';

// Hash password using bcrypt for better security
async function hashPassword(password: string): Promise<string> {
  try {
    // Import bcrypt dynamically to avoid SSR issues
    const bcrypt = await import('bcryptjs');
    // Generate a salt with cost factor 12
    const salt = await bcrypt.genSalt(12);
    // Hash the password with the salt
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password with bcrypt:', error);
    
    try {
      // Fallback to SHA-256 if bcrypt fails
      const sha256Hash = await cryptoUtils.createSha256Hash(password);
      return sha256Hash;
    } catch (cryptoError) {
      console.error('Error hashing password with crypto:', cryptoError);
      throw new Error('Password hashing failed completely');
    }
  }
}

// Verify password using bcrypt or fallback to SHA-256
async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    // First try bcrypt (secure)
    try {
      // Import bcrypt dynamically
      const bcrypt = await import('bcryptjs');
      // Check if it's a bcrypt hash (starts with $2a$, $2b$, etc.)
      if (hashedPassword.startsWith('$2')) {
        return await bcrypt.compare(plainPassword, hashedPassword);
      }
    } catch (bcryptError) {
      console.log('bcryptjs not available, falling back to SHA-256');
    }
    
    // Fallback to SHA-256 hash for legacy passwords
    const sha256Hash = await cryptoUtils.createSha256Hash(plainPassword);
    return sha256Hash === hashedPassword;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await sql`
      SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, created_at, last_login, status 
      FROM users
      ORDER BY created_at DESC
    `;
    return users as User[];
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    console.log(`Fetching user with id: ${id}`);
    
    if (!id || isNaN(id)) {
      console.error(`Invalid user ID: ${id}`);
      return null;
    }
    
    const result = await sql`
      SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, created_at, last_login, status 
      FROM users WHERE id = ${id}
    `;
    
    if (!result || result.length === 0) {
      console.log(`No user found with ID: ${id}`);
      return null;
    }
    
    const user = result[0];
    console.log(`User found with ID ${id}:`, { 
      id: user.id, 
      name: user.name, 
      email: user.email,
      role: user.role,
      user_type: user.user_type
    });
    
    return user as User;
  } catch (error) {
    console.error(`Error fetching user with id ${id}:`, error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    console.log(`Checking for user with email: ${email}`);
    
    // Check if we're in mock mode (no database connection)
    if (!env.DATABASE_URL) {
      console.log('Using mock data mode for getUserByEmail');
      
      // Return mock users for development/testing
      const mockEmail = email.toLowerCase();
      if (mockEmail === 'admin@vcarda.com') {
        return {
          id: 1,
          name: 'Admin User',
          email: 'admin@vcarda.com',
          password: 'a4def47bd16d0a847e2cdf3d2e828bc9594c3e12e57398e45c59fa943dfa61a0', // password
          role: 'admin',
          user_type: 'customer',
          status: 'active',
          created_at: new Date()
        };
      } else if (mockEmail === 'customer@example.com') {
        return {
          id: 2,
          name: 'Demo Customer',
          email: 'customer@example.com',
          password: 'a4def47bd16d0a847e2cdf3d2e828bc9594c3e12e57398e45c59fa943dfa61a0', // password
          role: 'customer',
          user_type: 'customer',
          status: 'active',
          created_at: new Date()
        };
      } else if (mockEmail === 'business@example.com') {
        return {
          id: 3,
          name: 'Demo Business',
          email: 'business@example.com',
          password: 'a4def47bd16d0a847e2cdf3d2e828bc9594c3e12e57398e45c59fa943dfa61a0', // password
          role: 'business',
          user_type: 'business',
          business_name: 'Demo Business LLC',
          business_phone: '+1234567890',
          status: 'active',
          created_at: new Date()
        };
      }
      
      console.log(`No mock user found with email: ${email}`);
      return null;
    }
    
    // If we have a database connection, query it
    const result = await sql`
      SELECT id, name, email, password, role, user_type, business_name, business_phone, avatar_url, created_at, last_login, status 
      FROM users WHERE LOWER(email) = LOWER(${email})
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
      email: user.email,
      role: user.role,
      user_type: user.user_type,
      status: user.status
    });
    
    return user as User || null;
  } catch (error) {
    console.error(`Error fetching user with email ${email}:`, error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

export async function createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
  try {
    console.log('Starting createUser with email:', user.email);
    
    // Check if email already exists - use case-insensitive comparison
    console.log('Checking if email already exists...');
    // Use a case-insensitive comparison to avoid duplicate emails in different cases
    const existingUserQuery = await sql`
      SELECT id, email FROM users 
      WHERE LOWER(email) = LOWER(${user.email})
    `;
    
    if (existingUserQuery && existingUserQuery.length > 0) {
      console.error('User with email already exists - case insensitive match:', existingUserQuery[0].email);
      return null;
    }

    // Hash password if provided using the secure bcrypt method
    console.log('Hashing password...');
    const hashedPassword = user.password ? await hashPassword(user.password) : undefined;

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
      if (result && result.length > 0) {
        return result[0] as User;
      } else {
        console.error('Insert query succeeded but returned no results');
        return null;
      }
    } catch (insertError) {
      console.error('Error during SQL INSERT:', insertError);
      if (insertError instanceof Error) {
        console.error('Insert error message:', insertError.message);
        console.error('Insert error stack:', insertError.stack);
        
        // Check for common database errors
        if (insertError.message.includes('unique constraint') || 
            insertError.message.includes('duplicate key')) {
          console.error('This appears to be a duplicate key error - email already exists');
        }
      }
      throw insertError; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

export async function updateUser(id: number, userData: Partial<User>): Promise<User | null> {
  try {
    // Handle specific fields separately for type safety
    if (userData.name) {
      await sql`UPDATE users SET name = ${userData.name} WHERE id = ${id}`;
    }
    
    if (userData.email) {
      await sql`UPDATE users SET email = ${userData.email} WHERE id = ${id}`;
    }
    
    if (userData.password) {
      const hashedPassword = await hashPassword(userData.password);
      await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${id}`;
    }
    
    if (userData.role) {
      await sql`UPDATE users SET role = ${userData.role} WHERE id = ${id}`;
    }
    
    if (userData.user_type) {
      await sql`UPDATE users SET user_type = ${userData.user_type} WHERE id = ${id}`;
    }
    
    if (userData.business_name !== undefined) {
      await sql`UPDATE users SET business_name = ${userData.business_name} WHERE id = ${id}`;
    }
    
    if (userData.business_phone !== undefined) {
      await sql`UPDATE users SET business_phone = ${userData.business_phone} WHERE id = ${id}`;
    }
    
    if (userData.avatar_url !== undefined) {
      await sql`UPDATE users SET avatar_url = ${userData.avatar_url} WHERE id = ${id}`;
    }
    
    // Get the updated user
    return await getUserById(id);
  } catch (error) {
    console.error(`Error updating user with id ${id}:`, error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

export async function validateUser(email: string, password: string): Promise<User | null> {
  try {
    // First try to get the user from database
    const user = await getUserByEmail(email);

    // If user exists and has password, verify it
    if (user && user.password) {
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return null;
      }

      // Update last login time
      try {
        await sql`
          UPDATE users
          SET last_login = NOW()
          WHERE id = ${user.id}
        `;
      } catch (error) {
        // If update fails, don't block login
        console.error('Failed to update last login time:', error);
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } 
    
    // Fall back to demo users if DB is unavailable
    if (!user && !env?.DATABASE_URL) {
      console.warn('No database connection, using mock users for authentication');
      
      // Check for mock users (admin@vcarda.com/password, customer@example.com/password)
      if (email.toLowerCase() === 'admin@vcarda.com' && password === 'password') {
        return {
          id: 1,
          name: 'Admin User',
          email: 'admin@vcarda.com',
          role: 'admin',
          user_type: 'customer',
          status: 'active',
          last_login: new Date()
        };
      } else if (email.toLowerCase() === 'customer@example.com' && password === 'password') {
        return {
          id: 2,
          name: 'Demo Customer',
          email: 'customer@example.com',
          role: 'customer',
          user_type: 'customer',
          status: 'active',
          last_login: new Date()
        };
      } else if (email.toLowerCase() === 'business@example.com' && password === 'password') {
        return {
          id: 3,
          name: 'Demo Business',
          email: 'business@example.com',
          role: 'business',
          user_type: 'business',
          business_name: 'Demo Business LLC',
          business_phone: '+1234567890',
          status: 'active',
          last_login: new Date()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error validating user:', error);
    return null;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    await sql`DELETE FROM users WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error(`Error deleting user with id ${id}:`, error);
    return false;
  }
}

// Ensure demo users exist in the system
export async function ensureDemoUsers(): Promise<void> {
  try {
    console.log('Ensuring demo users exist...');
    
    // First, ensure the users table exists with all required columns
    await ensureUserTableExists();
    
    // Check if admin user exists
    const adminEmail = 'admin@vcarda.com';
    const existingAdmin = await getUserByEmail(adminEmail);
    
    if (!existingAdmin) {
      console.log('Creating demo admin user...');
      await createUser({
        name: 'Admin User',
        email: adminEmail,
        password: 'password',
        role: 'admin',
        user_type: 'customer',
      });
    } else {
      console.log('Admin user already exists');
    }
    
    // Check if customer demo user exists
    const customerEmail = 'customer@example.com';
    const existingCustomer = await getUserByEmail(customerEmail);
    
    if (!existingCustomer) {
      console.log('Creating demo customer user...');
      await createUser({
        name: 'Demo Customer',
        email: customerEmail,
        password: 'password',
        role: 'customer',
        user_type: 'customer',
      });
    } else {
      console.log('Customer demo user already exists');
    }
    
    // Check if business demo user exists
    const businessEmail = 'business@example.com';
    const existingBusiness = await getUserByEmail(businessEmail);
    
    if (!existingBusiness) {
      console.log('Creating demo business user...');
      await createUser({
        name: 'Demo Business',
        email: businessEmail,
        password: 'password',
        role: 'business',
        user_type: 'business',
        business_name: 'Demo Business LLC',
        business_phone: '+1234567890',
      });
    } else {
      console.log('Business demo user already exists');
    }
    
    console.log('Demo users check completed');
  } catch (error) {
    console.error('Error ensuring demo users exist:', error);
  }
}

// Ban or restrict a user
export async function updateUserStatus(
  id: number, 
  status: 'active' | 'banned' | 'restricted',
  options?: { performedById?: number; performedByEmail?: string; reason?: string }
): Promise<boolean> {
  try {
    // First check if the status column exists
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
      `;
    } catch (alterError) {
      console.error('Error ensuring status column exists:', alterError);
    }

    // Ensure moderation audit table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS moderation_logs (
          id SERIAL PRIMARY KEY,
          target_user_id INTEGER NOT NULL,
          action VARCHAR(20) NOT NULL,
          previous_status VARCHAR(20),
          new_status VARCHAR(20),
          reason TEXT,
          performed_by_id INTEGER,
          performed_by_email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    } catch (logTableError) {
      console.error('Error ensuring moderation_logs table exists:', logTableError);
    }

    // Get user details for logging before update
    const userBefore = await getUserById(id);
    if (!userBefore) {
      console.error(`MODERATION ERROR: User ${id} not found for status update`);
      return false;
    }

    // Update the user's status
    await sql`
      UPDATE users
      SET status = ${status}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
    
    // Revoke all refresh tokens immediately for banned users
    if (status === 'banned') {
      try {
        await revokeAllUserTokens(id);
      } catch (tokenErr) {
        console.error('Failed to revoke user tokens after ban:', tokenErr);
      }
    }
    
    // Enhanced logging for audit trail
    const actionTimestamp = new Date().toISOString();
    const previousStatus = userBefore.status || 'active';
    
    console.log(`🔒 MODERATION ACTION: User ${userBefore.email} (ID: ${id}) status changed from '${previousStatus}' to '${status}' at ${actionTimestamp}`);
    
    // Persist audit log in DB
    try {
      await sql`
        INSERT INTO moderation_logs (
          target_user_id, action, previous_status, new_status, reason, performed_by_id, performed_by_email
        ) VALUES (
          ${id}, ${status}, ${previousStatus}, ${status}, ${options?.reason || null}, ${options?.performedById || null}, ${options?.performedByEmail || null}
        )
      `;
    } catch (logErr) {
      console.error('Failed to insert moderation log:', logErr);
    }
    
    // Log specific action type
    if (status === 'banned') {
      console.log(`🚫 USER BANNED: ${userBefore.email} (${userBefore.name}) has been banned and will be denied access to all protected resources`);
    } else if (status === 'restricted') {
      console.log(`⚠️ USER RESTRICTED: ${userBefore.email} (${userBefore.name}) has been restricted with limited access`);
    } else if (status === 'active') {
      console.log(`✅ USER ACTIVATED: ${userBefore.email} (${userBefore.name}) has been reactivated with full access`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ MODERATION ERROR: Failed to update user ${id} status to ${status}:`, error);
    return false;
  }
}

// Ban a user
export async function banUser(id: number, options?: { performedById?: number; performedByEmail?: string; reason?: string }): Promise<boolean> {
  return updateUserStatus(id, 'banned', options);
}

// Restrict a user's access
export async function restrictUser(id: number, options?: { performedById?: number; performedByEmail?: string; reason?: string }): Promise<boolean> {
  return updateUserStatus(id, 'restricted', options);
}

// Activate a user (remove ban/restriction)
export async function activateUser(id: number, options?: { performedById?: number; performedByEmail?: string; reason?: string }): Promise<boolean> {
  return updateUserStatus(id, 'active', options);
}

// Get users by type (for filtering in admin tables)
export async function getUsersByType(userType: UserType | 'all' | 'staff'): Promise<User[]> {
  try {
    console.log(`Fetching users of type: ${userType}`);
    
    // If no database connection, return mock data
    if (!env.DATABASE_URL) {
      console.log('Using mock data for getUsersByType');
      
      // Return mock users
      const mockUsers: User[] = [
        {
          id: 1,
          name: 'Admin User',
          email: 'admin@vcarda.com',
          role: 'admin',
          user_type: 'customer',
          status: 'active',
          created_at: new Date()
        },
        {
          id: 2,
          name: 'Demo Customer',
          email: 'customer@example.com',
          role: 'customer',
          user_type: 'customer',
          status: 'active',
          created_at: new Date()
        },
        {
          id: 3,
          name: 'Demo Business',
          email: 'business@example.com',
          role: 'business',
          user_type: 'business',
          business_name: 'Demo Business LLC',
          business_phone: '+1234567890',
          status: 'active',
          created_at: new Date()
        }
      ];
      
      // Filter based on userType
      if (userType === 'all') {
        return mockUsers;
      } else if (userType === 'staff') {
        return mockUsers.filter(user => user.role === 'admin');
      } else {
        return mockUsers.filter(user => user.user_type === userType);
      }
    }
    
    // With database connection, use real queries
    let query;
    
    // Ensure the status column exists first
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
      `;
      console.log('Ensured status column exists');
    } catch (alterError) {
      console.error('Error ensuring status column exists:', alterError);
    }
    
    if (userType === 'all') {
      query = sql`
        SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, created_at, last_login, status 
        FROM users
        ORDER BY created_at DESC
      `;
    } else if (userType === 'staff') {
      query = sql`
        SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, created_at, last_login, status 
        FROM users
        WHERE role = 'admin'
        ORDER BY created_at DESC
      `;
    } else {
      query = sql`
        SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, created_at, last_login, status 
        FROM users
        WHERE user_type = ${userType}
        ORDER BY created_at DESC
      `;
    }
    
    const users = await query;
    console.log(`Retrieved ${users.length} users of type ${userType}:`, users);
    
    // If no users and this is during initialization, create some demo users
    if (users.length === 0) {
      await ensureDemoUsers();
      // Try again after creating demo users
      return getUsersByType(userType);
    }
    
    return users as User[];
  } catch (error) {
    console.error(`Error fetching users by type ${userType}:`, error);
    return [];
  }
}

// Ensure the users table exists with all required columns
export async function ensureUserTableExists(): Promise<void> {
  try {
    // If no database connection, just log and return
    if (!env.DATABASE_URL) {
      console.log('Mock mode: Skipping database table creation');
      return;
    }
    
    console.log('Ensuring users table exists...');
    
    // Create users table if it doesn't exist
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
        status VARCHAR(20) DEFAULT 'active',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Users table exists or was created successfully');
    
    // Ensure all columns exist by adding them if they don't
    // This is a safer approach than dropping and recreating the table
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
      `;
      console.log('Ensured status column exists');
    } catch (alterError) {
      console.error('Error ensuring status column exists:', alterError);
    }
    
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `;
      console.log('Ensured updated_at column exists');
    } catch (alterError2) {
      console.error('Error ensuring updated_at column exists:', alterError2);
    }
    
  } catch (error) {
    console.error('Error ensuring users table exists:', error);
  }
}