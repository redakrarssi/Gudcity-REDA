# Catch-All Routing Developer Guide

## Overview

Our API uses catch-all routes to consolidate multiple endpoints into single serverless functions, staying within Vercel's 12-function limit while supporting 70+ API endpoints.

## Architecture

```
api/
├── [[...segments]].ts              # Main catch-all (35+ routes)
├── analytics/[[...segments]].ts    # Analytics routes
├── business/[businessId]/[[...segments]].ts  # Business routes
├── auth/login.ts                   # Dedicated auth endpoints
├── auth/register.ts
├── auth/generate-tokens.ts
├── users/[id].ts                   # Dedicated user endpoints
├── users/by-email.ts
├── admin/dashboard-stats.ts        # Dedicated admin endpoint
└── db/initialize.ts                # Database initialization
```

## Route Handlers

### 1. Main Catch-All: `api/[[...segments]].ts`

Handles most general-purpose API routes.

**Example Routes**:
- `/api/promotions` → Public promotions
- `/api/customers/{id}/cards` → Customer loyalty cards
- `/api/loyalty/cards` → Loyalty card operations
- `/api/notifications` → Notification management
- `/api/transactions` → Transaction operations
- `/api/qr/generate` → QR code generation
- `/api/dashboard/stats` → Dashboard statistics
- `/api/users` → User management (admin)

**Route Pattern**:
```typescript
const segments = (req.query.segments as string[] | undefined) || [];

// Example: /api/customers/123/cards
// segments = ['customers', '123', 'cards']
if (segments.length === 3 && segments[0] === 'customers' && segments[2] === 'cards') {
  const customerId = segments[1];
  // Handle request
}
```

### 2. Business Catch-All: `api/business/[businessId]/[[...segments]].ts`

Handles business-specific routes with automatic business ID extraction and access verification.

**Example Routes**:
- `/api/business/{id}/analytics` → Business analytics
- `/api/business/{id}/settings` → Business settings
- `/api/business/{id}/notifications` → Business notifications
- `/api/business/{id}/approvals/pending` → Pending approvals
- `/api/business/{id}/programs/count` → Program statistics

**Features**:
- Automatic `businessId` extraction from URL
- Built-in access verification via `verifyBusinessAccess()`
- Optimized for business operations

**Route Pattern**:
```typescript
const { businessId } = req.query; // Automatically extracted
const segments = (req.query.segments as string[] | undefined) || [];

// Example: /api/business/456/analytics
// businessId = '456', segments = ['analytics']
if (segments.length === 1 && segments[0] === 'analytics' && req.method === 'GET') {
  // Business ID already verified by handler
  // Handle request
}
```

### 3. Analytics Catch-All: `api/analytics/[[...segments]].ts`

Handles granular analytics queries with feature-based routing.

**Example Routes**:
- `/api/analytics/points?businessId={id}` → Total points
- `/api/analytics/redemptions?businessId={id}&type=popular` → Popular rewards
- `/api/analytics/customers?businessId={id}&type=active` → Active customers
- `/api/analytics/engagement?businessId={id}` → Engagement trends

**Features Supported**:
- `points` - Total, distribution, average
- `redemptions` - Total, popular rewards, rate
- `customers` - Total, active count
- `retention` - Retention rate
- `engagement` - Engagement over time

**Route Pattern**:
```typescript
const segments = (req.query.segments as string[] | undefined) || [];
const feature = segments[0] || 'points';
const { businessId, type, metric } = req.query;

// Example: /api/analytics/redemptions?businessId=456&type=popular
// feature = 'redemptions', type = 'popular'
if (feature === 'redemptions') {
  if (type === 'popular') {
    // Get popular rewards
  }
}
```

## Adding New Routes

### Option 1: Add to Main Catch-All

Best for: General-purpose endpoints, customer operations, notifications

```typescript
// In api/[[...segments]].ts

// Add after existing routes, before the 404 handler
if (segments.length === 2 && segments[0] === 'myfeature' && segments[1] === 'action') {
  if (req.method === 'GET') {
    // Verify authorization
    if (user!.role !== 'admin' && user!.id !== someResourceOwnerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Query database
    const result = await sql`SELECT * FROM my_table WHERE ...`;
    
    return res.status(200).json({ data: result });
  }
  
  if (req.method === 'POST') {
    const { field1, field2 } = req.body;
    
    // Validate input
    if (!field1 || !field2) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert data
    const inserted = await sql`INSERT INTO my_table (...) VALUES (...) RETURNING *`;
    
    return res.status(201).json({ data: inserted[0] });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
```

