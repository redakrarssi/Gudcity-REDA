import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  withCors, 
  withErrorHandler, 
  withAuth,
  withRole,
  withRateLimit,
  sendSuccess, 
  sendError,
  sendPaginated,
  sendCreated,
  getPaginationParams,
  getSortParams,
  sql,
  sanitizeInput,
  errors,
  AuthenticatedRequest
} from '../_middleware/index.js';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  const { slug } = req.query;
  const slugArray = Array.isArray(slug) ? slug : [slug];
  
  // Route handling
  if (slugArray.length === 0) {
    return handleBusinesses(req, res);
  }
  
  if (slugArray.length === 1) {
    const [id] = slugArray;
    return handleBusinessById(req, res, id as string);
  }
  
  if (slugArray.length === 2) {
    const [id, action] = slugArray;
    return handleBusinessAction(req, res, id as string, action as string);
  }
  
  if (slugArray.length === 3) {
    const [id, action, subaction] = slugArray;
    return handleBusinessSubAction(req, res, id as string, action as string, subaction as string);
  }
  
  return sendError(res, 'Invalid route', 404);
}

// Handle /businesses (list/create)
async function handleBusinesses(req: AuthenticatedRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET':
      return await listBusinesses(req, res);
    case 'POST':
      return await createBusiness(req, res);
    default:
      return sendError(res, 'Method not allowed', 405);
  }
}

// Handle /businesses/:id (get/update/delete)
async function handleBusinessById(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  switch (req.method) {
    case 'GET':
      return await getBusiness(req, res, id);
    case 'PUT':
      return await updateBusiness(req, res, id);
    case 'DELETE':
      return await deleteBusiness(req, res, id);
    default:
      return sendError(res, 'Method not allowed', 405);
  }
}

// Handle /businesses/:id/:action
async function handleBusinessAction(req: AuthenticatedRequest, res: VercelResponse, id: string, action: string) {
  switch (action) {
    case 'customers':
      return await handleBusinessCustomers(req, res, id);
    case 'programs':
      return await handleBusinessPrograms(req, res, id);
    case 'staff':
      return await handleBusinessStaff(req, res, id);
    case 'settings':
      return await handleBusinessSettings(req, res, id);
    case 'enroll':
      return await handleCustomerEnrollment(req, res, id);
    case 'analytics':
      return await handleBusinessAnalytics(req, res, id);
    default:
      return sendError(res, 'Invalid action', 404);
  }
}

// Handle /businesses/:id/:action/:subaction
async function handleBusinessSubAction(req: AuthenticatedRequest, res: VercelResponse, id: string, action: string, subaction: string) {
  if (action === 'customers' && req.method === 'POST') {
    return await enrollCustomer(req, res, id, subaction);
  }
  
  if (action === 'staff') {
    return await handleStaffMember(req, res, id, subaction);
  }
  
  return sendError(res, 'Invalid sub-action', 404);
}

// List businesses
async function listBusinesses(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { sortBy, sortOrder } = getSortParams(req.query, ['name', 'created_at', 'status'], 'created_at');
    
    // Build where clause based on user role
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (req.user?.role !== 'ADMIN') {
      whereClause += ` AND (owner_id = $${params.length + 1} OR id IN (
        SELECT business_id FROM business_staff WHERE user_id = $${params.length + 1}
      ))`;
      params.push(req.user?.userId);
    }
    
    // Add filters
    if (req.query.status) {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(req.query.status);
    }
    
    if (req.query.search) {
      whereClause += ` AND (name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM businesses ${whereClause}`;
    const totalResult = await sql.query(countQuery, params);
    const total = parseInt(totalResult[0].total);
    
    // Get businesses
    const query = `
      SELECT 
        b.*,
        u.name as owner_name,
        u.email as owner_email,
        (SELECT COUNT(*) FROM loyalty_programs WHERE business_id = b.id AND status = 'ACTIVE') as active_programs,
        (SELECT COUNT(*) FROM customer_business_relationships WHERE business_id = b.id AND status = 'ACTIVE') as customer_count
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const businesses = await sql.query(query, params);
    
    return sendPaginated(res, businesses, page, limit, total);
    
  } catch (error) {
    console.error('Error listing businesses:', error);
    return sendError(res, 'Failed to fetch businesses', 500);
  }
}

// Get single business
async function getBusiness(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    // Check business access
    const business = await getBusinessWithAccess(id, req.user!);
    if (!business) {
      return sendError(res, 'Business not found or access denied', 404);
    }
    
    // Get additional business details
    const [programs, customerCount, staffCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM loyalty_programs WHERE business_id = ${id} AND status = 'ACTIVE'`,
      sql`SELECT COUNT(*) as count FROM customer_business_relationships WHERE business_id = ${id} AND status = 'ACTIVE'`,
      sql`SELECT COUNT(*) as count FROM business_staff WHERE business_id = ${id} AND status = 'ACTIVE'`
    ]);
    
    const businessData = {
      ...business,
      stats: {
        activePrograms: parseInt(programs[0].count),
        customerCount: parseInt(customerCount[0].count),
        staffCount: parseInt(staffCount[0].count)
      }
    };
    
    return sendSuccess(res, businessData);
    
  } catch (error) {
    console.error('Error fetching business:', error);
    return sendError(res, 'Failed to fetch business', 500);
  }
}

