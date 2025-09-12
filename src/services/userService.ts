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
  // Staff management fields
  business_owner_id?: number; // For staff users - references the business owner
  permissions?: StaffPermissions; // Staff-specific permissions
  created_by?: number; // Who created this user (for staff tracking)
}

export interface StaffPermissions {
  canCreatePrograms: boolean;
  canEditPrograms: boolean;
  canDeletePrograms: boolean;
  canCreatePromotions: boolean;
  canEditPromotions: boolean;
  canDeletePromotions: boolean;
  canAccessSettings: boolean;
  canManageStaff: boolean;
  canViewCustomers: boolean;
  canViewReports: boolean;
  canScanQR: boolean;
  canAwardPoints: boolean;
}

export type UserType = 'customer' | 'business' | 'staff';
export type UserRole = 'admin' | 'customer' | 'business' | 'staff' | 'owner';

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
      SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at, last_login, status 
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
      console.log('No database connection available - users must be created through proper registration');
      
      // SECURITY: No hardcoded users - all users must be created through proper registration
      // with their own passwords. This ensures no hardcoded credentials exist in the system.
      console.log(`No user found with email: ${email} (Database connection required)`);
      return null;
    }
    
    // If we have a database connection, query it
    const result = await sql`
      SELECT id, name, email, password, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at, last_login, status 
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
          avatar_url,
          business_owner_id,
          permissions,
          created_by
        )
        VALUES (
          ${user.name}, 
          ${user.email}, 
          ${hashedPassword || ''}, 
          ${user.role || 'customer'}, 
          ${user.user_type || 'customer'}, 
          ${user.business_name || null}, 
          ${user.business_phone || null}, 
          ${user.avatar_url || null},
          ${user.business_owner_id || null},
          ${user.permissions ? JSON.stringify(user.permissions) : null},
          ${user.created_by || null}
        )
        RETURNING id, name, email, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at
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
    
    // SECURITY: No hardcoded credentials - all authentication requires database connection
    if (!user && !env?.DATABASE_URL) {
      console.error('SECURITY ALERT: Database connection unavailable - authentication failed');
      throw new Error('Authentication service unavailable. Please check database connection.');
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

// SECURITY: Demo users disabled - all users must register with their own passwords
export async function ensureDemoUsers(): Promise<void> {
  try {
    console.log('Demo user creation disabled for security - all users must register properly');
    
    // First, ensure the users table exists with all required columns
    await ensureUserTableExists();
    
    // SECURITY: No automatic demo user creation with hardcoded passwords.
    // All users must be created through the proper registration process where they
    // set their own secure passwords. This eliminates any hardcoded credentials
    // from the system and ensures proper password security.
    
    console.log('Users must register through the registration form with their own secure passwords');
    
  } catch (error) {
    console.error('Error during database initialization:', error);
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

// Create default staff permissions (limited access as per requirements)
export function createDefaultStaffPermissions(): StaffPermissions {
  return {
    canCreatePrograms: false, // Staff cannot create programs
    canEditPrograms: true,
    canDeletePrograms: false, // Staff cannot delete programs
    canCreatePromotions: false, // Staff cannot create promotions
    canEditPromotions: true,
    canDeletePromotions: false, // Staff cannot delete promotions
    canAccessSettings: false, // Staff cannot access settings
    canManageStaff: false, // Only owners can manage staff
    canViewCustomers: true,
    canViewReports: true,
    canScanQR: true,
    canAwardPoints: true
  };
}

// Create staff user for a business owner
export async function createStaffUser(
  ownerId: number,
  staffData: Omit<User, 'id' | 'created_at' | 'business_owner_id' | 'permissions' | 'created_by'>
): Promise<User | null> {
  try {
    console.log('Creating staff user for owner:', ownerId);
    
    // Verify the owner exists and is a business user
    const owner = await getUserById(ownerId);
    if (!owner || (owner.role !== 'business' && owner.role !== 'owner')) {
      console.error('Invalid owner or owner is not a business user');
      return null;
    }
    
    // Set staff-specific properties
    const staffUser = {
      ...staffData,
      role: 'staff',
      user_type: 'staff',
      business_owner_id: ownerId,
      permissions: createDefaultStaffPermissions(),
      created_by: ownerId
    };
    
    // Create the staff user
    return await createUser(staffUser);
  } catch (error) {
    console.error('Error creating staff user:', error);
    return null;
  }
}

// Get staff users for a business owner
export async function getStaffUsers(ownerId: number): Promise<User[]> {
  try {
    console.log('Fetching staff users for owner:', ownerId);
    
    if (!env.DATABASE_URL) {
      console.log('No database connection - cannot fetch staff users');
      return [];
    }
    
    const staffUsers = await sql`
      SELECT id, name, email, role, user_type, business_owner_id, permissions, created_by, created_at, last_login, status
      FROM users
      WHERE business_owner_id = ${ownerId} AND role = 'staff'
      ORDER BY created_at DESC
    `;
    
    console.log(`Found ${staffUsers.length} staff users for owner ${ownerId}`);
    return staffUsers as User[];
  } catch (error) {
    console.error('Error fetching staff users:', error);
    return [];
  }
}

// Update staff permissions
export async function updateStaffPermissions(
  staffId: number,
  ownerId: number,
  permissions: Partial<StaffPermissions>
): Promise<boolean> {
  try {
    console.log('Updating staff permissions for staff:', staffId, 'by owner:', ownerId);
    
    // Verify the staff user belongs to this owner
    const staffUser = await getUserById(staffId);
    if (!staffUser || staffUser.business_owner_id !== ownerId) {
      console.error('Staff user not found or does not belong to this owner');
      return false;
    }
    
    // Get current permissions and merge with updates
    const currentPermissions = staffUser.permissions || createDefaultStaffPermissions();
    const updatedPermissions = { ...currentPermissions, ...permissions };
    
    await sql`
      UPDATE users 
      SET permissions = ${JSON.stringify(updatedPermissions)}
      WHERE id = ${staffId}
    `;
    
    console.log('Staff permissions updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating staff permissions:', error);
    return false;
  }
}

// Update staff user information (only by owner)
export async function updateStaffUser(
  staffId: number,
  ownerId: number,
  updatedData: {
    name?: string;
    email?: string;
    password?: string;
    permissions?: StaffPermissions;
  }
): Promise<boolean> {
  try {
    console.log('Updating staff user:', staffId, 'by owner:', ownerId);
    
    // Verify the staff user belongs to this owner
    const staffUser = await getUserById(staffId);
    if (!staffUser || staffUser.business_owner_id !== ownerId || staffUser.role !== 'staff') {
      console.error('Staff user not found, does not belong to this owner, or is not a staff user');
      return false;
    }
    
    // Build update query dynamically based on provided data
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (updatedData.name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updatedData.name);
    }
    
    if (updatedData.email) {
      // Check if email is already taken by another user
      const existingUser = await sql`
        SELECT id FROM users 
        WHERE LOWER(email) = LOWER(${updatedData.email}) AND id != ${staffId}
      `;
      
      if (existingUser.length > 0) {
        console.error('Email already exists for another user');
        return false;
      }
      
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(updatedData.email.toLowerCase());
    }
    
    if (updatedData.password) {
      const hashedPassword = await hashPassword(updatedData.password);
      updateFields.push(`password = $${paramIndex++}`);
      updateValues.push(hashedPassword);
    }
    
    if (updatedData.permissions) {
      updateFields.push(`permissions = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updatedData.permissions));
    }
    
    if (updateFields.length === 0) {
      console.log('No fields to update');
      return true;
    }
    
    // Add updated_at field
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Execute update query
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
    updateValues.push(staffId);
    
    await sql.unsafe(query, updateValues);
    
    console.log('Staff user updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating staff user:', error);
    return false;
  }
}

