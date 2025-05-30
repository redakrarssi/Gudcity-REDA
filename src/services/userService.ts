import sql from '../utils/db';

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
    console.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
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
    const crypto = await import('crypto');
    const sha256Hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
    return sha256Hash === hashedPassword;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await sql`
      SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, created_at, last_login 
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
    const result = await sql`
      SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, created_at, last_login 
      FROM users WHERE id = ${id}
    `;
    const user = result[0];
    return user as User || null;
  } catch (error) {
    console.error(`Error fetching user with id ${id}:`, error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
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
      email: user.email,
      role: user.role,
      user_type: user.user_type
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
    
    // Check if email already exists
    console.log('Checking if email already exists...');
    const existingUser = await getUserByEmail(user.email);
    if (existingUser) {
      console.error('User with email already exists:', existingUser.email);
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
      return result[0] as User;
    } catch (insertError) {
      console.error('Error during SQL INSERT:', insertError);
      if (insertError instanceof Error) {
        console.error('Insert error message:', insertError.message);
        console.error('Insert error stack:', insertError.stack);
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
    const user = await getUserByEmail(email);
    if (!user || !user.password) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    // Update last login time
    await sql`
      UPDATE users
      SET last_login = NOW()
      WHERE id = ${user.id}
    `;

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
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