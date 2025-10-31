import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  withCors, 
  withErrorHandler, 
  withAuth,
  withRateLimit,
  sendSuccess, 
  sendError,
  sendCreated,
  sendPaginated,
  getPaginationParams,
  sql,
  sanitizeInput,
  AuthenticatedRequest
} from '../_middleware/index';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  const { slug } = req.query;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  
  if (slugArray.length === 0) {
    return handleCustomers(req, res);
  }
  
  if (slugArray.length === 1) {
    const [id] = slugArray;
    return handleCustomerById(req, res, id as string);
  }
  
  if (slugArray.length === 2) {
    const [id, action] = slugArray;
    return handleCustomerAction(req, res, id as string, action as string);
  }
  
  return sendError(res, 'Invalid route', 404);
}

async function handleCustomers(req: AuthenticatedRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET':
      return await listCustomers(req, res);
    case 'POST':
      return await createCustomer(req, res);
    default:
      return sendError(res, 'Method not allowed', 405);
  }
}

async function handleCustomerById(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  switch (req.method) {
    case 'GET':
      return await getCustomer(req, res, id);
    case 'PUT':
      return await updateCustomer(req, res, id);
    case 'DELETE':
      return await deleteCustomer(req, res, id);
    default:
      return sendError(res, 'Method not allowed', 405);
  }
}

async function handleCustomerAction(req: AuthenticatedRequest, res: VercelResponse, id: string, action: string) {
  switch (action) {
    case 'programs':
      return await getCustomerPrograms(req, res, id);
    case 'cards':
      return await getCustomerCards(req, res, id);
    case 'transactions':
      return await getCustomerTransactions(req, res, id);
    case 'notifications':
      return await getCustomerNotifications(req, res, id);
    default:
      return sendError(res, 'Invalid action', 404);
  }
}

async function listCustomers(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { businessId, search } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    // Filter by business if specified
    if (businessId) {
      whereClause += ` AND c.id IN (
        SELECT customer_id FROM customer_business_relationships 
        WHERE business_id = $${params.length + 1} AND status = 'ACTIVE'
      )`;
      params.push(businessId);
    }
    
    // Search filter
    if (search) {
      whereClause += ` AND (c.name ILIKE $${params.length + 1} OR c.email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    
    // Get customers with stats
    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT pe.program_id) as programs_count,
        COALESCE(SUM(pe.current_points), 0) as total_points,
        COUNT(DISTINCT cbr.business_id) as business_relationships
      FROM customers c
      LEFT JOIN program_enrollments pe ON c.id = pe.customer_id AND pe.status = 'ACTIVE'
      LEFT JOIN customer_business_relationships cbr ON c.id = cbr.customer_id AND cbr.status = 'ACTIVE'
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const customers = await sql.query(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM customers c ${whereClause}`;
    const totalResult = await sql.query(countQuery, params.slice(0, -2));
    const total = parseInt(totalResult[0].total);
    
    return sendPaginated(res, customers, page, limit, total);
    
  } catch (error) {
    console.error('Error listing customers:', error);
    return sendError(res, 'Failed to fetch customers', 500);
  }
}

async function getCustomer(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const customers = await sql`
      SELECT 
        c.*,
        COUNT(DISTINCT pe.program_id) as programs_count,
        COALESCE(SUM(pe.current_points), 0) as total_points,
        COUNT(DISTINCT cbr.business_id) as business_relationships,
        MAX(pt.created_at) as last_transaction
      FROM customers c
      LEFT JOIN program_enrollments pe ON c.id = pe.customer_id AND pe.status = 'ACTIVE'
      LEFT JOIN customer_business_relationships cbr ON c.id = cbr.customer_id AND cbr.status = 'ACTIVE'
      LEFT JOIN point_transactions pt ON c.id = pt.customer_id
      WHERE c.id = ${id}
      GROUP BY c.id
    `;
    
    if (customers.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }
    
    return sendSuccess(res, customers[0]);
    
  } catch (error) {
    console.error('Error fetching customer:', error);
    return sendError(res, 'Failed to fetch customer', 500);
  }
}

