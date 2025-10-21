# Migration Completion Guide - Phases 7-10

**For:** Completing the remaining backend API migration  
**Status:** Phases 1-6 partially complete  
**Estimated Time:** 40-60 hours

## Quick Start

### Step 1: Check Current State
```bash
# See what's been done
cat MIGRATION_PROGRESS_PHASE_5-10_ACTIVE.md

# See deployment status
cat DEPLOYMENT_GUIDE_PARTIAL_MIGRATION.md
```

### Step 2: Pick Next Service to Migrate

Priority order:
1. `src/services/loyaltyCardService.ts` (critical, 2859 lines)
2. `src/services/loyaltyProgramService.ts` (critical)
3. `src/services/customerService.ts` (critical)
4. `src/services/businessService.ts` (important)
5. `src/services/analyticsService.ts` (important)
6. `src/services/userService.ts` (important)

## Migration Pattern (Standard Approach)

### For Each Service File:

#### 1. Remove Database Imports
```typescript
// REMOVE
import sql from '../utils/db';
import { SqlSecurity } from '../utils/sqlSecurity';

// REMOVE OR COMMENT
const USE_API = import.meta.env.VITE_USE_API !== 'false';

// REPLACE WITH
const USE_API = true; // or remove entirely
```

#### 2. Check for Existing API Methods
```bash
# Search for existing API client methods
grep -n "api.*Client\|ProductionSafeService" src/services/[SERVICE_NAME].ts

# Check if API endpoint exists
ls api/[RESOURCE_NAME]/
```

#### 3. Ensure API Endpoints Exist

If API endpoint doesn't exist, create it first:

```typescript
// api/[resource]/[operation].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateRequest } from '../_lib/auth';
import { [Resource]ServerService } from '../_services/[resource]ServerService';
import { formatSuccessResponse, formatErrorResponse } from '../_services/responseFormatter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { // or POST, PUT, DELETE
    return res.status(405).json(formatErrorResponse('Method not allowed', 405));
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json(formatErrorResponse('Unauthorized', 401));
    }

    // Add authorization checks as needed
    const result = await [Resource]ServerService.[method]([params]);

    return res.status(200).json(formatSuccessResponse(result));
  } catch (error) {
    console.error('Error in [operation] endpoint:', error);
    return res.status(500).json(formatErrorResponse('Internal server error', 500));
  }
}
```

#### 4. Ensure Server Service Exists

Check `api/_services/[resource]ServerService.ts`:

```typescript
// Should have methods like:
export class [Resource]ServerService {
  static async get[Resource]([params]): Promise<[Type]> {
    const result = await sql`
      SELECT * FROM [table]
      WHERE id = ${id}
    `;
    return result[0];
  }
  
  // etc...
}
```

#### 5. Refactor Client Service

**Before:**
```typescript
static async getSomething(id: string): Promise<Something> {
  if (USE_API) {
    try {
      const result = await apiGetSomething(id);
      if (result) return result;
    } catch (error) {
      console.error('API failed, falling back to DB');
    }
  }
  
  // Direct database query (100+ lines)
  try {
    const result = await sql`SELECT * FROM table WHERE id = ${id}`;
    return result[0];
  } catch (error) {
    return fallbackData;
  }
}
```

**After:**
```typescript
static async getSomething(id: string): Promise<Something> {
  try {
    const result = await apiGetSomething(id);
    return result;
  } catch (error: any) {
    console.error('Error getting something:', error);
    throw new Error(error.message || 'Failed to load data');
  }
}
```

#### 6. Test the Changes

```bash
# Run the application
npm run dev

# Test the feature that uses the service
# Check browser console for errors
# Verify API calls in Network tab
```

#### 7. Commit and Document

```bash
git add src/services/[SERVICE_NAME].ts
git commit -m "refactor: migrate [SERVICE_NAME] to API-only

- Remove direct database fallbacks
- Use API client exclusively
- Improve error handling
- Part of Phase 7 migration"
```

