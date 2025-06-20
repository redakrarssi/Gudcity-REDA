# GudCity REDA Type System Documentation

This document provides comprehensive documentation for the GudCity REDA type system, focusing on the QR code processing pipeline and related functionality.

## Table of Contents

1. [Introduction](#introduction)
2. [Core Type Definitions](#core-type-definitions)
3. [Type Guards & Validation](#type-guards--validation)
4. [Runtime Type Validation](#runtime-type-validation)
5. [QR Code Processing Pipeline](#qr-code-processing-pipeline)
6. [Performance Considerations](#performance-considerations)
7. [Migration Guide](#migration-guide)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

## Introduction

The GudCity REDA type system provides a comprehensive set of TypeScript types, interfaces, and validation utilities to ensure type safety throughout the application. The system is designed to:

- Provide compile-time type checking
- Enable runtime type validation for critical paths
- Improve code maintainability and readability
- Reduce runtime errors through early detection
- Optimize performance for type-heavy operations

## Core Type Definitions

### QR Code Types

The core of our type system revolves around QR code data structures:

```typescript
/**
 * Represents the possible types of QR codes in the system
 */
export type QrCodeType = 'customer' | 'loyaltyCard' | 'promoCode' | 'unknown';

/**
 * Base interface for all QR code data
 */
export interface BaseQrCodeData {
  type: QrCodeType;
  timestamp?: number;
  signature?: string;
  text?: string;
}

/**
 * Customer QR code data
 */
export interface CustomerQrCodeData extends BaseQrCodeData {
  type: 'customer';
  customerId: string | number;
  name?: string;
  email?: string;
  businessId?: string | number;
  // Additional fields for compatibility
  customerName?: string;
  phone?: string;
  tier?: string;
  points?: number;
  loyaltyPoints?: number;
  visits?: number;
  totalSpent?: number;
}

/**
 * Loyalty card QR code data
 */
export interface LoyaltyCardQrCodeData extends BaseQrCodeData {
  type: 'loyaltyCard';
  cardId: string | number;
  customerId: string | number;
  programId: string | number;
  businessId: string | number;
  points?: number;
  // Additional fields for compatibility
  cardNumber?: string;
  cardType?: string;
}

/**
 * Promo code QR code data
 */
export interface PromoCodeQrCodeData extends BaseQrCodeData {
  type: 'promoCode';
  code: string;
  businessId: string | number;
  discount?: number;
  expiryDate?: string;
  // Additional fields for compatibility
  customerId?: string | number;
  value?: number;
  expiresAt?: string;
}

/**
 * Unknown QR code data
 */
export interface UnknownQrCodeData extends BaseQrCodeData {
  type: 'unknown';
  rawData: string;
}

/**
 * Union type for all possible QR code data formats
 */
export type QrCodeData = 
  | CustomerQrCodeData 
  | LoyaltyCardQrCodeData 
  | PromoCodeQrCodeData 
  | UnknownQrCodeData;
```

### Scan Results

The system provides unified scan result interfaces:

```typescript
/**
 * Unified scan result interface
 */
export interface UnifiedScanResult<T extends QrCodeData = QrCodeData> {
  // Required fields
  type: QrCodeType;
  data: T;
  timestamp: string;
  
  // Optional fields
  success?: boolean;
  rawData?: string;
  raw?: string;
  message?: string;
}
```

## Type Guards & Validation

### Type Guards

Type guards are functions that perform runtime checks to determine if a value matches a specific type:

```typescript
/**
 * Type guard to check if data is CustomerQrCodeData
 */
export function isCustomerQrCodeData(data: unknown): data is CustomerQrCodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'customer' &&
    'customerId' in data
  );
}

/**
 * Type guard to check if data is LoyaltyCardQrCodeData
 */
export function isLoyaltyCardQrCodeData(data: unknown): data is LoyaltyCardQrCodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'loyaltyCard' &&
    'cardId' in data
  );
}

/**
 * Type guard to check if data is PromoCodeQrCodeData
 */
export function isPromoCodeQrCodeData(data: unknown): data is PromoCodeQrCodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'promoCode' &&
    'code' in data
  );
}
```

### Validation Results

Validation functions return structured results:

```typescript
/**
 * QR code validation result
 */
export interface QrValidationResult {
  valid: boolean;
  message: string;
  data?: QrCodeData;
}
```

## Runtime Type Validation

For critical paths, especially around QR code processing and API boundaries, we provide performance-optimized runtime type validation:

### Basic Validation

```typescript
import { validateQrCodeData } from '../utils/runtimeTypeValidator';

// Parse and validate QR code data
const qrCodeData = validateQrCodeData(parsedJson);

if (qrCodeData) {
  // Process valid QR code data
} else {
  // Handle invalid data
}
```

### Performance-Optimized Validation

```typescript
import { validateWithFallback, isCustomerQrCodeData } from '../utils/runtimeTypeValidator';

// Validate with fallback for performance-critical paths
const customerData = validateWithFallback(
  parsedData,
  isCustomerQrCodeData,
  { type: 'customer', customerId: '0' } // Fallback value
);

// Process customer data
```

### Validation Caching

For repeated validations of the same data, results are cached:

```typescript
import { isQrCodeData, clearValidationCache } from '../utils/runtimeTypeValidator';

// First validation will check and cache the result
const isValid = isQrCodeData(data);

// Subsequent validations of the same object will use the cached result
const isStillValid = isQrCodeData(data); // Uses cache

// Clear cache if needed
clearValidationCache();
```

## QR Code Processing Pipeline

The QR code processing pipeline uses the type system to ensure type safety throughout:

1. **Scanning**: Raw QR code data is scanned using the `QRScanner` component
2. **Parsing**: Raw data is parsed into structured data
3. **Validation**: Structured data is validated against expected types
4. **Processing**: Validated data is processed based on its type
5. **Response**: Results are returned in a type-safe manner

```typescript
// Example QR code processing pipeline
async function processQrCode(rawData: string): Promise<UnifiedScanResult> {
  // Parse and validate
  const qrCodeData = validateQrCodeData(JSON.parse(rawData));
  
  if (!qrCodeData) {
    return {
      type: 'unknown',
      data: { type: 'unknown', rawData },
      timestamp: new Date().toISOString(),
      success: false,
      message: 'Invalid QR code format'
    };
  }
  
  // Process based on type
  if (isCustomerQrCodeData(qrCodeData)) {
    // Process customer QR code
    return processCustomerQrCode(qrCodeData, rawData);
  } else if (isLoyaltyCardQrCodeData(qrCodeData)) {
    // Process loyalty card QR code
    return processLoyaltyCardQrCode(qrCodeData, rawData);
  } else if (isPromoCodeQrCodeData(qrCodeData)) {
    // Process promo code QR code
    return processPromoCodeQrCode(qrCodeData, rawData);
  }
  
  // Unknown QR code type
  return {
    type: 'unknown',
    data: { type: 'unknown', rawData },
    timestamp: new Date().toISOString(),
    success: false,
    message: 'Unknown QR code type'
  };
}
```

## Performance Considerations

### Compilation Performance

To optimize TypeScript compilation performance:

1. **Avoid excessive type recursion**: Limit recursive types to necessary cases
2. **Split large union types**: Break down large union types into smaller chunks
3. **Use type aliases**: Create type aliases for frequently used complex types
4. **Optimize imports**: Use specific imports instead of wildcard imports
5. **Move type-only imports to .d.ts files**: Separate type definitions from implementation

### Runtime Performance

To optimize runtime type validation performance:

1. **Use validation caching**: Cache validation results for repeated validations
2. **Apply fast path optimizations**: Use `fastTypeCheck` for hot paths
3. **Validate at boundaries**: Only validate data at system boundaries
4. **Use fallbacks**: Provide fallback values for performance-critical paths
5. **Minimize deep validation**: Avoid deep validation of complex objects in hot paths

## Migration Guide

### Migrating from Legacy Types

If you're migrating from legacy type definitions:

1. **Update imports**: Replace old imports with new centralized types
   ```typescript
   // Old
   import { ScanData } from '../components/QRScanner';
   
   // New
   import { QrCodeData } from '../types/qrCode';
   ```

2. **Replace type guards**: Use the new type guards
   ```typescript
   // Old
   if (data.type === 'customer') { ... }
   
   // New
   import { isCustomerQrCodeData } from '../utils/runtimeTypeValidator';
   if (isCustomerQrCodeData(data)) { ... }
   ```

3. **Update validation**: Use the new validation utilities
   ```typescript
   // Old
   const isValid = validateQrCode(data);
   
   // New
   import { validateQrCodeData } from '../utils/runtimeTypeValidator';
   const validatedData = validateQrCodeData(data);
   ```

### Using Codemods

For automated migration, use the provided codemod script:

```bash
node scripts/type-safety-codemod.js --mode convert --target src/components --pattern qrcode-imports
```

## Best Practices

1. **Always validate external data**: Validate all data coming from external sources
2. **Use type guards for narrowing**: Use type guards to narrow types before accessing properties
3. **Provide meaningful error messages**: Include detailed information in validation errors
4. **Monitor type violations**: Use `monitorTypeViolation` to track type issues in production
5. **Test type validation**: Write tests for type validation logic
6. **Document type requirements**: Document expected types in function parameters and returns
7. **Use strict null checks**: Enable `strictNullChecks` in TypeScript configuration
8. **Avoid type assertions**: Use type guards instead of type assertions (`as`)
9. **Use unknown over any**: Prefer `unknown` over `any` for better type safety
10. **Keep types DRY**: Avoid duplicating type definitions

## Troubleshooting

### Common Issues

1. **Type not assignable to parameter**: Ensure the object structure matches the expected type
2. **Property does not exist on type**: Check if you're using the correct type guard
3. **Type 'unknown' is not assignable**: Use a type guard to narrow the type
4. **Cannot find name**: Ensure the type is imported correctly
5. **Type instantiation is excessively deep**: Simplify complex conditional types

### Debugging Type Issues

1. **Use explicit type annotations**: Add explicit types to help identify issues
2. **Check for null/undefined**: Ensure values are not null or undefined
3. **Inspect runtime types**: Use `console.log(typeof data)` to check runtime types
4. **Use TypeScript Playground**: Test complex types in the TypeScript Playground
5. **Enable strictest compiler options**: Enable all strict compiler options to catch issues

## API Reference

### Core Types

- `QrCodeType`: Union of possible QR code types
- `BaseQrCodeData`: Base interface for all QR code data
- `CustomerQrCodeData`: Customer QR code data interface
- `LoyaltyCardQrCodeData`: Loyalty card QR code data interface
- `PromoCodeQrCodeData`: Promo code QR code data interface
- `UnknownQrCodeData`: Unknown QR code data interface
- `QrCodeData`: Union of all QR code data types
- `UnifiedScanResult`: Scan result interface

### Type Guards

- `isQrCodeData(data: unknown): data is QrCodeData`
- `isCustomerQrCodeData(data: unknown): data is CustomerQrCodeData`
- `isLoyaltyCardQrCodeData(data: unknown): data is LoyaltyCardQrCodeData`
- `isPromoCodeQrCodeData(data: unknown): data is PromoCodeQrCodeData`
- `isUnifiedScanResult(result: unknown): result is UnifiedScanResult`

### Validation Utilities

- `validateQrCodeData(data: unknown): QrCodeData | null`
- `validateApiResponse<T>(response: unknown, schema: Record<string, string>): response is T`
- `validateWithFallback<T, F>(data: unknown, validator: (value: unknown) => value is T, fallback: F): T | F`
- `fastTypeCheck(value: unknown, expectedType: string): boolean`
- `monitorTypeViolation(context: string, isValid: boolean, data: unknown, expectedType: string): void`
- `validateApiData(endpoint: string, data: unknown, schema: Record<string, string>): boolean`
- `createValidationError(message: string, expected: string, received: unknown, path?: string): Error`
- `clearValidationCache(): void`

### Helper Functions

- `ensureId(id: string | number | undefined | null): string`
- `safeParseJson(jsonString: string): unknown`
- `fromComponentScanResult(result: object): UnifiedScanResult`
- `toComponentScanResult(result: UnifiedScanResult): object` 