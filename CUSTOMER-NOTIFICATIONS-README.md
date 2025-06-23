# Customer Notification and Approval System

This document explains the customer notification system added to the GudCity REDA platform, which provides real-time notifications and approval requests for customers.

## Overview

The notification system provides these key features:

1. Real-time notifications when businesses add points to a customer's card
2. Real-time notifications when a business grants a promo code to a customer
3. Approval requests when a business tries to enroll a customer in a loyalty program
4. Approval requests when a business tries to deduct points from a customer's card

## Technical Implementation

### Database Schema

The system uses the following database tables:

- `customer_notifications`: Stores all customer notifications
- `customer_approval_requests`: Stores approval requests requiring customer action
- `customer_notification_preferences`: Stores customer preferences for notifications

The schema is defined in `db/customer_notifications_schema.sql`.

### Backend Services

- `CustomerNotificationService`: Manages notifications and approvals (in `src/services/customerNotificationService.ts`)
- API Routes: Endpoints for notifications and approvals (in `src/api/notificationRoutes.ts`)

### Frontend Components

- `NotificationList`: Displays notifications and approval requests in the customer dashboard (in `src/components/customer/NotificationList.tsx`)
- Integration with the customer cards page (`src/pages/customer/Cards.tsx`)

## API Endpoints

- `GET /api/notifications`: Get customer notifications
- `GET /api/notifications/count`: Get count of unread notifications
- `POST /api/notifications/:id/read`: Mark a notification as read
- `GET /api/approvals`: Get pending approval requests
- `POST /api/approvals/:id/respond`: Respond to an approval request
- `GET /api/notifications/preferences`: Get notification preferences
- `PUT /api/notifications/preferences`: Update notification preferences

## Using the Notification System

### Adding a Customer to a Loyalty Program

When a business adds a customer to a loyalty program, the customer will receive an approval request:

```javascript
// Example code (business side)
await CustomerNotificationService.createApprovalRequest(
  customerId,
  businessId,
  ApprovalRequestType.ENROLLMENT,
  programId,
  "Program Enrollment Request",
  `${businessName} would like to enroll you in their loyalty program`,
  { programName, programDetails }
);
```

The customer will see an approval request in their dashboard and can choose to approve or decline.

### Point Deduction Requests

When a business wants to deduct points:

```javascript
// Example code (business side)
await CustomerNotificationService.createApprovalRequest(
  customerId,
  businessId,
  ApprovalRequestType.POINTS_DEDUCTION,
  cardId,
  "Points Deduction Request",
  `${businessName} wants to deduct ${points} points from your card`,
  { points, reason }
);
```

### Promo Code Assignment

When a business assigns a promo code:

```javascript
// Example code (business side)
await CustomerNotificationService.createNotification(
  customerId,
  businessId,
  CustomerNotificationType.PROMO_CODE,
  "New Promo Code",
  `${businessName} has given you a promo code: ${promoCode}`,
  false,
  cardId,
  { promoCode }
);
```

### Points Addition

When points are added to a customer's card:

```javascript
// Example code (business side)
await CustomerNotificationService.createNotification(
  customerId,
  businessId,
  CustomerNotificationType.POINTS_ADDED,
  "Points Added",
  `${points} points have been added to your card at ${businessName}`,
  false,
  cardId,
  { points }
);
```

## Development Status

The system is implemented with mock data for the frontend components. The backend services and database schema are ready for integration. The database setup script (`setup-customer-notifications-schema.mjs`) should be run to create the necessary tables. 