Update `MIGRATION_PROGRESS_PHASE_5-10_ACTIVE.md`:
```markdown
- ✅ `src/services/[SERVICE_NAME].ts` - API-only implementation
```

## Common Patterns

### Pattern 1: Simple CRUD Operations

```typescript
// Get by ID
static async get[Resource](id: string): Promise<[Type]> {
  try {
    return await api[Resource]Get(id);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to load [resource]');
  }
}

// List all
static async getAll[Resources](): Promise<[Type][]> {
  try {
    const result = await api[Resources]GetAll();
    return result || [];
  } catch (error: any) {
    console.error('Error loading [resources]:', error);
    return [];
  }
}

// Create
static async create[Resource](data: [Type]): Promise<[Type]> {
  try {
    return await api[Resource]Create(data);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create [resource]');
  }
}

// Update
static async update[Resource](id: string, data: Partial<[Type]>): Promise<[Type]> {
  try {
    return await api[Resource]Update(id, data);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update [resource]');
  }
}

// Delete
static async delete[Resource](id: string): Promise<void> {
  try {
    await api[Resource]Delete(id);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to delete [resource]');
  }
}
```

### Pattern 2: Complex Queries

For complex queries, ensure the server service handles the complexity:

```typescript
// Client service - simple call
static async getComplexData(params: QueryParams): Promise<Data[]> {
  try {
    return await apiGetComplexData(params);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to load data');
  }
}

// Server service - handles complexity
static async getComplexData(params: QueryParams): Promise<Data[]> {
  const result = await sql`
    SELECT 
      t1.*, 
      t2.related_data,
      COUNT(t3.id) as count
    FROM table1 t1
    JOIN table2 t2 ON t1.id = t2.table1_id
    LEFT JOIN table3 t3 ON t1.id = t3.table1_id
    WHERE t1.status = ${params.status}
    GROUP BY t1.id, t2.id
    ORDER BY t1.created_at DESC
  `;
  return result;
}
```

### Pattern 3: Mock Data Fallback (Remove)

**Don't do this anymore:**
```typescript
// BAD - Don't add mock data fallbacks
static async getData(): Promise<Data[]> {
  try {
    return await apiGetData();
  } catch (error) {
    // Return mock data
    return [{ id: '1', name: 'Mock' }]; // NO!
  }
}
```

**Do this instead:**
```typescript
// GOOD - Throw errors, let UI handle gracefully
static async getData(): Promise<Data[]> {
  try {
    return await apiGetData();
  } catch (error: any) {
    throw new Error(error.message || 'Failed to load data');
  }
}
```

## API Client Methods

If API client method doesn't exist, add it to `src/services/apiClient.ts`:

```typescript
// Example API method
export async function api[Resource][Operation](
  [params]: [Type]
): Promise<[ReturnType]> {
  try {
    const response = await fetch(`${API_URL}/api/[resources]/[operation]`, {
      method: 'GET', // or POST, PUT, DELETE
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify([params]) // for POST/PUT
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    const data = await response.json();
    return data.data;
  } catch (error: any) {
    console.error('API [operation] error:', error);
    throw error;
  }
}
```

## Checklist for Each Service

- [ ] Remove `import sql from '../utils/db'`
- [ ] Remove SQL Security imports if unused
- [ ] Remove `USE_API` feature flag or set to `true`
- [ ] Remove all direct SQL queries
- [ ] Remove database fallback code
- [ ] Ensure API client methods exist
- [ ] Ensure API endpoints exist
- [ ] Ensure server services exist
- [ ] Test the refactored service
- [ ] Check for linter errors
- [ ] Update migration progress document
- [ ] Commit changes

## Phase 8: Dashboard Components

For dashboard components, the work is usually simpler:

1. **Check imports:**
   ```typescript
   // If you see this, it's likely fine (using service layer)
   import { SomeService } from '../../services/someService';
   
   // If you see this, needs fixing
   import sql from '../../utils/db';
   ```

