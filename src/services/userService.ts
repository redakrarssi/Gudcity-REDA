import sql from '../utils/db';

export interface User {
  id?: number;
  name: string;
  email: string;
  createdAt?: Date;
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await sql`SELECT * FROM users ORDER BY id DESC`;
    return users as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    const user = result[0];
    return user as User || null;
  } catch (error) {
    console.error(`Error fetching user with id ${id}:`, error);
    return null;
  }
}

export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User | null> {
  try {
    const result = await sql`
      INSERT INTO users (name, email)
      VALUES (${user.name}, ${user.email})
      RETURNING *
    `;
    return result[0] as User;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function updateUser(id: number, userData: Partial<User>): Promise<User | null> {
  try {
    // Build the dynamic SET clause
    const updates = Object.entries(userData)
      .filter(([key]) => key !== 'id' && key !== 'createdAt')
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key} = ${sql.unsafe(`'${value}'`)}`;
        }
        return `${key} = ${sql.unsafe(String(value))}`;
      });
    
    if (updates.length === 0) return null;
    
    const result = await sql`
      UPDATE users
      SET ${sql.unsafe(updates.join(', '))}
      WHERE id = ${id}
      RETURNING *
    `;
    
    return result[0] as User;
  } catch (error) {
    console.error(`Error updating user with id ${id}:`, error);
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