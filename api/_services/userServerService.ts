/**
 * User Server Service
 * Handles all user-related database operations on the server
 * SECURITY: This file runs on the server only - never exposed to browser
 */

import { requireSql } from '../_lib/db.js';
import bcrypt from 'bcryptjs';
import type { User } from './types.js';

const BCRYPT_ROUNDS = 12;

/**
 * Get user by ID
 */
export async function getUserById(userId: number | string): Promise<User | null> {
  const sql = requireSql();
  
  console.log('[UserServerService] Getting user by ID:', userId);
  
  const users = await sql`
    SELECT 
      id, email, name, user_type, role, status, business_id,
      business_name, business_phone, avatar_url, phone, address,
      tier, loyalty_points, total_spent, created_at, last_login
    FROM users
    WHERE id = ${Number(userId)}
    LIMIT 1
  `;
  
  if (users.length === 0) {
    console.log('[UserServerService] User not found:', userId);
    return null;
  }
  
  return users[0] as User;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = requireSql();
  
  console.log('[UserServerService] Getting user by email:', email);
  
  const users = await sql`
    SELECT 
      id, email, name, user_type, role, status, business_id,
      business_name, business_phone, avatar_url, phone, address,
      tier, loyalty_points, total_spent, created_at, last_login
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  
  if (users.length === 0) {
    console.log('[UserServerService] User not found:', email);
    return null;
  }
  
  return users[0] as User;
}

/**
 * Update user
 */
export async function updateUser(
  userId: number | string,
  updates: Partial<User>
): Promise<User> {
  const sql = requireSql();
  
  console.log('[UserServerService] Updating user:', { userId, updates });
  
  // Build update query dynamically
  const allowedFields = [
    'name', 'phone', 'address', 'business_name', 'business_phone',
    'avatar_url', 'tier', 'status'
  ];
  
  const updateParts: any[] = [];
  
  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key) && value !== undefined) {
      updateParts.push({ key, value });
    }
  });
  
  if (updateParts.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  // Use template literal approach
  let query = 'UPDATE users SET ';
  const setParts = updateParts.map(part => `${part.key} = '${part.value}'`).join(', ');
  query += setParts + ', updated_at = NOW()';
  query += ` WHERE id = ${Number(userId)}`;
  query += ` RETURNING id, email, name, user_type, role, status, business_id,
              business_name, business_phone, avatar_url, phone, address,
              tier, loyalty_points, total_spent, created_at, last_login`;
  
  const users = await sql.unsafe(query);
  
  if (users.length === 0) {
    throw new Error('User not found or update failed');
  }
  
  console.log('[UserServerService] User updated successfully:', userId);
  
  return users[0] as User;
}

/**
 * Delete user (soft delete)
 */
export async function deleteUser(userId: number | string): Promise<void> {
  const sql = requireSql();
  
  console.log('[UserServerService] Deleting user:', userId);
  
  await sql`
    UPDATE users
    SET status = 'inactive', updated_at = NOW()
    WHERE id = ${Number(userId)}
  `;
  
  console.log('[UserServerService] User deleted (soft delete):', userId);
}

/**
 * Search users
 */
export async function searchUsers(
  query: string,
  filters?: {
    userType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<User[]> {
  const sql = requireSql();
  
  console.log('[UserServerService] Searching users:', { query, filters });
  
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  
  let whereConditions = [`(LOWER(name) LIKE LOWER('%${query}%') OR LOWER(email) LIKE LOWER('%${query}%'))`];
  
  if (filters?.userType) {
    whereConditions.push(`user_type = '${filters.userType}'`);
  }
  
  if (filters?.status) {
    whereConditions.push(`status = '${filters.status}'`);
  }
  
  const sqlQuery = `
    SELECT 
      id, email, name, user_type, role, status, business_id,
      business_name, business_phone, avatar_url, phone, address,
      tier, loyalty_points, total_spent, created_at, last_login
    FROM users
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  const users = await sql.unsafe(sqlQuery);
  
  console.log('[UserServerService] Found users:', users.length);
  
  return users as User[];
}

/**
 * Get users by type
 */
export async function getUsersByType(
  userType: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<User[]> {
  const sql = requireSql();
  
  console.log('[UserServerService] Getting users by type:', userType);
  
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  
  let query = `
    SELECT 
      id, email, name, user_type, role, status, business_id,
      business_name, business_phone, avatar_url, phone, address,
      tier, loyalty_points, total_spent, created_at, last_login
    FROM users
    WHERE user_type = '${userType}'
  `;
  
  if (options?.status) {
    query += ` AND status = '${options.status}'`;
  }
  
  query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  
  const users = await sql.unsafe(query);
  
  console.log('[UserServerService] Found users:', users.length);
  
  return users as User[];
}

/**
 * Update user password
 */
export async function updatePassword(
  userId: number | string,
  newPasswordHash: string
): Promise<void> {
  const sql = requireSql();
  
  console.log('[UserServerService] Updating password for user:', userId);
  
  await sql`
    UPDATE users
    SET password = ${newPasswordHash}, updated_at = NOW()
    WHERE id = ${Number(userId)}
  `;
  
  console.log('[UserServerService] Password updated successfully:', userId);
}

/**
 * Get user count by type
 */
export async function getUserCountByType(userType?: string): Promise<number> {
  const sql = requireSql();
  
  let query = 'SELECT COUNT(*) as count FROM users';
  
  if (userType) {
    query += ` WHERE user_type = '${userType}'`;
  }
  
  const result = await sql.unsafe(query);
  
  return Number(result[0]?.count || 0);
}

