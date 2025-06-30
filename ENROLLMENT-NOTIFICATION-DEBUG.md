# Enrollment Notification System - Debug Guide

## Overview

This document provides guidance on troubleshooting the enrollment notification system. We've added enhanced error reporting to help identify and resolve issues with the enrollment approval process.

## Common Issues

The enrollment notification system can fail for several reasons:

1. **Database Errors**: Problems with database connections or constraints
2. **Transaction Failures**: Issues with the transaction process during enrollment approval
3. **Card Creation Failures**: Problems creating loyalty cards after enrollment
4. **Notification Creation Failures**: Issues sending notifications to users
5. **Missing Data**: Required data not found during the enrollment process

## Error Reporting System

We've implemented a comprehensive error reporting system that captures detailed information about failures in the enrollment process. Each error is categorized with a specific error code and includes contextual information to help identify the root cause.

### Error Codes

- `ERR_APPROVAL_NOT_FOUND`: The approval request could not be found
- `ERR_DATABASE`: A database error occurred during the process
- `ERR_NOTIFICATION_CREATION`: Failed to create a notification
- `ERR_ENROLLMENT_CREATION`: Failed to create an enrollment record
- `ERR_CARD_CREATION`: Failed to create a loyalty card
- `ERR_TRANSACTION`: The transaction process failed
- `ERR_UNKNOWN`: An unexpected error occurred

### Accessing Error Logs

Administrators can access the error logs through the Admin Dashboard:

1. Log in as an admin user
2. Navigate to "System → Enrollment Diagnostics"
3. View the list of recent enrollment errors
4. Click on an error to see detailed information

## Troubleshooting Steps

When a customer reports an issue with enrollment approval, follow these steps:

1. **Check Error Logs**: Look for recent errors related to the customer's ID or program ID
2. **Identify Error Type**: Determine what type of error occurred based on the error code
3. **Review Details**: Examine the error details for specific information about what went wrong
4. **Fix Root Cause**: Address the underlying issue based on the error information

### Common Solutions

#### Database Errors

- Check database connection settings
- Verify table constraints and relationships
- Ensure required tables exist

#### Transaction Failures

- Check if the SQL function `process_enrollment_approval` exists
- Verify transaction isolation levels
- Look for conflicting operations

#### Card Creation Failures

- Check if the loyalty card table exists
- Verify enrollment record was created successfully
- Ensure card number generation is working

## Implementation Details

The error reporting system consists of:

1. **Error Reporter Utility**: `src/utils/enrollmentErrorReporter.ts`
2. **Debug API Routes**: `src/api/debugRoutes.ts`
3. **Admin Diagnostic UI**: `src/components/admin/EnrollmentErrorDiagnostic.tsx`
4. **Enhanced Error Handling**: In `NotificationList.tsx` and service wrappers

### How Errors Are Reported

When an error occurs during the enrollment approval process:

1. The error is caught and reported using `reportEnrollmentError()`
2. Error details are logged to the console
3. The error is stored in memory for later retrieval
4. A user-friendly error message is displayed to the customer
5. The error code is included in the message for reference

### How to Clear Error Logs

Administrators can clear error logs from the Enrollment Diagnostics page by clicking the "Clear Logs" button.

## Next Steps for Fixing Issues

If you identify a pattern of errors:

1. Check the database schema for missing tables or constraints
2. Verify that the SQL function for transaction handling is properly implemented
3. Test the enrollment process with different user roles and scenarios
4. Consider adding additional transaction support or retry mechanisms

Remember to check both client-side and server-side logs for a complete picture of what's happening during the enrollment process. 