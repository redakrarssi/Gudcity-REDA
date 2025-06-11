# QR Code Error Handling & Validation Improvements

This document outlines the comprehensive error handling and validation enhancements implemented in the Gudcity-REDA QR code system.

## Overview

The QR code system has been enhanced with:

1. **Consistent validation across all entry points**
2. **Comprehensive error logging with categorization**
3. **Recovery paths for temporary database failures**

## 1. Consistent Validation Framework

### Core Components:

- **`qrCodeValidator.ts`**: Provides schema-based validation for all QR code types
- **`qrCodeErrorHandler.ts`**: Defines specialized error types with user-friendly messages
- **`dbOperations.ts`**: Standardizes database operations with built-in validation

### Features:

- Schema validation ensures consistent data format across all QR code types
- Type-specific validation rules for customer cards, loyalty cards, and promo codes
- Contextual error messages that explain validation failures clearly
- Type guards for improved TypeScript integration

## 2. Comprehensive Error Logging

### Error Categories:

| Category | Description | HTTP Status | Example |
|----------|-------------|-------------|---------|
| Validation | Invalid data format or missing fields | 400 | Missing required field 'customerId' |
| Database | Database connection or query failures | 500 | Connection timeout |
| Security | Authentication, signature verification | 403 | Invalid QR code signature |
| Rate Limit | Too many scan attempts | 429 | Rate limit exceeded |
| Expiration | Expired QR codes | 410 | QR code has expired |
| Business Logic | Business rule violations | 422 | Customer account inactive |

### Logging Strategy:

- **Development Environment**:
  - Detailed contextual information in console
  - Complete stack traces
  - Validation failure details

- **Production Environment**:
  - Structured logging with error categories
  - Database logging for persistent error records
  - Sensitive information redaction
  - Error tracking analytics

## 3. Database Resilience Mechanisms

### Recovery Features:

- **Automatic Retry with Exponential Backoff**:
  - Retries failed database operations with increasing delays
  - Configurable retry attempts and delay durations
  - Intelligently identifies retryable vs. non-retryable errors

- **Circuit Breaker Pattern**:
  - Prevents cascading failures during database outages
  - Automatically recovers when database becomes available
  - Three states: CLOSED, OPEN, and HALF-OPEN

- **Transaction Safety**:
  - Ensures ACID compliance with proper transaction handling
  - Automatic rollbacks on failure
  - Consistent error propagation

## Implementation Details

### New Utility Classes:

1. **Enhanced Rate Limiter**:
   - Different rate limits based on QR code type
   - Business-specific rate limiting
   - IP-based protection against brute force attempts

2. **Database Operations Layer**:
   - Standardized database access methods
   - Built-in retry mechanism
   - Consistent error handling

3. **QR Code Error Handler**:
   - Specialized error types with context
   - User-friendly error messages
   - Detailed error logging with context

### Error Handling Flow:

1. QR code scan request received
2. Input validated through `qrCodeValidator.ts`
3. Rate limiting checked through `enhancedRateLimiter.ts`
4. Database operations performed with automatic retries
5. Appropriate error types returned with context
6. User-friendly messages displayed to end-users

## Example Usage

### Input Validation:

```typescript
import { validateQrCodeData } from '../utils/qrCodeValidator';

try {
  // Validate incoming QR code data
  const validatedData = validateQrCodeData(scannedData);
  
  // Proceed with valid data
  processValidQrCode(validatedData);
} catch (error) {
  if (error instanceof QrValidationError) {
    // Handle validation error
    return { success: false, message: error.userMessage };
  }
  
  // Handle other errors
  return { success: false, message: 'An unexpected error occurred' };
}
```

### Database Resilience:

```typescript
import { QrCodeDb } from '../utils/dbOperations';

// Get QR code with automatic retries
try {
  const qrCode = await QrCodeDb.getQrCodeByUniqueId(qrUniqueId, { scanType });
  
  if (!qrCode) {
    return { valid: false, message: 'QR code not found' };
  }
  
  // Process valid QR code
  return processQrCode(qrCode);
} catch (error) {
  // Database errors handled automatically with retries
  logQrCodeError(error, { qrUniqueId, scanType });
  return { valid: false, message: 'Error retrieving QR code' };
}
```

### Rate Limiting:

```typescript
import EnhancedRateLimiter from '../utils/enhancedRateLimiter';

const rateLimiter = new EnhancedRateLimiter();

try {
  // Will throw QrRateLimitError if rate limited
  await rateLimiter.enforceRateLimit({
    businessId,
    ipAddress,
    scanType,
    customerId
  });
  
  // Process scan if not rate limited
  return processQrScan(scanData);
} catch (error) {
  if (error instanceof QrRateLimitError) {
    return { success: false, message: error.userMessage };
  }
  
  // Handle other errors
  return { success: false, message: 'An error occurred' };
}
```

## Benefits

1. **Improved User Experience**:
   - Clear, user-friendly error messages
   - Consistent validation across the platform
   - Reduced downtime during database issues

2. **Enhanced Security**:
   - Better protection against invalid data
   - Protection against brute force attacks
   - Improved audit trail for error investigation

3. **Better Maintainability**:
   - Centralized error handling
   - Consistent error patterns
   - Improved debugging through contextual errors 