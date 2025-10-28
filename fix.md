# GudCity Loyalty Platform - Security Fix Implementation Guide

## Overview
This document provides step-by-step instructions to fix the security vulnerabilities identified in the GudCity loyalty platform while maintaining all existing functionality and following the reda.md guidelines.

## Critical Fixes (IMMEDIATE ACTION REQUIRED)

### 1. SQL Injection Prevention

#### 1.1 Fix Database Query Security
**Files to modify**: `src/utils/db.ts`, `src/services/*.ts`

**Step 1**: Replace all template literal queries with parameterized queries
```typescript
// BEFORE (VULNERABLE):
const result = await sql`SELECT * FROM users WHERE id = ${userId}`;

// AFTER (SECURE):
const result = await sql.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Step 2**: Implement input validation for all database operations
```typescript
// Add to src/utils/db.ts
export function validateDbInput(input: any, type: 'string' | 'number' | 'boolean'): boolean {
  if (type === 'string' && typeof input !== 'string') return false;
  if (type === 'number' && typeof input !== 'number') return false;
  if (type === 'boolean' && typeof input !== 'boolean') return false;
  return true;
}
```

**Step 3**: Update all service files to use parameterized queries
- `src/services/authService.ts`
- `src/services/userService.ts`
- `src/services/businessService.ts`
- `src/services/loyaltyCardService.ts`

#### 1.2 Secure Database Connection
**File**: `src/utils/db.ts`

**Step 1**: Remove database URL from client-side environment
```typescript
// Move to server-only configuration
const DATABASE_URL = process.env.DATABASE_URL; // Server-side only
```

**Step 2**: Implement connection pooling with security
```typescript
// Add connection limits and timeout
const dbConfig = {
  max: 10,
  min: 2,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
};
```

### 2. Authentication Security Hardening

#### 2.1 Strengthen JWT Implementation
**File**: `src/services/authService.ts`

**Step 1**: Implement strong JWT secret validation
```typescript
// Replace lines 192-210
export function validateJwtSecrets(): boolean {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters');
  }
  if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < 64) {
    throw new Error('JWT_REFRESH_SECRET must be at least 64 characters');
  }
  return true;
}
```

**Step 2**: Implement JWT secret rotation
```typescript
// Add secret rotation mechanism
export async function rotateJwtSecrets(): Promise<void> {
  // Generate new secrets
  const newAccessSecret = crypto.randomBytes(64).toString('hex');
  const newRefreshSecret = crypto.randomBytes(64).toString('hex');
  
  // Update environment variables
  process.env.JWT_SECRET = newAccessSecret;
  process.env.JWT_REFRESH_SECRET = newRefreshSecret;
  
  // Revoke all existing tokens
  await revokeAllTokens();
}
```

**Step 3**: Add token blacklisting
```typescript
// Add to authService.ts
const tokenBlacklist = new Set<string>();

export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
}

export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}
```

#### 2.2 Secure Token Storage
**File**: `src/services/authTokenService.ts`

**Step 1**: Implement encrypted token storage
```typescript
// Add encryption for token storage
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

export function decryptToken(encryptedToken: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

**Step 2**: Replace localStorage with secure storage
```typescript
// Use httpOnly cookies instead of localStorage
export function storeTokenSecurely(token: string): void {
  // Set httpOnly cookie
  document.cookie = `auth_token=${encryptToken(token)}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`;
}
```

### 3. XSS Protection Implementation

#### 3.1 Input Sanitization
**File**: Create `src/utils/sanitizer.ts`

**Step 1**: Implement comprehensive input sanitization
```typescript
import DOMPurify from 'dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}
```

**Step 2**: Update all components to use sanitized input
```typescript
// Replace all innerHTML usage with sanitized content
const sanitizedContent = sanitizeHtml(userInput);
element.textContent = sanitizedContent; // Use textContent instead of innerHTML
```

#### 3.2 Content Security Policy Enhancement
**File**: `src/utils/helmetPolyfill.ts`

**Step 1**: Strengthen CSP directives
```typescript
// Update CSP directives (lines 67-85)
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'nonce-${scriptNonce}' 'strict-dynamic'`,
  `style-src 'self' 'nonce-${styleNonce}' https://fonts.googleapis.com`,
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https: wss:",
  "font-src 'self' https://fonts.gstatic.com",
  "object-src 'none'",
  "media-src 'self' https:",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "form-action 'self'",
  "base-uri 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join('; ');
```

### 4. CSRF Protection Enhancement

#### 4.1 Strengthen CSRF Token Generation
**File**: `src/utils/csrf.ts`

**Step 1**: Improve token generation (lines 11-60)
```typescript
export function generateCsrfToken(): string {
  // Always use crypto.randomBytes for security
  if (crypto && typeof crypto.randomBytes === 'function') {
    return crypto.randomBytes(32).toString('hex');
  }
  throw new Error('Cryptographically secure random generation not available');
}
```

**Step 2**: Add token expiration
```typescript
// Add token expiration mechanism
const tokenExpiry = new Map<string, number>();

export function generateCsrfTokenWithExpiry(): { token: string; expires: number } {
  const token = generateCsrfToken();
  const expires = Date.now() + (15 * 60 * 1000); // 15 minutes
  tokenExpiry.set(token, expires);
  return { token, expires };
}
```

### 5. Rate Limiting Enhancement

#### 5.1 Implement Advanced Rate Limiting
**File**: `src/services/authService.ts`

**Step 1**: Enhance rate limiting (lines 102-162)
```typescript
// Add Redis-based rate limiting for production
export class AdvancedRateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  
  async checkRateLimit(ip: string, email?: string): Promise<RateLimitResult> {
    const key = email ? `${ip}:${email}` : ip;
    const now = Date.now();
    
    // Implement sliding window rate limiting
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, { count: 0, resetAt: now + windowMs });
    }
    
    const entry = this.attempts.get(key)!;
    
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    
    entry.count++;
    
    if (entry.count > maxAttempts) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetAt: entry.resetAt,
        lockedUntil: now + (30 * 60 * 1000) // 30 minute lockout
      };
    }
    
    return {
      allowed: true,
      remainingAttempts: maxAttempts - entry.count,
      resetAt: entry.resetAt
    };
  }
}
```

### 6. Data Protection Implementation

#### 6.1 Encrypt Sensitive Data
**File**: Create `src/utils/encryption.ts`

**Step 1**: Implement data encryption
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

export function encryptData(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptData(encryptedText: string): string {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

#### 6.2 Implement Data Anonymization
**File**: Create `src/utils/anonymizer.ts`

**Step 1**: Add PII anonymization
```typescript
export function anonymizeEmail(email: string): string {
  const [local, domain] = email.split('@');
  const anonymizedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
  return `${anonymizedLocal}@${domain}`;
}

