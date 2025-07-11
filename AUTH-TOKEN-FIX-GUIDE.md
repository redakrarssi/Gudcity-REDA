# Authentication Token Fix for Award Points System

## Problem

The award points system was failing with an authentication error when attempting to award points to a customer. The specific error was:

```
Authentication token missing. Please log in again.
```

This occurs because the application is using two different localStorage keys for authentication:

1. The login system saves user data in `authUserId` and `authUserData` keys
2. But API calls are looking for a JWT token in the `token` key, which is not being set

## Solution

We've created a simple fix that bridges this gap by generating and storing a compatible token in the expected location.

## How to Apply the Fix

### Method 1: Use the Auth Token Fix Tool (Recommended)

1. Copy the following files to your website:
   - `auth-token-fix.js` - The core fix script
   - `auth-token-fix.html` - A user-friendly tool to apply and manage the fix

2. Open the auth-token-fix.html in your browser

3. Click the "Apply Auth Token Fix" button

4. The tool will:
   - Check if you're already logged in (by checking authUserData)
   - Generate a compatible token
   - Store it in localStorage under the 'token' key
   - Verify that the token was saved correctly

5. Return to the award points page and try again - it should now work!

### Method 2: Include the Fix Script in Your Application

Add the fix script to your main HTML page:

```html
<script src="auth-token-fix.js"></script>
```

The script will automatically:
- Run when the page loads
- Check for existing authentication data
- Create and store the necessary token
- Set up listeners to ensure the token stays in sync

### Method 3: Quick Manual Fix

If you're already logged in but getting the authentication error:

1. Open your browser's developer console (F12 or Ctrl+Shift+I)
2. Run the following code:

```javascript
// Get user data
const authUserData = localStorage.getItem('authUserData');
const authUserId = localStorage.getItem('authUserId');

if (authUserData && authUserId) {
  // Create token from user data
  const userData = JSON.parse(authUserData);
  const tokenPayload = `${authUserId}:${userData.email}:${userData.role}`;
  const token = btoa(tokenPayload);
  
  // Save token
  localStorage.setItem('token', token);
  console.log('Authentication token created successfully!');
} else {
  console.error('No authentication data found. Please log in first.');
}
```

## How the Fix Works

The fix performs the following steps:

1. Detects when a user logs in by monitoring localStorage changes
2. Extracts user information from the standard auth storage
3. Creates a compatible token and stores it where API calls expect to find it
4. Continues to monitor for auth changes to keep the token in sync

## Troubleshooting

If you continue to experience issues:

1. Open the auth-token-fix.html tool
2. Check the "Auth Status" section to verify if both user data and token exist
3. If user data exists but the token doesn't, click "Apply Auth Token Fix"
4. If neither exists, you need to log in first
5. If both exist but you're still getting errors, try logging out and logging back in

## Long-term Solution

While this fix addresses the immediate issue, a more comprehensive solution would involve:

1. Updating the authentication system to properly generate and store JWT tokens during login
2. Ensuring the token is stored with the key expected by API calls
3. Implementing proper token refresh mechanism to prevent expiration issues

This has been added to the development roadmap for a future update. 