### Option 2: Add to Business Catch-All

Best for: Business-specific operations, business analytics

```typescript
// In api/business/[businessId]/[[...segments]].ts

// businessId already extracted and access verified
if (segments.length === 1 && segments[0] === 'myfeature' && req.method === 'GET') {
  const result = await sql`
    SELECT * FROM my_table 
    WHERE business_id = ${Number(businessId)}
  `;
  
  return res.status(200).json({ data: result });
}
```

### Option 3: Add to Analytics Catch-All

Best for: Analytics queries, metrics, reports

```typescript
// In api/analytics/[[...segments]].ts

if (feature === 'mymetric') {
  if (!businessId) {
    return res.status(400).json({ error: 'businessId required' });
  }
  
  const rows = await sql`
    SELECT metric_name, COUNT(*) as count
    FROM metrics
    WHERE business_id = ${Number(businessId)}
    GROUP BY metric_name
  `;
  
  return res.status(200).json({ mymetric: rows });
}
```

## Best Practices

### 1. Authentication & Authorization

Always verify user access:

```typescript
// Check if user is authenticated (done by middleware in catch-all)
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// Check if user has permission to access resource
if (user.id !== resourceOwnerId && user.role !== 'admin') {
  return res.status(403).json({ error: 'Access denied' });
}
```

### 2. Input Validation

Validate all inputs:

```typescript
// Validate required fields
if (!customerId || !programId || !points) {
  return res.status(400).json({ 
    error: 'Missing required fields: customerId, programId, points' 
  });
}

// Validate types and ranges
if (typeof points !== 'number' || points <= 0) {
  return res.status(400).json({ error: 'Points must be a positive number' });
}

// Sanitize string inputs
const sanitized = String(input).trim().slice(0, 255);
```

### 3. Error Handling

Wrap operations in try-catch:

```typescript
try {
  const result = await sql`SELECT * FROM table WHERE id = ${id}`;
  
  if (result.length === 0) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  return res.status(200).json({ data: result[0] });
} catch (error) {
  console.error('Error in myfeature endpoint:', error);
  return res.status(500).json({ error: 'Server error' });
}
```

### 4. Consistent Response Format

Use consistent JSON structure:

```typescript
// Success responses
return res.status(200).json({ 
  data: result,
  message: 'Operation successful' 
});

// Error responses
return res.status(400).json({ 
  error: 'Error message',
  details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
});
```

### 5. Database Queries

Use parameterized queries to prevent SQL injection:

```typescript
// ✅ Good - parameterized
const result = await sql`SELECT * FROM users WHERE id = ${userId}`;

// ❌ Bad - string concatenation
const result = await sql.unsafe(`SELECT * FROM users WHERE id = ${userId}`);
```

## Testing New Routes

### 1. Local Testing

```bash
# Start development server
npm run dev

# Test GET request
curl http://localhost:3000/api/myfeature/action

# Test POST request
curl -X POST http://localhost:3000/api/myfeature/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"field1": "value1", "field2": "value2"}'
```

### 2. Authorization Testing

```bash
# Test without token (should return 401)
curl http://localhost:3000/api/myfeature/action

# Test with token but wrong resource (should return 403)
curl -H "Authorization: Bearer WRONG_USER_TOKEN" \
  http://localhost:3000/api/myfeature/action

# Test with correct token (should return 200)
curl -H "Authorization: Bearer CORRECT_TOKEN" \
  http://localhost:3000/api/myfeature/action
```

### 3. Rate Limiting Testing

```bash
# Rapid-fire requests to test rate limit
for i in {1..250}; do
  curl http://localhost:3000/api/myfeature/action &
done
# Should see 429 errors after 240 requests
```

## Common Patterns

### Pattern 1: Get Resource by ID

```typescript
if (segments.length === 2 && segments[0] === 'resource' && req.method === 'GET') {
  const resourceId = segments[1];
  
  const resource = await sql`SELECT * FROM resources WHERE id = ${resourceId}`;
  
  if (resource.length === 0) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  // Check authorization
  if (user!.id !== resource[0].owner_id && user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  return res.status(200).json({ resource: resource[0] });
}
```

