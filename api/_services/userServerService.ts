/**
 * User Server Service
 * Handles all user-related database operations on the server
 * SECURITY: This file runs on the server only - never exposed to browser
 */

import { requireSql } from '../_lib/db';
import bcrypt from 'bcryptjs';
import type { User } from './types';

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
  
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  
  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key) && value !== undefined) {
      updateFields.push(`${key} = $${updateValues.length + 2}`);
      updateValues.push(value);
    }
  });
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  // Add userId as first parameter
  updateValues.unshift(Number(userId));
  
  const query = `
    UPDATE users
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, name, user_type, role, status, business_id,
              business_name, business_phone, avatar_url, phone, address,
              tier, loyalty_points, total_spent, created_at, last_login
  `;
  
  const users = await sql(query, updateValues);
  
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
  
  let whereConditions = [`(LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1))`];
  let params: any[] = [`%${query}%`];
  let paramIndex = 2;
  
  if (filters?.userType) {
    whereConditions.push(`user_type = $${paramIndex}`);
    params.push(filters.userType);
    paramIndex++;
  }
  
  if (filters?.status) {
    whereConditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }
  
  const sqlQuery = `
    SELECT 
      id, email, name, user_type, role, status, business_id,
      business_name, business_phone, avatar_url, phone, address,
      tier, loyalty_points, total_spent, created_at, last_login
    FROM users
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  params.push(limit, offset);
  
  const users = await sql(sqlQuery, params);
  
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
    WHERE user_type = $1
  `;
  
  const params: any[] = [userType];
  let paramIndex = 2;
  
  if (options?.status) {
    query += ` AND status = $${paramIndex}`;
    params.push(options.status);
    paramIndex++;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  const users = await sql(query, params);
  
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
  const params: any[] = [];
  
  if (userType) {
    query += ' WHERE user_type = $1';
    params.push(userType);
  }
  
  const result = await sql(query, params);
  
  return Number(result[0]?.count || 0);
}

