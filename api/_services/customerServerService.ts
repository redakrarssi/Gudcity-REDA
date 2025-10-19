/**
 * Customer Server Service
 * Handles all customer-related database operations on the server
 * SECURITY: This file runs on the server only - never exposed to browser
 */

import { requireSql } from '../_lib/db';
import type { Customer } from './types';

/**
 * Get customers for a business
 */
export async function getBusinessCustomers(
  businessId: string | number
): Promise<Customer[]> {
  const sql = requireSql();
  
  console.log('[CustomerServerService] Getting customers for business:', businessId);
  
  // Get customers through multiple possible relationships
  const customers = await sql`
    SELECT DISTINCT
      c.id,
      c.name,
      c.email,
      c.phone,
      c.status,
      COALESCE(SUM(lc.points), 0) as loyalty_points,
      COUNT(DISTINCT pe.program_id) as program_count,
      c.created_at as joined_at
    FROM users c
    LEFT JOIN program_enrollments pe ON c.id = pe.customer_id::text
    LEFT JOIN loyalty_programs lp ON pe.program_id = lp.id
    LEFT JOIN loyalty_cards lc ON c.id = lc.customer_id AND lc.business_id = ${businessId}
    WHERE (
      lp.business_id = ${businessId}
      OR lc.business_id = ${businessId}
      OR c.id IN (
        SELECT DISTINCT customer_id 
        FROM business_transactions 
        WHERE business_id = ${businessId}
      )
    )
    AND c.user_type = 'customer'
    AND c.status = 'active'
    GROUP BY c.id, c.name, c.email, c.phone, c.status, c.created_at
    ORDER BY c.created_at DESC
  `;
  
  console.log('[CustomerServerService] Found customers:', customers.length);
  
  return customers.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone || '',
    tier: c.tier || 'STANDARD',
    loyaltyPoints: Number(c.loyalty_points) || 0,
    points: Number(c.loyalty_points) || 0,
    visits: 0, // TODO: Calculate from transactions
    totalSpent: 0, // TODO: Calculate from transactions
    status: c.status,
    programCount: Number(c.program_count) || 0,
    joinedAt: c.joined_at,
  })) as Customer[];
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const sql = requireSql();
  
  console.log('[CustomerServerService] Getting customer by ID:', customerId);
  
  const customers = await sql`
    SELECT 
      id, name, email, phone, user_type, role, status,
      tier, loyalty_points, created_at
    FROM users
    WHERE id = ${customerId}
    AND user_type = 'customer'
    LIMIT 1
  `;
  
  if (customers.length === 0) {
    console.log('[CustomerServerService] Customer not found:', customerId);
    return null;
  }
  
  const customer = customers[0];
  
  // Get program count
  const programCount = await sql`
    SELECT COUNT(DISTINCT program_id) as count
    FROM program_enrollments
    WHERE customer_id = ${customerId}
  `;
  
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    tier: customer.tier || 'STANDARD',
    loyaltyPoints: Number(customer.loyalty_points) || 0,
    points: Number(customer.loyalty_points) || 0,
    visits: 0, // TODO: Calculate
    totalSpent: 0, // TODO: Calculate
    status: customer.status,
    programCount: Number(programCount[0]?.count) || 0,
    joinedAt: customer.created_at,
  } as Customer;
}

/**
 * Create customer
 */
export async function createCustomer(customerData: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<Customer> {
  const sql = requireSql();
  
  console.log('[CustomerServerService] Creating customer:', customerData.email);
  
  const { name, email, phone, password } = customerData;
  
  const customers = await sql`
    INSERT INTO users (
      name, email, phone, password, user_type, role, status, created_at
    )
    VALUES (
      ${name}, ${email}, ${phone || null}, ${password},
      'customer', 'customer', 'active', NOW()
    )
    RETURNING id, name, email, phone, user_type, status, created_at
  `;
  
  const customer = customers[0];
  
  console.log('[CustomerServerService] Customer created:', customer.id);
  
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    tier: 'STANDARD',
    loyaltyPoints: 0,
    points: 0,
    visits: 0,
    totalSpent: 0,
    status: customer.status,
    programCount: 0,
    joinedAt: customer.created_at,
  } as Customer;
}

