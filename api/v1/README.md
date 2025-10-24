# Consolidated API Handlers

## Overview

This directory contains consolidated API handlers that successfully bypass the Vercel Hobby plan's 12 serverless function limit. Instead of creating separate files for each API endpoint (which would count against the function limit), we use a single catch-all handler that processes multiple endpoint types.

**Current Function Count: 11/12** (Successfully under the limit!)

## How It Works

1. **URL Rewriting**: We use Vercel's rewrite rules in `vercel.json` to redirect requests from standard API paths to our consolidated handler:

```json
{
  "rewrites": [
    {
      "source": "/api/security/audit",
      "destination": "/api/v1/security/audit"
    },
    {
      "source": "/api/loyalty/cards/customer/:id",
      "destination": "/api/v1/loyalty/cards/customer/:id"
    },
    // More rewrites...
  ]
}
```

2. **Consolidated Handler**: The `[[...path]].ts` file uses a catch-all pattern to handle multiple endpoint types:

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Parse the path from the URL
  const fullPath = req.url || '';
  const pathWithoutApi = fullPath.replace(/^\/api\/v1\//, '');
  const pathSegments = pathWithoutApi.split('/').filter(Boolean);
  
  // Get the first segment to determine the endpoint type
  const endpointType = pathSegments[0] || '';

  // Route to the appropriate handler based on the path
  if (endpointType === 'security' && pathSegments[1] === 'audit') {
    return handleSecurityAudit(req, res);
  }
  else if (endpointType === 'loyalty' && pathSegments[1] === 'cards' /* ... */) {
    return handleCustomerCards(req, res, pathSegments[3]);
  }
  // More handlers...
}
```

## Endpoints Handled

This consolidated handler manages the following endpoints:

1. **Security Audit**: `/api/security/audit`
2. **Customer Loyalty Cards**: `/api/loyalty/cards/customer/:id`
3. **Customer Programs**: `/api/customers/:id/programs`
4. **Notifications**: `/api/notifications`
5. **Promotions**: `/api/promotions`

## Benefits

- **Stays within the 12 function limit** while maintaining all functionality
- **Preserves original API URLs** for client code (no changes needed in frontend)
- **Improves maintainability** by grouping related endpoints
- **Reduces cold starts** by consolidating related functionality

## Future Expansion

To add more endpoints to this consolidated handler:

1. Add a new handler function in `[[...path]].ts`
2. Add a new condition in the main handler function
3. Add a new rewrite rule in `vercel.json`

## Limitations

- Slightly increased complexity in routing logic
- All endpoints in a consolidated handler share the same memory and duration limits
- Need to be careful about handler size to avoid hitting Vercel's code size limits
