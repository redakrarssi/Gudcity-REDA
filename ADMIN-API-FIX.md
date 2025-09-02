# Admin API and JWT Authentication Fix

This document explains how to fix the issues with `/admin/businesses` page and JWT authentication.

## Issues Fixed

1. **JWT Import and Binding Issues**
   - Fixed `Function.prototype.bind called on incompatible undefined` by creating proper JWT import
   - Ensured proper JWT token generation with issuer and audience fields
   - Added better error handling for JWT token generation

2. **API Connection Issues**
   - Created a dedicated API server that runs on port 3000
   - Fixed connection refusal issues for `/api/admin/businesses` endpoint
   - Added proper CORS handling for cross-origin requests

3. **PostgreSQL Query Errors**
   - Fixed `operator does not exist: record ->> unknown` by correcting JSON operators
   - Properly structured queries with correct JSON handling for PostgreSQL
   - Added error handling for database queries

4. **Authentication Flow Issues**
   - Fixed bearer token generation and validation
   - Added support for JWT token refreshing
   - Implemented proper admin authentication flow

## How to Use the Fix

### Step 1: Setup Environment Variables

Run the server fix script to set up your environment variables:

```bash
node src/server-fix.js
```

This will:
1. Generate secure JWT secrets
2. Set up required environment variables
3. Test the database connection

### Step 2: Start the API Server

Start the dedicated API server for the admin panel:

```bash
npm run api:server
# or
node start-api-server.js
```

This will start a server on port 3000 that handles API requests specifically for the admin panel.

### Step 3: Test the API

Test that the API is working correctly:

```bash
node test-admin-api.js
```

### Step 4: Run the Frontend

In a separate terminal, start the frontend development server:

```bash
npm run dev
```

Then navigate to `/admin/businesses` in your browser.

## Troubleshooting

If you encounter any issues:

1. **Check API Server Logs**: Look for any errors in the API server console
2. **Verify Environment Variables**: Make sure `VITE_JWT_SECRET` and other variables are set in your .env file
3. **Check Database Connection**: Ensure the database connection is working correctly
4. **Clear Browser Cache**: Try clearing your browser cache and reloading
5. **Check API Status**: Use the `/api/health` endpoint to check if the API server is running

## Additional Scripts

- `npm run api:debug`: Start the API server in debug mode
- `npm run api:fix`: Re-run the server fix script
- `npm run admin:api-server`: Alternative command to start the admin API server

## Security Notes

- The JWT secrets are stored securely in your `.env` file
- All sensitive database credentials are removed after usage
- Proper authentication and authorization checks are implemented
- The API server uses CORS protection to prevent unauthorized access