async function createCustomer(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { 
      name, email, phone, address, dateOfBirth, 
      notificationPreferences, regionalSettings 
    } = sanitizeInput(req.body);
    
    if (!name || !email) {
      return sendError(res, 'Name and email are required', 400);
    }
    
    // Check if customer already exists
    const existing = await sql`
      SELECT id FROM customers WHERE email = ${email}
    `;
    
    if (existing.length > 0) {
      return sendError(res, 'Customer with this email already exists', 409);
    }
    
    const customers = await sql`
      INSERT INTO customers (
        name, email, phone, address, date_of_birth, 
        notification_preferences, regional_settings, created_at, updated_at
      )
      VALUES (
        ${name}, ${email}, ${phone}, ${address}, ${dateOfBirth},
        ${JSON.stringify(notificationPreferences || {})}, 
        ${JSON.stringify(regionalSettings || {})}, 
        NOW(), NOW()
      )
      RETURNING *
    `;
    
    return sendCreated(res, customers[0], 'Customer created successfully');
    
  } catch (error) {
    console.error('Error creating customer:', error);
    return sendError(res, 'Failed to create customer', 500);
  }
}

async function updateCustomer(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const { 
      name, email, phone, address, dateOfBirth, 
      notificationPreferences, regionalSettings 
    } = sanitizeInput(req.body);
    
    const customers = await sql`
      UPDATE customers 
      SET 
        name = COALESCE(${name}, name),
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        address = COALESCE(${address}, address),
        date_of_birth = COALESCE(${dateOfBirth}, date_of_birth),
        notification_preferences = COALESCE(${JSON.stringify(notificationPreferences)}, notification_preferences),
        regional_settings = COALESCE(${JSON.stringify(regionalSettings)}, regional_settings),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (customers.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }
    
    return sendSuccess(res, customers[0], 'Customer updated successfully');
    
  } catch (error) {
    console.error('Error updating customer:', error);
    return sendError(res, 'Failed to update customer', 500);
  }
}

async function deleteCustomer(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const customers = await sql`
      UPDATE customers 
      SET status = 'DELETED', deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;
    
    if (customers.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }
    
    return sendSuccess(res, null, 'Customer deleted successfully');
    
  } catch (error) {
    console.error('Error deleting customer:', error);
    return sendError(res, 'Failed to delete customer', 500);
  }
}

async function getCustomerPrograms(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const programs = await sql`
      SELECT 
        pe.*,
        lp.name as program_name,
        lp.description as program_description,
        b.name as business_name,
        b.id as business_id
      FROM program_enrollments pe
      JOIN loyalty_programs lp ON pe.program_id = lp.id
      JOIN businesses b ON lp.business_id = b.id
      WHERE pe.customer_id = ${id} AND pe.status = 'ACTIVE'
      ORDER BY pe.enrolled_at DESC
    `;
    
    return sendSuccess(res, programs);
    
  } catch (error) {
    console.error('Error fetching customer programs:', error);
    return sendError(res, 'Failed to fetch customer programs', 500);
  }
}

async function getCustomerCards(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const cards = await sql`
      SELECT 
        lc.*,
        lp.name as program_name,
        b.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN businesses b ON lp.business_id = b.id
      WHERE lc.customer_id = ${id} AND lc.status = 'ACTIVE'
      ORDER BY lc.created_at DESC
    `;
    
    return sendSuccess(res, cards);
    
  } catch (error) {
    console.error('Error fetching customer cards:', error);
    return sendError(res, 'Failed to fetch customer cards', 500);
  }
}

async function getCustomerTransactions(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    
    const transactions = await sql`
      SELECT 
        pt.*,
        lp.name as program_name,
        b.name as business_name
      FROM point_transactions pt
      JOIN loyalty_programs lp ON pt.program_id = lp.id
      JOIN businesses b ON pt.business_id = b.id
      WHERE pt.customer_id = ${id}
      ORDER BY pt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const totalResult = await sql`
      SELECT COUNT(*) as total FROM point_transactions WHERE customer_id = ${id}
    `;
    const total = parseInt(totalResult[0].total);
    
    return sendPaginated(res, transactions, page, limit, total);
    
  } catch (error) {
    console.error('Error fetching customer transactions:', error);
    return sendError(res, 'Failed to fetch customer transactions', 500);
  }
}

async function getCustomerNotifications(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    
    const notifications = await sql`
      SELECT * FROM customer_notifications 
      WHERE customer_id = ${id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const totalResult = await sql`
      SELECT COUNT(*) as total FROM customer_notifications WHERE customer_id = ${id}
    `;
    const total = parseInt(totalResult[0].total);
    
    return sendPaginated(res, notifications, page, limit, total);
    
  } catch (error) {
    console.error('Error fetching customer notifications:', error);
    return sendError(res, 'Failed to fetch customer notifications', 500);
  }
}

export default withCors(
  withErrorHandler(
    withAuth(
      withRateLimit()(handler)
    )
  )
);