/**
 * Update customer
 */
export async function updateCustomer(
  customerId: string,
  updates: Partial<Customer>
): Promise<Customer> {
  const sql = requireSql();
  
  console.log('[CustomerServerService] Updating customer:', { customerId, updates });
  
  const allowedFields = ['name', 'phone', 'tier'];
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
  
  updateValues.unshift(customerId);
  
  const query = `
    UPDATE users
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND user_type = 'customer'
    RETURNING id, name, email, phone, tier, loyalty_points, status, created_at
  `;
  
  const customers = await sql(query, updateValues);
  
  if (customers.length === 0) {
    throw new Error('Customer not found or update failed');
  }
  
  const customer = customers[0];
  
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    tier: customer.tier || 'STANDARD',
    loyaltyPoints: Number(customer.loyalty_points) || 0,
    points: Number(customer.loyalty_points) || 0,
    visits: 0,
    totalSpent: 0,
    status: customer.status,
    programCount: 0,
    joinedAt: customer.created_at,
  } as Customer;
}

/**
 * Get customer's enrolled programs
 */
export async function getCustomerPrograms(customerId: string): Promise<any[]> {
  const sql = requireSql();
  
  console.log('[CustomerServerService] Getting programs for customer:', customerId);
  
  const programs = await sql`
    SELECT 
      lp.id,
      lp.name,
      lp.description,
      lp.business_id,
      pe.enrolled_at,
      pe.status,
      COALESCE(SUM(lc.points), 0) as points
    FROM program_enrollments pe
    JOIN loyalty_programs lp ON pe.program_id = lp.id
    LEFT JOIN loyalty_cards lc ON lc.customer_id = pe.customer_id 
      AND lc.program_id = lp.id
    WHERE pe.customer_id = ${customerId}
    GROUP BY lp.id, lp.name, lp.description, lp.business_id, pe.enrolled_at, pe.status
    ORDER BY pe.enrolled_at DESC
  `;
  
  console.log('[CustomerServerService] Found programs:', programs.length);
  
  return programs;
}

/**
 * Enroll customer in program
 */
export async function enrollCustomerInProgram(
  customerId: string,
  programId: string
): Promise<void> {
  const sql = requireSql();
  
  console.log('[CustomerServerService] Enrolling customer in program:', {
    customerId,
    programId,
  });
  
  // Check if already enrolled
  const existing = await sql`
    SELECT id FROM program_enrollments
    WHERE customer_id = ${customerId} AND program_id = ${programId}
    LIMIT 1
  `;
  
  if (existing.length > 0) {
    throw new Error('Customer is already enrolled in this program');
  }
  
  // Enroll customer
  await sql`
    INSERT INTO program_enrollments (
      customer_id, program_id, enrolled_at, status
    )
    VALUES (
      ${customerId}, ${programId}, NOW(), 'active'
    )
  `;
  
  console.log('[CustomerServerService] Customer enrolled successfully');
}

/**
 * Get customer transactions
 */
export async function getCustomerTransactions(
  customerId: string,
  filters?: {
    businessId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<any[]> {
  const sql = requireSql();
  
  console.log('[CustomerServerService] Getting transactions for customer:', customerId);
  
  let query = `
    SELECT 
      id, business_id, program_id, points, source, description, created_at
    FROM point_transactions
    WHERE customer_id = $1
  `;
  
  const params: any[] = [customerId];
  let paramIndex = 2;
  
  if (filters?.businessId) {
    query += ` AND business_id = $${paramIndex}`;
    params.push(filters.businessId);
    paramIndex++;
  }
  
  if (filters?.startDate) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
  }
  
  if (filters?.endDate) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
  }
  
  query += ` ORDER BY created_at DESC`;
  
  if (filters?.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
  } else {
    query += ` LIMIT 100`;
  }
  
  const transactions = await sql(query, params);
  
  console.log('[CustomerServerService] Found transactions:', transactions.length);
  
  return transactions;
}

