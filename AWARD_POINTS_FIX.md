# Award Points API Fix

## Problem
The application was failing to award points to customers with the error:
```
Failed to award points to the customer – Try Again
Server rejected request method: POST to /api/businesses/award-points. Allowed methods: unknown
```

This was a 405 Method Not Allowed error, indicating that the API endpoint was not properly configured or the backend server was not running.

## Root Cause
The application is a Vite-based React frontend that was trying to make API calls to `/api/businesses/award-points`, but there was no backend server running to handle these requests. The existing `server.ts` file was designed to work with the frontend but wasn't being started.

## Solution

### 1. Backend Server Setup
Created a standalone backend server (`backend-server.js`) that:
- Runs on port 3001 (separate from the frontend)
- Handles all API requests including `/api/businesses/award-points`
- Includes proper database operations for awarding points
- Has authentication middleware (currently mocked for testing)
- Includes comprehensive error handling and logging

### 2. Frontend Configuration
Updated `vite.config.ts` to proxy API requests to the backend server:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
  }
}
```

### 3. Package.json Scripts
Added new scripts to run the backend server:
```json
{
  "backend": "node backend-server.js",
  "dev:backend": "nodemon backend-server.js"
}
```

## How to Use

### 1. Start the Backend Server
```bash
npm run backend
# or for development with auto-restart:
npm run dev:backend
```

### 2. Start the Frontend
```bash
npm run dev
```

### 3. Test the API
Use the provided test script:
```bash
node test-backend-award-points.js
```

## API Endpoint Details

### POST /api/businesses/award-points

**Request Body:**
```json
{
  "customerId": "27",
  "programId": "11", 
  "points": 10,
  "description": "Points awarded via QR code scan",
  "source": "SCAN",
  "transactionRef": "qr-scan-1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully awarded 10 points to customer Imano",
  "data": {
    "customerId": "27",
    "programId": "11",
    "points": 10,
    "businessId": 3,
    "timestamp": "2025-07-10T01:07:36.875Z",
    "cardId": "25",
    "newBalance": 30,
    "transactionRef": "qr-scan-1234567890"
  }
}
```

## Database Operations

The backend server performs the following database operations:

1. **Customer Validation**: Checks if customer exists in users or customers table
2. **Program Ownership**: Verifies the program belongs to the business
3. **Enrollment Check**: Checks if customer is enrolled in the program
4. **Card Creation**: Creates loyalty card if needed
5. **Points Award**: Updates points in loyalty_cards and customer_programs tables
6. **Transaction Recording**: Records the transaction in loyalty_transactions table
7. **Notification**: Creates customer notification

## Error Handling

The backend includes comprehensive error handling for:
- Missing required fields
- Customer not found
- Program ownership validation
- Database transaction failures
- Network errors

## Authentication

Currently using mock authentication for testing. In production, you should:
1. Implement proper JWT token validation
2. Add proper user role checks
3. Validate business ownership of programs

## Testing

The solution includes test scripts to verify functionality:
- `test-backend-award-points.js` - Tests the backend API directly
- `test-api-award-points.mjs` - Tests the full frontend-to-backend flow

## Deployment

For production deployment:
1. Deploy the backend server to a hosting service (Vercel, Heroku, etc.)
2. Update the Vite proxy configuration to point to the production backend URL
3. Set up proper environment variables for database connection
4. Implement proper authentication and security measures

## Files Modified/Created

### New Files:
- `backend-server.js` - Standalone backend server
- `test-backend-award-points.js` - Backend API test script
- `AWARD_POINTS_FIX.md` - This documentation

### Modified Files:
- `package.json` - Added backend scripts and dependencies
- `vite.config.ts` - Added API proxy configuration
- `src/api/index.ts` - Removed (was causing conflicts)

## Next Steps

1. **Test the solution** by running both frontend and backend servers
2. **Implement proper authentication** for production use
3. **Add more comprehensive error handling** for edge cases
4. **Set up monitoring and logging** for production deployment
5. **Add unit tests** for the backend API endpoints

## Troubleshooting

If you still encounter issues:

1. **Check if backend server is running**: `curl http://localhost:3001/health`
2. **Check if proxy is working**: `curl http://localhost:5173/api/businesses/award-points`
3. **Check database connection**: Verify DATABASE_URL environment variable
4. **Check logs**: Look for error messages in both frontend and backend console output

The solution should now allow you to successfully award points to customers through the QR code scanning functionality.