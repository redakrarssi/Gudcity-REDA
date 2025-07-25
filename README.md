# GudCity 8 Loyalty Platform

GudCity 8 is a premium loyalty card management platform that allows businesses to create and manage digital loyalty programs for their customers. The platform features QR code-based card scanning, point tracking, and reward redemption.

## Features

- **Premium Card Design**: Elegant, prestigious card designs with unique colors for different business types
- **QR Code Integration**: Secure QR codes for easy point collection and redemption
- **Customer Loyalty Management**: Track customer points, rewards, and activity
- **Business Dashboard**: Comprehensive dashboard for businesses to manage their loyalty programs
- **Multiple Card Support**: Customers can manage multiple loyalty cards from different businesses
- **Responsive Design**: Works seamlessly on mobile and desktop devices

## Technology Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Framer Motion
- Express.js
- PostgreSQL

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/gudcity-5.git
   cd gudcity-5
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   
   Edit the `.env` file with your database credentials and other configuration.

4. Start the development server:
   ```
   npm run dev
   ```

## Building for Production

```
npm run build:prod
```

## License

Copyright © 2023-2024 GudCity. All rights reserved.

## Database Connection Monitoring and Fallback Behavior

The application includes comprehensive database connection monitoring and fallback behavior to ensure a smooth user experience even when database connectivity is disrupted.

### Fallback System Features

- **Configurable Settings**: Environment variables control fallback behavior including timeouts, retry attempts, and mock data usage.
- **Visual Indicators**: Clear visual feedback when the system is using fallback or mock data.
- **Graceful Degradation**: Components automatically use cached or mock data when the database is unavailable.
- **Telemetry Integration**: Comprehensive tracking of connection status and fallback events.
- **Global Status Context**: Application-wide awareness of database connection status.

### How to Configure Fallback Behavior

Fallback behavior can be configured through environment variables:

```
# Enable/disable fallback behavior
VITE_FALLBACK_ENABLED=true

# Timeout for database operations before falling back (ms)
VITE_FALLBACK_TIMEOUT_MS=5000

# Number of retry attempts before falling back
VITE_FALLBACK_RETRY_ATTEMPTS=3

# Whether to show fallback indicators to users
VITE_FALLBACK_SHOW_INDICATOR=true

# Whether to use mock data when database is unavailable
VITE_FALLBACK_MOCK_DATA=true
```

### Using Mock Data

The system provides built-in mock data support for testing and fallback scenarios. To enable mock data mode:

```
VITE_MOCK_DATA=true
```

This will use predefined mock data instead of attempting to connect to a real database.

# Business-Customer Connection Fixes

## Issues Fixed

We've implemented several critical fixes to improve the reliability of business-customer connections in the QR code system:

1. **Enhanced Customer Card Scanning**
   - Improved the `handleCustomerCardScan` function in `QrCodeService` to use more robust error handling
   - Added retry mechanisms for database operations to handle transient failures
   - Fixed rate limiting to use more unique keys (including card numbers) to prevent false rate limits

2. **Fixed Customer-Business Relationship Establishment**
   - Completely rewrote the `verifyOrCreateCustomerBusiness` function with proper transaction handling
   - Added concurrent access protection through double-checking to prevent race conditions
   - Implemented retry logic for database operations to ensure relationships are properly established

3. **Improved Token Rotation and Security Validation**
   - Enhanced the `checkTokenRotation` function to handle edge cases and prevent unnecessary token rotations
   - Added more robust error handling to the token rotation process
   - Improved digital signature generation to include more metadata for better security

4. **Enhanced QR Code Scanning in Business UI**
   - Improved the `handleQrCodeScan` function in `QRScanner.tsx` component to better handle errors
   - Added proper validation of scanned QR codes using the `safeValidateQrCode` utility
   - Improved user experience with better error messages and scan timeout handling

5. **Fixed TypeScript Type Safety Issues**
   - Added proper type definitions for QR scan monitoring with `ExtendedQrScanMonitor` interface
   - Fixed missing method implementations in `qrScanMonitor.ts` by implementing a proper class
   - Created a strongly-typed API client for consistent HTTP requests
   - Added proper error handling for validation steps in the QR code process
   - Fixed null/undefined checking throughout the code to prevent runtime errors

6. **Additional Improvements**
   - Created missing `logScan` method in the `feedbackService` to properly track analytics
   - Added proper request/response typing in the API client
   - Improved error handling in the validation pipeline with better user-facing messages
   - Enhanced data consistency checking to prevent database corruption

## Testing Instructions

To verify that these fixes are working correctly:

1. Log in as a business user and scan a customer's QR code
2. Verify that points are awarded correctly
3. Check that the customer-business relationship appears in the database
4. Test the system's resilience by scanning multiple codes in quick succession
5. Verify that rate limiting works but doesn't block legitimate scans

## Performance Improvements

The implemented fixes also improve performance by:
1. Reducing duplicate database queries
2. Adding proper caching of scanned results
3. Implementing transaction retry logic to increase successful operations rate
4. Using more efficient type checking to reduce runtime validation overhead

## Future Improvements

While we've fixed the critical issues, there are some additional enhancements that could be made in the future:
1. Further refactoring of the QR code validation pipeline to reduce code duplication
2. Adding more comprehensive testing coverage for edge cases
3. Implementing better monitoring and analytics for failed scans
4. Creating a more robust rate limiting system with proper IP tracking

## AI Safety Measures

To prevent unintended modifications to critical parts of the codebase, we've implemented AI safety measures that guide AI assistants when working with this project:

### AI Guidelines System

1. **Safe Coding Rules**: The `reda.md` file contains comprehensive guidelines for AI interactions with this codebase, including which files should not be modified and which require special attention.

2. **Machine-Readable Guidelines**: The `.ai-guidelines` file provides a machine-readable format that AI tools can use to understand critical areas of the codebase.

3. **Safety Checker Script**: The `scripts/check-ai-changes.js` tool verifies that file changes comply with the AI safety guidelines.

4. **Git Integration**: Git hooks automatically check changes against AI safety rules before commits are made.

### Using the AI Safety System

1. **Installation**: Run `node scripts/install-ai-safety-hooks.js` to install the Git hooks.

2. **Manual Checks**: Run `node scripts/check-ai-changes.js [files...]` to manually check specific files.

3. **Making Change Requests**: When requesting AI to make changes, use the format specified in `reda.md`.

4. **Guideline Updates**: Maintain the `.ai-guidelines` file when adding new critical components.

Following these measures helps prevent AI-assisted changes from disrupting critical functionality within the application.

## Business QR Card Scanning & Points Awarding

We've implemented a comprehensive system for businesses to scan customer QR codes and award loyalty points.

### Key Features

- **Quick Points Awarding**: Scan a customer's QR code and award points in seconds
- **Universal Scanner**: Works with both customer QR codes and loyalty card QR codes
- **Program Selection**: Choose which loyalty program to award points for
- **Points Customization**: Easily adjust the number of points to award
- **Real-time Customer Notifications**: Customers receive instant notifications about earned points
- **Success Feedback**: Confetti animation and clear success/error messaging

### Technical Components

- **PointsAwardingModal**: New modal component for the points awarding interface
- **Enhanced LoyaltyCardService**: Added customer information retrieval method
- **Updated QrScannerPage**: Integrated with the new modal and handling for both QR code types

### Documentation

For more detailed information, see [QR-POINT-SYSTEM.md](./QR-POINT-SYSTEM.md)