// Delete staff user (only by owner)
export async function deleteStaffUser(staffId: number, ownerId: number): Promise<boolean> {
  try {
    console.log('Deleting staff user:', staffId, 'by owner:', ownerId);
    
    // Verify the staff user belongs to this owner
    const staffUser = await getUserById(staffId);
    if (!staffUser || staffUser.business_owner_id !== ownerId || staffUser.role !== 'staff') {
      console.error('Staff user not found, does not belong to this owner, or is not a staff user');
      return false;
    }
    
    // Delete the staff user
    await sql`DELETE FROM users WHERE id = ${staffId}`;
    
    console.log('Staff user deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting staff user:', error);
    return false;
  }
}

// Get users by type (for filtering in admin tables)
export async function getUsersByType(userType: UserType | 'all' | 'staff'): Promise<User[]> {
  try {
    console.log(`Fetching users of type: ${userType}`);
    
    // If no database connection, return empty array
    if (!env.DATABASE_URL) {
      console.log('No database connection available - getUsersByType requires database');
      
      // SECURITY: No mock users - all users must exist in database through proper registration
      console.log('Database connection required to retrieve users');
      return [];
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
        SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at, last_login, status 
        FROM users
        ORDER BY created_at DESC
      `;
    } else if (userType === 'staff') {
      query = sql`
        SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at, last_login, status 
        FROM users
        WHERE role = 'staff' OR role IN ('admin', 'moderator')
        ORDER BY created_at DESC
      `;
    } else {
      query = sql`
        SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at, last_login, status 
        FROM users
        WHERE user_type = ${userType}
        ORDER BY created_at DESC
      `;
    }
    
    const users = await query;
    console.log(`Retrieved ${users.length} users of type ${userType}:`, users);
    
    // SECURITY: No automatic demo user creation - users must register properly
    if (users.length === 0) {
      console.log(`No users found of type ${userType} - users must register through the registration form`);
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
    
    // Add staff management columns
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS business_owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      `;
      console.log('Ensured business_owner_id column exists');
    } catch (alterError3) {
      console.error('Error ensuring business_owner_id column exists:', alterError3);
    }
    
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL
      `;
      console.log('Ensured permissions column exists');
    } catch (alterError4) {
      console.error('Error ensuring permissions column exists:', alterError4);
    }
    
    try {
      await sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      `;
      console.log('Ensured created_by column exists');
    } catch (alterError5) {
      console.error('Error ensuring created_by column exists:', alterError5);
    }
    
    // Create indexes for staff management
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_business_owner_id ON users(business_owner_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)
      `;
      console.log('Created staff management indexes');
    } catch (indexError) {
      console.error('Error creating staff management indexes:', indexError);
    }
    
  } catch (error) {
    console.error('Error ensuring users table exists:', error);
  }
}