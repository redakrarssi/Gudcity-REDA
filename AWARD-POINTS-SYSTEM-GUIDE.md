# Award Points System Guide

This guide explains how to use the fixed award points system that resolves the 405 Method Not Allowed error.

## Quick Start

1. **Include the emergency fix script in your HTML:**

```html
<script src="/fix-405-error.js"></script>
```

2. **Use the global helper function:**

```javascript
awardPointsWithFallback("27", "8", 10, "Points awarded manually")
  .then(result => {
    if (result.success) {
      console.log('Success:', result.message);
    } else {
      console.error('Error:', result.error);
    }
  });
```

3. **Or use the emergency test page:**

Open `http://localhost:3000/emergency-award-points.html` in your browser to test the award points functionality.

## Integration Options

### Option 1: Use the Utility Function (Recommended)

Import the utility function in your TypeScript/JavaScript files:

```typescript
import { awardPoints } from '../utils/awardPointsUtil';

// Award points to a customer
const result = await awardPoints({
  customerId: '27',
  programId: '8',
  points: 10,
  description: 'Points earned from purchase',
  source: 'YOUR_SOURCE'
});

if (result.success) {
  console.log('Points awarded successfully!');
} else {
  console.error('Failed to award points:', result.error);
}
```

### Option 2: Use the React Component

Import the React component for a complete UI solution:

```tsx
import AwardPointsHelper from '../components/AwardPointsHelper';

function MyComponent() {
  const handleSuccess = (result) => {
    console.log('Points awarded:', result);
  };

  const handleError = (error) => {
    console.error('Failed to award points:', error);
  };

  return (
    <div>
      <h2>Award Points</h2>
      <AwardPointsHelper
        customerId="27"
        programId="8"
        initialPoints={10}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

### Option 3: Use the Example Component

Import the example component that includes diagnostics:

```tsx
import AwardPointsExample from '../examples/AwardPointsExample';

function MyPage() {
  return (
    <div>
      <h1>Award Points System</h1>
      <AwardPointsExample />
    </div>
  );
}
```

## How It Works

The fix works by:

1. **Trying Multiple Endpoints**: The system tries multiple endpoints in sequence until one works:
   - `/api/businesses/award-points` (original endpoint)
   - `/api/direct/direct-award-points` (direct API endpoint)
   - `/api/businesses/award-points-direct` (alternative endpoint)
   - `/api/businesses/award-points-emergency` (emergency endpoint)
   - `/api/direct/award-points-emergency` (emergency direct endpoint)
   - `/award-points-emergency` (root emergency endpoint)

2. **Ensuring Proper Authentication**: The system automatically adds the authentication token to requests.

3. **Providing Detailed Error Information**: If all endpoints fail, the system returns detailed error information to help diagnose the issue.

## Troubleshooting

If you're still experiencing issues:

1. **Run Diagnostics**: Use the `checkAwardPointsEndpoints` function to check which endpoints are working:

```typescript
import { checkAwardPointsEndpoints } from '../utils/awardPointsUtil';

const diagnostics = await checkAwardPointsEndpoints();
console.log('Working endpoints:', diagnostics.workingEndpoints);
console.log('Best endpoint:', diagnostics.bestEndpoint);
```

2. **Configure a Specific Endpoint**: If you know which endpoint works best, configure the system to use it:

```typescript
import { configureAwardPoints } from '../utils/awardPointsUtil';

// Configure to use a specific endpoint
configureAwardPoints('/api/direct/direct-award-points');

// Reset to default behavior
configureAwardPoints();
```

3. **Check Browser Console**: Look for error messages in the browser console.

4. **Verify Authentication**: Make sure you have a valid authentication token in localStorage.

## Files Created by the Fix

- `public/fix-405-error.js` - Client-side emergency fix script
- `public/emergency-award-points.html` - Emergency test page
- `src/utils/awardPointsUtil.ts` - Utility functions for award points
- `src/components/AwardPointsHelper.tsx` - React component for award points
- `src/examples/AwardPointsExample.tsx` - Example component with diagnostics

## Server-Side Endpoints

The fix adds several server-side endpoints that bypass middleware conflicts:

- `/api/businesses/award-points-emergency` - Emergency endpoint with lenient authentication
- `/api/direct/award-points-emergency` - Direct emergency endpoint
- `/award-points-emergency` - Root emergency endpoint

These endpoints implement the award points functionality directly, bypassing any problematic middleware or route conflicts.

## Need More Help?

If you're still experiencing issues, try the following:

1. **Check Server Logs**: Look for error messages in the server logs.
2. **Test with Postman**: Use Postman to test the award points endpoints directly.
3. **Check Network Tab**: Use the browser's network tab to inspect request/response details.
4. **Try Different Authentication**: If authentication is failing, try generating a new token. 