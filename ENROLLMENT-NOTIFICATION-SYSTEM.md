# Enrollment Notification System

This document describes the enrollment notification system that allows business owners to enroll customers in loyalty programs with customer approval.

## Overview

When a business owner attempts to enroll a customer in a loyalty program, the system:

1. Sends a notification to the customer requesting approval
2. Customer can accept or reject the enrollment request
3. If accepted:
   - A loyalty card is created for the customer
   - The customer is added to the business's customer list
   - Both customer and business owner receive confirmation notifications
4. If rejected:
   - The business owner receives a notification that the customer declined

## Implementation Details

### 1. Business Owner Enrolls Customer

When a business owner attempts to enroll a customer through the UI:

```javascript
// In LoyaltyProgramService.enrollCustomer
const enrollmentResult = await LoyaltyProgramService.enrollCustomer(
  customerId,
  programId,
  true // requireApproval = true
);
```

This creates:
- A notification for the customer with `type: 'ENROLLMENT_REQUEST'`
- An approval request record in the database
- A real-time notification sent to the customer's UI

### 2. Customer Receives Notification

The customer sees the enrollment request in their notification center and can choose to accept or reject:

```javascript
// In CustomerNotificationService.respondToApproval
const success = await CustomerNotificationService.respondToApproval(
  approvalId,
  approved // true for accept, false for reject
);
```

### 3. System Processes Response

If approved:
- Creates an enrollment record in `program_enrollments`
- Creates a loyalty card in `loyalty_cards`
- Adds customer to business's customer list in `customer_business_relationships`
- Sends confirmation notifications to both customer and business

If rejected:
- Sends notification to business owner that enrollment was rejected

## Database Schema

The system uses the following tables:

- `customer_notifications`: Stores all notifications
- `customer_approval_requests`: Stores approval requests with status (PENDING, APPROVED, REJECTED)
- `program_enrollments`: Stores customer enrollments in programs
- `loyalty_cards`: Stores customer loyalty cards
- `customer_business_relationships`: Maps customers to businesses

## Notification Types

The system uses the following notification types:

- `ENROLLMENT_REQUEST`: Sent to customer when business requests enrollment
- `ENROLLMENT`: Sent to customer when enrollment is completed
- `ENROLLMENT_ACCEPTED`: Sent to business when customer accepts enrollment
- `ENROLLMENT_REJECTED`: Sent to business when customer rejects enrollment

## Testing

You can test the enrollment notification system using the `test-enrollment-notification.mjs` script:

```bash
node test-enrollment-notification.mjs
```

This script:
1. Creates an enrollment request from a business to a customer
2. Approves the request
3. Verifies that the customer is enrolled and has a loyalty card
4. Checks that appropriate notifications were sent

## Best Practices

- Always use the LoyaltyProgramService.enrollCustomer method with requireApproval=true when enrolling customers from the business side
- Handle both acceptance and rejection cases in the UI
- Display clear notifications to both customers and business owners
- Provide enough context in notifications for users to make informed decisions 