2. **Most components likely just need:**
   - Remove unused imports
   - Ensure they call services (not direct DB)
   - Update error handling for API errors

## Phase 9: Final Cleanup

1. **Remove all `USE_API` constants:**
   ```bash
   grep -r "USE_API" src/services/
   # Remove all occurrences
   ```

2. **Remove unused SQL imports:**
   ```bash
   grep -r "import sql from" src/
   # Should only be in server-side files (api/_services/)
   ```

3. **Clean up unused imports:**
   ```bash
   npm run lint
   # Fix any unused import warnings
   ```

4. **Verify production build:**
   ```bash
   npm run build
   grep -r "VITE_DATABASE_URL" dist/
   # Should return nothing
   ```

## Phase 10: Testing

Create test checklist in separate document. Key areas:

1. **Authentication:** Login, register, logout, token refresh
2. **Customer Dashboard:** All pages load, all features work
3. **Business Dashboard:** QR scanning, points, programs, customers
4. **Admin Dashboard:** User management, business management, analytics
5. **Security:** No DB credentials in bundle, API auth works, rate limiting works
6. **Performance:** API calls < 500ms, dashboards load < 3s
7. **Error Handling:** Graceful failures, user-friendly messages

## Tips & Best Practices

1. **Start Small:** Pick one method at a time, test thoroughly
2. **API First:** Always check if API endpoint exists before refactoring
3. **Server Services:** Put complex logic in server services, not endpoints
4. **Error Messages:** Make them user-friendly, not technical
5. **No Fallbacks:** Don't add mock data or database fallbacks
6. **Test Everything:** Every change should be tested immediately
7. **Commit Often:** Small, focused commits are easier to review and rollback
8. **Update Docs:** Keep migration progress document current

## Troubleshooting

**Problem:** API endpoint doesn't exist  
**Solution:** Create it first following the pattern above

**Problem:** Server service doesn't exist  
**Solution:** Create it in `api/_services/[resource]ServerService.ts`

**Problem:** Complex query, not sure how to structure API  
**Solution:** Put complex logic in server service, keep endpoint simple

**Problem:** Service has 1000+ lines of code  
**Solution:** Migrate one method at a time, commit frequently

**Problem:** Not sure if feature still works  
**Solution:** Test it! Run the app, try the feature

## Getting Help

1. **Check existing migrated services:** See `transactionService.ts`, `qrCodeService.ts`, `notificationService.ts` for examples
2. **Check API endpoints:** See `api/transactions/`, `api/qr/`, `api/notifications/` for patterns
3. **Review progress docs:** `MIGRATION_PROGRESS_PHASE_5-10_ACTIVE.md`
4. **Check deployment guide:** `DEPLOYMENT_GUIDE_PARTIAL_MIGRATION.md`

## Estimated Time by Service

- **loyaltyCardService.ts:** 15-20 hours (2859 lines, very complex)
- **loyaltyProgramService.ts:** 8-10 hours (complex)
- **customerService.ts:** 6-8 hours  
- **businessService.ts:** 6-8 hours
- **analyticsService.ts:** 8-10 hours (complex queries)
- **userService.ts:** 4-6 hours
- **authService.ts:** 4-6 hours (may already be done)
- **Remaining services:** 4-6 hours total
- **Dashboard components:** 6-8 hours (mostly imports cleanup)
- **Testing:** 8-10 hours
- **Documentation:** 2-3 hours

**Total:** 70-95 hours (roughly 2-3 weeks full-time)

## Success Criteria

Migration is complete when:

- [ ] All client services use API-only (no SQL imports)
- [ ] All dashboard components have no direct DB access
- [ ] All context files have no direct DB access
- [ ] `npm run build` succeeds
- [ ] `grep -r "import sql" src/` returns no results (except comments)
- [ ] All features tested and working
- [ ] Security audit passed
- [ ] Performance requirements met
- [ ] Documentation updated

Good luck! 🚀

