# QR Code Error Handling & Validation System

This document outlines the comprehensive error handling and validation system implemented for the QR code functionality in the Gudcity-REDA platform.

## 1. Consistent Validation Framework

### Key Components:

- **`qrCodeValidator.ts`**: Centralized validation for all QR code types with schema enforcement
- **`qrCodeErrorHandler.ts`**: Specialized error types with context and categorization
- **`dbRetry.ts`**: Database resilience mechanisms for temporary failures

### Validation Process:

1. All QR code data passes through standardized validation before processing
2. Type-specific schema enforcement ensures data integrity
3. Contextual error messages provide clear guidance on validation failures

## 2. Error Categorization

Errors are categorized into specific types to enable proper handling and reporting:

| Category | Description | HTTP Status | Example |
|----------|-------------|-------------|---------|
| Validation | Invalid data format or missing fields | 400 | Missing required field 'customerId' |
| Database | Database connection or query failures | 500 | Connection timeout |
| Security | Authentication, signature verification | 403 | Invalid QR code signature |
| Rate Limit | Too many scan attempts | 429 | Rate limit exceeded |
| Expiration | Expired QR codes | 410 | QR code has expired |
| Business Logic | Business rule violations | 422 | Customer account inactive |

## 3. Recovery Mechanisms

### Database Resilience:

- **Automatic Retries**: Implements exponential backoff for transient failures
- **Circuit Breaker Pattern**: Prevents cascading failures during database outages
- **Transaction Safety**: Ensures ACID compliance with proper rollbacks

### API Response Strategy:

- User-friendly error messages for client applications
- Detailed logging for troubleshooting
- Fallback content when possible

## 4. Implementation Details

### Error Handling Flow:

1. QR code scan request received
2. Data validated through `qrCodeValidator.ts`
3. Database operations wrapped in retry mechanism
4. Appropriate error type returned with context
5. Error logged with category and details
6. User-friendly response sent to client

### Logging Strategy:

- Development: Detailed context and stack traces
- Production: Structured logging with error categories
- Analytics: Error patterns tracked for system improvement

## 5. Usage Examples

### Validating QR Code Data:

```typescript
import { safeValidateQrCode } from '../utils/qrCodeValidator';

// Safe validation that returns result object
const { valid, data, error } = safeValidateQrCode(scannedData);

if (!valid) {
  // Handle validation error
  console.error(`Validation error: ${error?.message}`);
  return { success: false, message: error?.userMessage };
}

// Proceed with validated data
processValidQrCode(data);
```

### Database Operations with Retry:

```typescript
import { withRetryableQuery } from '../utils/dbRetry';

// Execute database query with automatic retry
const results = await withRetryableQuery(
  () => sql`SELECT * FROM qr_codes WHERE id = ${qrCodeId}`,
  { qrCodeId, operation: 'fetchQrCode' }
);
```

### Proper Error Handling:

```typescript
import { QrCodeError, logQrCodeError } from '../utils/qrCodeErrorHandler';

try {
  // Attempt operation
  const result = await processQrCode(data);
  return result;
} catch (error) {
  // Log error with context
  logQrCodeError(error, { qrCodeId, scanType });
  
  // Return appropriate user message
  if (error instanceof QrCodeError) {
    return { success: false, message: error.userMessage };
  }
  
  return { 
    success: false, 
    message: 'An unexpected error occurred. Please try again.' 
  };
}
```