// Create business
async function createBusiness(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { name, description, category, address, phone, email, website, settings } = sanitizeInput(req.body);
    
    if (!name || !category) {
      return sendError(res, 'Name and category are required', 400);
    }
    
    // Create business
    const businesses = await sql`
      INSERT INTO businesses (
        name, description, category, address, phone, email, website, 
        owner_id, settings, status, created_at, updated_at
      )
      VALUES (
        ${name}, ${description}, ${category}, ${address}, ${phone}, ${email}, ${website},
        ${req.user!.userId}, ${JSON.stringify(settings || {})}, 'ACTIVE', NOW(), NOW()
      )
      RETURNING *
    `;
    
    const business = businesses[0];
    
    // Create default loyalty program
    await sql`
      INSERT INTO loyalty_programs (
        business_id, name, description, points_per_visit, points_per_dollar,
        min_points_for_reward, reward_description, status, created_at, updated_at
      )
      VALUES (
        ${business.id}, 'Default Loyalty Program', 'Earn points with every visit',
        1, 0, 10, '10% discount on your next purchase', 'ACTIVE', NOW(), NOW()
      )
    `;
    
    return sendCreated(res, business, 'Business created successfully');
    
  } catch (error) {
    console.error('Error creating business:', error);
    return sendError(res, 'Failed to create business', 500);
  }
}

// Update business
async function updateBusiness(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    // Check business access
    const business = await getBusinessWithAccess(id, req.user!, 'OWNER');
    if (!business) {
      return sendError(res, 'Business not found or insufficient permissions', 404);
    }
    
    const { name, description, category, address, phone, email, website, settings } = sanitizeInput(req.body);
    
    const updatedBusinesses = await sql`
      UPDATE businesses 
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        category = COALESCE(${category}, category),
        address = COALESCE(${address}, address),
        phone = COALESCE(${phone}, phone),
        email = COALESCE(${email}, email),
        website = COALESCE(${website}, website),
        settings = COALESCE(${JSON.stringify(settings)}, settings),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    return sendSuccess(res, updatedBusinesses[0], 'Business updated successfully');
    
  } catch (error) {
    console.error('Error updating business:', error);
    return sendError(res, 'Failed to update business', 500);
  }
}

// Delete business
async function deleteBusiness(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    // Check business access
    const business = await getBusinessWithAccess(id, req.user!, 'OWNER');
    if (!business) {
      return sendError(res, 'Business not found or insufficient permissions', 404);
    }
    
    // Soft delete
    await sql`
      UPDATE businesses 
      SET status = 'DELETED', deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `;
    
    return sendSuccess(res, null, 'Business deleted successfully');
    
  } catch (error) {
    console.error('Error deleting business:', error);
    return sendError(res, 'Failed to delete business', 500);
  }
}

// Handle business customers
async function handleBusinessCustomers(req: AuthenticatedRequest, res: VercelResponse, businessId: string) {
  try {
    // Check business access
    const business = await getBusinessWithAccess(businessId, req.user!);
    if (!business) {
      return sendError(res, 'Business not found or access denied', 404);
    }
    
    const { page, limit, offset } = getPaginationParams(req.query);
    
    // Get customers for this business
    const customers = await sql`
      SELECT 
        c.*,
        cbr.status as relationship_status,
        cbr.created_at as joined_date,
        COALESCE(SUM(pe.current_points), 0) as total_points,
        COUNT(DISTINCT pe.program_id) as programs_enrolled
      FROM customers c
      JOIN customer_business_relationships cbr ON c.id = cbr.customer_id
      LEFT JOIN program_enrollments pe ON c.id = pe.customer_id
      LEFT JOIN loyalty_programs lp ON pe.program_id = lp.id AND lp.business_id = ${businessId}
      WHERE cbr.business_id = ${businessId}
      GROUP BY c.id, cbr.status, cbr.created_at
      ORDER BY cbr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const totalResult = await sql`
      SELECT COUNT(*) as total 
      FROM customer_business_relationships 
      WHERE business_id = ${businessId}
    `;
    const total = parseInt(totalResult[0].total);
    
    return sendPaginated(res, customers, page, limit, total);
    
  } catch (error) {
    console.error('Error fetching business customers:', error);
    return sendError(res, 'Failed to fetch customers', 500);
  }
}

