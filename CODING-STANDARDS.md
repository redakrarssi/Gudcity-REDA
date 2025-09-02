# TypeScript Coding Standards for GudCity REDA

This document outlines the coding standards and best practices for TypeScript development in the GudCity REDA application. Following these standards ensures type safety, maintainability, and consistent code quality across the codebase.

## Type System Principles

### 1. Avoid `any` Types

- **NEVER** use `any` type unless absolutely necessary
- Replace `any` with proper type definitions or use `unknown` as a safer alternative
- Use type narrowing to handle unknown types safely

```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return data.value;
  }
  throw new Error('Invalid data format');
}
```

### 2. Use Discriminated Unions

- Use discriminated unions for data that can take multiple forms
- Include a common field (usually `type`) to discriminate between different types
- Use type narrowing with discriminated unions

```typescript
// ✅ Good example
type CustomerData = {
  type: 'customer';
  customerId: string;
  name: string;
};

type LoyaltyCardData = {
  type: 'loyaltyCard';
  cardId: string;
  customerId: string;
};

type PromoCodeData = {
  type: 'promoCode';
  code: string;
};

type ScanData = CustomerData | LoyaltyCardData | PromoCodeData;

function processData(data: ScanData) {
  switch (data.type) {
    case 'customer':
      // TypeScript knows data is CustomerData here
      return processCustomer(data.customerId);
    case 'loyaltyCard':
      // TypeScript knows data is LoyaltyCardData here
      return processCard(data.cardId);
    case 'promoCode':
      // TypeScript knows data is PromoCodeData here
      return processPromo(data.code);
  }
}
```

### 3. Use Enums and String Literal Types

- Use string literal types for values that have a fixed set of possible values
- Export these types to ensure consistency across the codebase
- Consider using TypeScript enums for complex cases

```typescript
// ✅ Good
export type QrCodeType = 'customer' | 'loyaltyCard' | 'promoCode' | 'unknown';

// Usage
function getIconForType(type: QrCodeType) {
  switch (type) {
    case 'customer':
      return <CustomerIcon />;
    case 'loyaltyCard':
      return <CardIcon />;
    case 'promoCode':
      return <PromoIcon />;
    default:
      return <UnknownIcon />;
  }
}
```

### 4. Use Interface Inheritance

- Use interface inheritance to model relationships between types
- Create base interfaces for common properties
- Extend base interfaces for specific implementations

```typescript
// ✅ Good
interface BaseQrCodeData {
  type: QrCodeType;
  timestamp?: number;
}

interface CustomerQrCodeData extends BaseQrCodeData {
  type: 'customer';
  customerId: string | number;
  name?: string;
}
```

## Null Safety

### 1. Enable Strict Null Checks

- Always enable `strictNullChecks` in TypeScript configuration
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators
- Implement defensive programming patterns

```typescript
// ✅ Good
const userName = user?.name ?? 'Guest';
```

### 2. Default Values and Type Guards

- Provide default values for potentially undefined parameters
- Use type guards to narrow types
- Implement utility functions for common operations

```typescript
// ✅ Good
function ensureId(id: string | number | undefined): string {
  if (id === undefined || id === null) {
    return '0';
  }
  return String(id);
}
```

### 3. Avoid Non-Null Assertions

- Avoid non-null assertions (`!`) whenever possible
- Use proper null checks instead
- Provide meaningful error messages when assertions fail

```typescript
// ❌ Bad
function getName(user?: User): string {
  return user!.name; // Might crash at runtime
}

// ✅ Good
function getName(user?: User): string {
  if (!user) {
    throw new Error('User is required');
  }
  return user.name;
}

// ✅ Also good (with default)
function getName(user?: User): string {
  return user?.name ?? 'Guest';
}
```

## Error Handling

### 1. Structured Error Handling

- Use structured error handling with try/catch blocks
- Provide specific error types for different error scenarios
- Log errors appropriately based on severity

```typescript
// ✅ Good
try {
  await processQrCode(data);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
    setError('Invalid QR code format');
  } else if (error instanceof NetworkError) {
    // Handle network error
    setError('Network error, please try again');
  } else {
    // Handle unknown errors
    setError('An unexpected error occurred');
    // Log for debugging
    console.error('Unexpected error:', error);
  }
}
```

### 2. Error Recovery

- Implement graceful degradation on errors
- Provide fallback behavior when operations fail
- Maintain application state consistency after errors

