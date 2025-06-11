# Coding Standards and Best Practices

## Database Connections

All database connections should use the standardized DatabaseConnector utility:

```typescript
import db from '../utils/databaseConnector';

// Standard pattern for executing database queries
const result = await db.executeQuery(
  'SELECT * FROM users WHERE id = $1',
  [userId],
  {
    cache: {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['users', `user-${userId}`]
    }
  }
);
```

Benefits:
- Consistent error handling and logging
- Built-in support for caching and retry
- Standardized parameterized queries
- Type safety and SQL injection protection

## Database Monitoring and Telemetry

All database operations are automatically monitored through the telemetry system:

```typescript
import telemetry from '../utils/telemetry';
import db from '../utils/databaseConnector';

// Get current database status
const dbStatus = db.getDatabaseStatus();
console.log(`Database status: ${dbStatus.status}`);

// For custom monitoring
telemetry.recordMetric('db.custom.metric', value, {
  operation: 'my-custom-operation'
});

// For custom events
telemetry.recordEvent('db.custom.event', {
  details: 'Something important happened'
}, 'info');

// Subscribe to database status changes
const unsubscribe = telemetry.subscribeToConnectionStatus((status, timestamp) => {
  console.log(`Database status changed to ${status} at ${new Date(timestamp)}`);
});

// Later: unsubscribe when component unmounts
unsubscribe();
```

Benefits:
- Real-time connection status monitoring
- Automatic tracking of query performance
- Detection of slow queries and connection issues
- Centralized diagnostics dashboard for administrators
- Historical metrics for performance analysis

## Data Loading in React Components

All components that fetch data should use the DataLoader pattern:

```tsx
import { useDataLoader } from '../hooks/useDataLoader';
import { DataLoader } from '../components/common/DataLoader';

// In your component
const myDataQuery = useDataLoader(
  ['resource', 'identifier'],
  async () => {
    // Data fetching logic
    return await fetchData();
  },
  {
    fallbackData: [], // Fallback data if the query fails
    loadingDelay: 400, // Delay before showing loading state
  }
);

// In your JSX
return (
  <DataLoader
    data={myDataQuery.data}
    isLoading={myDataQuery.isLoading}
    isError={myDataQuery.isError}
    error={myDataQuery.error}
    refetch={myDataQuery.refetch}
  >
    {(data) => (
      // Render your data here
      <div>{data.map(item => <div key={item.id}>{item.name}</div>)}</div>
    )}
  </DataLoader>
);
```

Benefits:
- Consistent loading and error states
- Standardized stale data indicators
- Optimized performance with delayed loading
- Built-in retry functionality

## Logging

Use the centralized logger instead of console.log:

```typescript
import logger from '../utils/logger';

// Instead of console.log
logger.info('This is an informational message');

// Instead of console.error
logger.error('An error occurred', error);

// Instead of console.warn
logger.warn('This is a warning');

// For debugging only (not shown in production)
logger.debug('Debug information');

// For verbose tracing (development only)
logger.trace('Detailed trace information');

// Create a logger for a specific module
const moduleLogger = logger.createLogger('MyComponent');
moduleLogger.info('This will be prefixed with [MyComponent]');
```

Benefits:
- Environment-based log filtering (no debug logs in production)
- Consistent formatting and prefixing
- Easier to find and remove debug statements
- Potential for remote logging integration

## Batch Queries

For fetching multiple related entities, use batch queries:

```typescript
import db from '../utils/databaseConnector';

// Instead of multiple separate queries
const batchResults = await db.executeBatch([
  {
    id: 'users',
    query: 'SELECT * FROM users WHERE id = ANY($1)',
    params: [userIds]
  },
  {
    id: 'posts',
    query: 'SELECT * FROM posts WHERE user_id = ANY($1)',
    params: [userIds]
  }
], {
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000
  }
});

const users = batchResults.users.data;
const posts = batchResults.posts.data;
```

Benefits:
- Reduced database connection overhead
- Optimized caching
- Parallel execution
- Simplified error handling

## Database Connection Monitoring

- Always use the telemetry utilities for tracking database connection events
- Log appropriate warnings for disconnection events
- Implement proper reconnection logic with exponential backoff
- Use the DatabaseStatus component for real-time status information in admin views
- When implementing database-related features, ensure you have proper error boundaries

## Fallback Behavior Guidelines

- All data-fetching components must gracefully handle database unavailability
- Always implement fallback behavior using the environment configuration settings
- Use the FallbackIndicator component to provide clear visual feedback when in fallback mode
- Implement local fallback at the component level where specific behavior is needed
- Use the global fallback context for application-wide fallback status
- For critical paths, always provide mock data alternatives that can be used when real data is unavailable
- Test both normal and fallback behavior paths during development
- All mockData should be realistic but clearly distinguishable from real data
- When using fallback behavior, log appropriate telemetry events

## Hooks and API Patterns

// ... rest of the file ... 