### Pattern 2: List Resources with Filters

```typescript
if (segments.length === 1 && segments[0] === 'resources' && req.method === 'GET') {
  const { status, type, limit = 50 } = req.query;
  
  let query = `SELECT * FROM resources WHERE owner_id = ${user!.id}`;
  if (status) query += ` AND status = '${status}'`;
  if (type) query += ` AND type = '${type}'`;
  query += ` ORDER BY created_at DESC LIMIT ${Number(limit)}`;
  
  const resources = await sql.unsafe(query);
  
  return res.status(200).json({ 
    resources, 
    count: resources.length 
  });
}
```

### Pattern 3: Create Resource

```typescript
if (segments.length === 1 && segments[0] === 'resources' && req.method === 'POST') {
  const { name, description, type } = req.body;
  
  // Validate
  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }
  
  // Create
  const resource = await sql`
    INSERT INTO resources (name, description, type, owner_id, created_at)
    VALUES (${name}, ${description || ''}, ${type}, ${user!.id}, NOW())
    RETURNING *
  `;
  
  return res.status(201).json({ resource: resource[0] });
}
```

### Pattern 4: Update Resource

```typescript
if (segments.length === 2 && segments[0] === 'resources' && req.method === 'PUT') {
  const resourceId = segments[1];
  const { name, description, status } = req.body;
  
  // Check ownership
  const existing = await sql`SELECT * FROM resources WHERE id = ${resourceId}`;
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  if (user!.id !== existing[0].owner_id && user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Update
  const updated = await sql`
    UPDATE resources
    SET 
      name = COALESCE(${name}, name),
      description = COALESCE(${description}, description),
      status = COALESCE(${status}, status),
      updated_at = NOW()
    WHERE id = ${resourceId}
    RETURNING *
  `;
  
  return res.status(200).json({ resource: updated[0] });
}
```

### Pattern 5: Delete Resource

```typescript
if (segments.length === 2 && segments[0] === 'resources' && req.method === 'DELETE') {
  const resourceId = segments[1];
  
  // Check ownership
  const existing = await sql`SELECT * FROM resources WHERE id = ${resourceId}`;
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  if (user!.id !== existing[0].owner_id && user!.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Soft delete (recommended)
  await sql`
    UPDATE resources 
    SET deleted_at = NOW(), status = 'deleted' 
    WHERE id = ${resourceId}
  `;
  
  // Or hard delete
  // await sql`DELETE FROM resources WHERE id = ${resourceId}`;
  
  return res.status(200).json({ message: 'Resource deleted successfully' });
}
```

## Debugging

### Enable Verbose Logging

```typescript
console.log('[Route Debug]', {
  method: req.method,
  segments,
  query: req.query,
  userId: user?.id,
  timestamp: new Date().toISOString()
});
```

### Check Route Matching

Add temporary debug route:

```typescript
// Add at the beginning of catch-all handler
if (segments[0] === 'debug' && process.env.NODE_ENV === 'development') {
  return res.status(200).json({
    method: req.method,
    segments,
    query: req.query,
    body: req.body,
    user: user ? { id: user.id, role: user.role } : null
  });
}
```

Test: `curl http://localhost:3000/api/debug/test?param=value`

## Performance Tips

### 1. Use Parallel Queries

```typescript
// ❌ Sequential (slow)
const users = await sql`SELECT * FROM users`;
const posts = await sql`SELECT * FROM posts`;
const comments = await sql`SELECT * FROM comments`;

// ✅ Parallel (fast)
const [users, posts, comments] = await Promise.all([
  sql`SELECT * FROM users`,
  sql`SELECT * FROM posts`,
  sql`SELECT * FROM comments`
]);
```

### 2. Limit Result Sets

```typescript
// Always use LIMIT
const results = await sql`
  SELECT * FROM large_table 
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 100
`;
```

### 3. Use Indexes

Ensure database tables have indexes on frequently queried columns:
- Foreign keys (user_id, business_id, etc.)
- Status columns
- Created/updated timestamps

## Need Help?

- **Full Documentation**: See `.cursor/plans/phase-11-serverless-optimization.md`
- **Examples**: Check existing routes in catch-all files
- **Testing**: Review `.cursor/plans/phase-11-completion-report.md`

---

**Last Updated**: October 22, 2025  
**Maintained By**: Development Team