```typescript
// ✅ Good
const playSound = (type: 'success' | 'error') => {
  try {
    const audio = new Audio(`/assets/sounds/${type}.mp3`);
    audio.volume = 0.5;
    
    // Handle errors during playback
    audio.oncanplaythrough = () => {
      audio.play().catch(() => {
        // Silently fail - audio is non-critical
      });
    };
    
    // Set error handler
    audio.onerror = () => {
      // Silently fail - audio is non-critical
    };
  } catch (error) {
    // Silently fail - audio is non-critical
  }
};
```

## Performance Considerations

### 1. Optimize Debug Logging

- Use conditional compilation for debug logs
- Eliminate debug code in production builds
- Use environment variables to control logging behavior

```typescript
// ✅ Good
const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

const debugLog = DEBUG_ENABLED 
  ? (...args: unknown[]): void => { console.log('[Debug]', ...args); }
  : (..._args: unknown[]): void => { /* No-op in production */ };
```

### 2. Debounce User Interactions

- Debounce rapidly firing events like QR scanning
- Implement proper cleanup for event listeners
- Use timeouts and callbacks carefully

```typescript
// ✅ Good
const DEBOUNCE_MS = 300;
const lastTimeRef = useRef<number>(0);

const handleQrScanDebounced = (text: string) => {
  const now = Date.now();
  if (now - lastTimeRef.current < DEBOUNCE_MS) {
    return;
  }
  
  lastTimeRef.current = now;
  handleQrScan(text);
};
```

### 3. Memoize Expensive Computations

- Use React's `useMemo` and `useCallback` for expensive operations
- Implement custom caching for frequently accessed data
- Optimize rendering performance

```typescript
// ✅ Good
const filteredData = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);
```

## Documentation Standards

### 1. JSDoc Comments

- Add JSDoc comments for all exported functions, interfaces, and types
- Include parameter descriptions, return values, and examples
- Document error conditions and edge cases

```typescript
/**
 * Processes a QR code scan and extracts relevant data
 * 
 * @param scanData - The raw QR code data
 * @returns Processed scan result with type information
 * @throws {ValidationError} If the QR code format is invalid
 * 
 * @example
 * ```typescript
 * const result = processQrCode('{"type":"customer","id":"123"}');
 * ```
 */
function processQrCode(scanData: string): ScanResult {
  // Implementation
}
```

### 2. Component Documentation

- Document React components with JSDoc
- Include props description and examples
- Add notes about component lifecycle and side effects

```typescript
/**
 * QRScanner Component
 * 
 * A versatile QR code scanner component that supports multiple QR code types
 * and provides comprehensive error handling and UI feedback.
 * 
 * @example
 * ```tsx
 * <QRScanner 
 *   businessId="123"
 *   onScan={(result) => console.log('Scanned:', result)}
 * />
 * ```
 */
export const QRScanner: React.FC<QRScannerProps> = (props) => {
  // Implementation
};
```

## File Organization

### 1. Type Definitions

- Place shared type definitions in dedicated files under `src/types/`
- Export type definitions for reuse across components
- Group related types together

### 2. Utility Functions

- Create reusable utility functions for common operations
- Place utilities in a dedicated `src/utils/` directory
- Export and import utilities as needed

### 3. Service Organization

- Organize services by functionality
- Use consistent naming conventions for service methods
- Document service methods with JSDoc

## Testing Standards

### 1. Type Testing

- Test type definitions with TypeScript's `expectType` utility
- Verify that functions reject invalid inputs
- Ensure type narrowing works correctly

### 2. Component Testing

- Test React components with proper types
- Mock dependencies with typed mocks
- Test error handling and edge cases

## Linting and Enforcement

### 1. ESLint Rules

- Enable TypeScript-specific ESLint rules
- Enforce no-any rule with rare exceptions
- Configure pre-commit hooks to catch type errors

### 2. Naming Conventions

- Use consistent naming for interfaces, types, and variables
- Follow React component naming conventions
- Use meaningful names that reflect purpose

## Integration with External Libraries

### 1. Type Definitions

- Use DefinitelyTyped (@types/*) packages when available
- Create custom type definitions for untyped libraries
- Document workarounds for library limitations

### 2. API Integration

- Define strong types for API requests and responses
- Use TypeScript's utility types for API transformations
- Handle API errors with proper typing

By following these standards, we can maintain a high level of type safety and code quality throughout the GudCity REDA application.