// Handle business programs
async function handleBusinessPrograms(req: AuthenticatedRequest, res: VercelResponse, businessId: string) {
  try {
    // Check business access
    const business = await getBusinessWithAccess(businessId, req.user!);
    if (!business) {
      return sendError(res, 'Business not found or access denied', 404);
    }
    
    const programs = await sql`
      SELECT 
        lp.*,
        COUNT(DISTINCT pe.customer_id) as enrolled_customers,
        COALESCE(SUM(pe.current_points), 0) as total_points_issued
      FROM loyalty_programs lp
      LEFT JOIN program_enrollments pe ON lp.id = pe.program_id AND pe.status = 'ACTIVE'
      WHERE lp.business_id = ${businessId}
      GROUP BY lp.id
      ORDER BY lp.created_at DESC
    `;
    
    return sendSuccess(res, programs);
    
  } catch (error) {
    console.error('Error fetching business programs:', error);
    return sendError(res, 'Failed to fetch programs', 500);
  }
}

// Helper function to get business with access control
async function getBusinessWithAccess(businessId: string, user: any, requiredRole?: string) {
  const businesses = await sql`
    SELECT b.*, u.name as owner_name, u.email as owner_email
    FROM businesses b
    LEFT JOIN users u ON b.owner_id = u.id
    WHERE b.id = ${businessId} AND b.status != 'DELETED'
  `;
  
  if (businesses.length === 0) {
    return null;
  }
  
  const business = businesses[0];
  
  // Admin can access all businesses
  if (user.role === 'ADMIN') {
    return business;
  }
  
  // Owner can access their business
  if (business.owner_id === user.userId) {
    return business;
  }
  
  // Check staff access if not owner
  if (!requiredRole || requiredRole !== 'OWNER') {
    const staffAccess = await sql`
      SELECT role FROM business_staff 
      WHERE business_id = ${businessId} AND user_id = ${user.userId} AND status = 'ACTIVE'
    `;
    
    if (staffAccess.length > 0) {
      return business;
    }
  }
  
  return null;
}

// Stub functions for additional endpoints (to be implemented)
async function handleBusinessStaff(req: AuthenticatedRequest, res: VercelResponse, businessId: string) {
  return sendError(res, 'Staff management endpoint not yet implemented', 501);
}

async function handleBusinessSettings(req: AuthenticatedRequest, res: VercelResponse, businessId: string) {
  return sendError(res, 'Business settings endpoint not yet implemented', 501);
}

async function handleCustomerEnrollment(req: AuthenticatedRequest, res: VercelResponse, businessId: string) {
  return sendError(res, 'Customer enrollment endpoint not yet implemented', 501);
}

async function handleBusinessAnalytics(req: AuthenticatedRequest, res: VercelResponse, businessId: string) {
  return sendError(res, 'Business analytics endpoint not yet implemented', 501);
}

async function enrollCustomer(req: AuthenticatedRequest, res: VercelResponse, businessId: string, customerId: string) {
  return sendError(res, 'Enroll customer endpoint not yet implemented', 501);
}

async function handleStaffMember(req: AuthenticatedRequest, res: VercelResponse, businessId: string, staffId: string) {
  return sendError(res, 'Staff member management endpoint not yet implemented', 501);
}

// Apply middleware and export
export default withCors(
  withErrorHandler(
    withAuth(
      withRateLimit()(handler)
    )
  )
);