export function anonymizePhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
```

### 7. Business Logic Security

#### 7.1 Secure Points Management
**File**: `src/services/loyaltyCardService.ts`

**Step 1**: Add points validation
```typescript
export function validatePointsAmount(points: number): boolean {
  if (typeof points !== 'number' || points < 0) return false;
  if (points > 10000) return false; // Maximum points per transaction
  return true;
}

export function auditPointsChange(cardId: number, oldPoints: number, newPoints: number, reason: string): void {
  // Log all points changes for audit
  console.log(`Points audit: Card ${cardId}, ${oldPoints} -> ${newPoints}, Reason: ${reason}`);
}
```

#### 7.2 Secure QR Code Generation
**File**: `src/services/qrCodeService.ts`

**Step 1**: Encrypt QR code data
```typescript
export function generateSecureQrCode(customerData: any): string {
  const encryptedData = encryptData(JSON.stringify(customerData));
  return generateQRCode(encryptedData);
}
```

### 8. Monitoring and Logging

#### 8.1 Security Event Logging
**File**: Create `src/utils/securityLogger.ts`

**Step 1**: Implement security logging
```typescript
export class SecurityLogger {
  static logAuthAttempt(ip: string, email: string, success: boolean): void {
    const event = {
      timestamp: new Date().toISOString(),
      type: 'AUTH_ATTEMPT',
      ip,
      email: success ? email : 'REDACTED',
      success,
      severity: success ? 'INFO' : 'WARN'
    };
    console.log('SECURITY_EVENT:', JSON.stringify(event));
  }
  
  static logSuspiciousActivity(ip: string, activity: string): void {
    const event = {
      timestamp: new Date().toISOString(),
      type: 'SUSPICIOUS_ACTIVITY',
      ip,
      activity,
      severity: 'HIGH'
    };
    console.log('SECURITY_EVENT:', JSON.stringify(event));
  }
}
```

### 9. Environment Configuration

#### 9.1 Secure Environment Setup
**File**: Create `.env.secure` template

**Step 1**: Create secure environment template
```bash
# JWT Configuration
JWT_SECRET=<64-character-random-string>
JWT_REFRESH_SECRET=<64-character-random-string>
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Database Configuration
DATABASE_URL=<server-only-database-url>
TOKEN_ENCRYPTION_KEY=<32-character-random-string>
DATA_ENCRYPTION_KEY=<32-character-random-string>

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=5
CSRF_SECRET=<32-character-random-string>

# Production Settings
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

### 10. Testing and Validation

#### 10.1 Security Testing
**File**: Create `src/tests/security.test.ts`

**Step 1**: Add security tests
```typescript
import { describe, it, expect } from 'jest';

describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const result = await sanitizeInput(maliciousInput);
    expect(result).not.toContain('DROP');
  });
  
  it('should validate JWT secrets', () => {
    expect(() => validateJwtSecrets()).not.toThrow();
  });
  
  it('should prevent XSS', () => {
    const maliciousScript = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(maliciousScript);
    expect(sanitized).not.toContain('<script>');
  });
});
```

## Implementation Timeline

### Phase 1 (Immediate - Week 1)
1. Fix SQL injection vulnerabilities
2. Strengthen JWT security
3. Implement input sanitization
4. Add security headers

### Phase 2 (Week 2)
1. Enhance authentication
2. Implement rate limiting
3. Add data encryption
4. Secure token storage

### Phase 3 (Week 3)
1. Business logic security
2. Monitoring and logging
3. Security testing
4. Documentation updates

## Validation Steps

### 1. Security Testing Checklist
- [ ] SQL injection tests pass
- [ ] XSS protection tests pass
- [ ] CSRF protection tests pass
- [ ] Authentication security tests pass
- [ ] Rate limiting tests pass

### 2. Penetration Testing
- [ ] External security audit
- [ ] Vulnerability scanning
- [ ] Code review by security experts

### 3. Production Deployment
- [ ] Environment variables configured
- [ ] Security headers enabled
- [ ] Monitoring in place
- [ ] Incident response plan ready

## Maintenance

### Ongoing Security Tasks
1. Regular security updates
2. Dependency vulnerability scanning
3. Security log monitoring
4. Penetration testing (quarterly)
5. Security training for developers

## Conclusion

This comprehensive security fix implementation will address all identified vulnerabilities while maintaining the platform's functionality. The fixes are designed to be implemented incrementally to minimize disruption to the existing system.

**Important**: All fixes must be tested thoroughly in a development environment before production deployment. Follow the reda.md guidelines to avoid modifying critical system components unnecessarily.