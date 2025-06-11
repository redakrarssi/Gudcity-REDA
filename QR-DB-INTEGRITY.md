# QR Code Database Integrity Improvements

This document outlines the database integrity enhancements implemented for the QR code system in the Gudcity-REDA platform.

## Overview

The QR code database integrity improvements focus on three key areas:

1. **Periodic Integrity Checks**: Automated verification that QR codes match user accounts
2. **Transaction Support**: ACID-compliant database operations for QR code management
3. **Cleanup Process**: Systematic handling of expired and revoked QR codes

## 1. Periodic Integrity Checks

### Implementation Details

The system now performs scheduled integrity checks on QR codes to ensure database consistency:

- **User-QR Code Relationship Validation**: Verifies that every QR code is linked to a valid, active customer account
- **Business Reference Validation**: Ensures business IDs referenced in QR codes exist in the system
- **Digital Signature Verification**: Checks that QR code signatures haven't been tampered with
- **Data Format Validation**: Validates that QR code data adheres to the expected schema

### Components:

- **`QrCodeIntegrityService`**: Core service providing integrity check methods
- **`qr_code_integrity_logs`**: Database table to track results of integrity checks
- **`qr_code_integrity_schedule`**: Database table to manage automated check scheduling
- **`run-qr-integrity.mjs`**: Script for running integrity checks via CLI or cron job

### Running Integrity Checks:

```bash
# Run a manual integrity check
node scripts/run-qr-integrity.mjs --check

# Run check with automatic repair of issues
node scripts/run-qr-integrity.mjs --check --repair

# Run based on schedule
node scripts/run-qr-integrity.mjs
```

## 2. Transaction Support

All QR code operations now use database transactions to ensure ACID compliance:

### Key Features:

- **Atomic Operations**: Multiple database changes are treated as a single unit
- **Consistent State**: Database remains in a valid state even during errors
- **Isolation**: Concurrent operations don't interfere with each other
- **Durability**: Committed changes persist even during system failures

### Implementation:

- **`withRetryableTransaction`**: Wrapper function that provides transaction support with automatic retries
- **`dbRetry.ts`**: Utility that implements exponential backoff and circuit breaking
- **`QrCodeDb`**: Database access layer with built-in transaction support

### Example Usage:

```typescript
// Using transactions for QR code creation
await withRetryableTransaction(async () => {
  // 1. Create the QR code record
  const qrCode = await QrCodeDb.createQrCode({
    qrUniqueId,
    qrType,
    qrData,
    customerId,
    businessId
  });
  
  // 2. Update any related records
  if (qrCode && isPrimary) {
    await QrCodeDb.updatePrimaryStatus(customerId, qrCode.id, qrType);
  }
  
  // All operations succeed or fail together
  return qrCode;
});
```

## 3. Cleanup Process for Expired/Revoked Codes

The system now includes automated cleanup of expired, revoked, or replaced QR codes:

### Features:

- **Archiving**: QR codes are archived before deletion for audit and recovery purposes
- **Configurable Retention**: Cleanup based on age and status
- **Batch Processing**: Handles large volumes of QR codes efficiently
- **Scheduled Execution**: Runs automatically based on configurable schedule

### Components:

- **`qr_codes_archive`**: Database table for archiving old QR codes
- **`cleanupQrCodes`**: Method in `QrCodeIntegrityService` for performing cleanup
- **Script integration**: Cleanup can be triggered manually or via scheduler

### Running Cleanup Process:

```bash
# Run manual cleanup
node scripts/run-qr-integrity.mjs --cleanup

# Configure cleanup options
node scripts/run-qr-integrity.mjs --cleanup --olderThan=30 --noArchive
```

## Database Schema Changes

New tables added to support integrity features:

### QR Code Archive Table:

```sql
CREATE TABLE qr_codes_archive (
  id SERIAL PRIMARY KEY,
  original_id INTEGER NOT NULL,
  qr_unique_id VARCHAR(36) NOT NULL,
  customer_id INTEGER NOT NULL,
  qr_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  qr_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Integrity Check Logs:

```sql
CREATE TABLE qr_code_integrity_logs (
  id SERIAL PRIMARY KEY,
  check_type VARCHAR(50) NOT NULL,
  total_checked INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  orphaned INTEGER NOT NULL,
  repaired INTEGER NOT NULL,
  error_details JSONB,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Integrity Check Schedule:

```sql
CREATE TABLE qr_code_integrity_schedule (
  id SERIAL PRIMARY KEY,
  check_type VARCHAR(50) NOT NULL,
  frequency_hours INTEGER NOT NULL,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Benefits

1. **Data Consistency**: Ensures QR codes always map to valid user accounts
2. **Security Enhancement**: Detects and remediates tampered or invalid QR codes
3. **Performance Optimization**: Regular cleanup prevents database bloat
4. **Operational Reliability**: Transactions ensure operations complete fully or not at all
5. **Audit Trail**: Comprehensive logging of integrity checks and issues

## Implementation Notes

1. Integrity checks are designed to run in the background without impacting normal system operation
2. The repair mode is optional and can be enabled/disabled based on operational requirements
3. All cleanup operations archive data before deletion, preserving historical information
4. Transaction support includes automatic retry for transient database errors
5. Scheduling is configurable via database settings to adapt to different deployment environments
