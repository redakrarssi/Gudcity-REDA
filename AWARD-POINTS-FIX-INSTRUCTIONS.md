# Award Points System Fix Instructions

## Overview

This guide provides step-by-step instructions to fix the 405 Method Not Allowed error in the award points system. The fix includes both client-side and server-side components to ensure the award points functionality works correctly.

## Quick Start

### Windows Users

1. Run the batch file:
   ```
   fix-award-points-system.bat
   ```

2. Follow the on-screen instructions.

### Linux/Mac Users

1. Make the script executable:
   ```
   chmod +x fix-award-points-system.sh
   ```

2. Run the script:
   ```
   ./fix-award-points-system.sh
   ```

3. Follow the on-screen instructions.

## Manual Installation

If the quick start doesn't work, follow these steps:

### Step 1: Apply Fixes

Run the following command:

```
node apply-fixes.js
```

This will:
- Apply server-side fixes
- Apply diagnostics middleware
- Copy client-side fixes to the public directory
- Copy verification tool to the public directory

### Step 2: Start Your Server

Start your server as you normally would:

```
npm start
```

### Step 3: Use the Verification Tool

1. Open the verification tool in your browser:
   ```
   http://localhost:3000/verify-award-points.html
   ```

2. Test each endpoint to see which one works best:
   - Click "Check Authentication" to verify your auth token
   - Test the standard endpoint
   - Test the direct endpoint
   - Test the direct award function
   - Test all endpoints to see which one works best

3. Note which endpoint works best.

### Step 4: Update Your Application

Run the update script:

```
node update-award-points-endpoint.js
```

When prompted, enter the number of the best working endpoint.

## Understanding the Fix

### Client-Side Fix

The client-side fix (`fix-award-points-final.js`) does the following:

1. Intercepts award-points requests
2. Ensures proper authentication headers
3. Tries multiple endpoints in sequence
4. Provides detailed error information

### Server-Side Fix

The server-side fix (`server-award-points-fix.js`) does the following:

1. Adds emergency endpoints that bypass middleware conflicts
2. Implements direct SQL operations for award points
3. Provides lenient authentication for testing
4. Adds diagnostic endpoints to verify functionality

### Diagnostics

The diagnostics middleware (`apply-diagnostics.js`) does the following:

1. Logs detailed information about route registration
2. Tracks middleware execution
3. Identifies where 405 errors are coming from
4. Provides stack traces for debugging

## Using the Award Points Function

After applying the fix, you can award points using the following methods:

### In TypeScript/JavaScript Files

```typescript
import { awardPoints } from '../utils/awardPointsHelper';

// Award points to a customer
const result = await awardPoints(
  customerId,  // Customer ID
  programId,   // Program ID
  points,      // Number of points
  'Points earned from purchase',  // Description (optional)
  'POS_SYSTEM'  // Source (optional)
);

if (result.success) {
  console.log('Points awarded successfully!');
} else {
  console.error('Failed to award points:', result.error);
}
```

### In HTML Files

Make sure to include the fix script:

```html
<script src="/fix-award-points-final.js"></script>
```

Then use the global helper function:

```javascript
awardPointsWithFallback(
  customerId,
  programId,
  points,
  'Points earned from promo'
).then(result => {
  if (result.success) {
    console.log('Points awarded successfully!');
  } else {
    console.error('Failed to award points:', result.error);
  }
});
```

## Troubleshooting

If you encounter issues:

1. **Check the server logs** for detailed diagnostics
2. **Verify authentication** - make sure you have a valid auth token
3. **Try emergency endpoints** - use the emergency endpoints if regular ones fail
4. **Check CORS settings** - ensure CORS is properly configured
5. **Verify database connection** - make sure the database is accessible

## Files Created by the Fix

- `fix-award-points-final.js` - Client-side fix
- `server-award-points-fix.js` - Server-side fix
- `apply-diagnostics.js` - Diagnostics middleware
- `verify-award-points.html` - Verification tool
- `src/config/awardPointsConfig.ts` - Configuration file
- `src/utils/awardPointsHelper.ts` - Helper functions
- `AWARD-POINTS-USAGE.md` - Usage documentation

## Need More Help?

If you're still experiencing issues, try the following:

1. Run the verification tool with browser developer tools open
2. Check the network tab for request/response details
3. Look for specific error messages in the console
4. Try the emergency endpoints directly:
   - `/api/businesses/award-points-emergency`
   - `/api/direct/award-points-emergency`
   - `/award-points-emergency` 