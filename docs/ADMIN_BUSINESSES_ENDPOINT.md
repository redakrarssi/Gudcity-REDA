# Admin Businesses Endpoint Documentation

## Overview

The `/api/admin/businesses` endpoint provides comprehensive information about all businesses registered on the platform. This endpoint is designed for administrative use and requires admin privileges.

## Endpoint Details

- **URL**: `GET /api/admin/businesses`
- **Authentication**: Required (Admin role only)
- **Content-Type**: `application/json`

## Features

### 1. Comprehensive Business Information

The endpoint retrieves all businesses with detailed information including:

- **Basic Information**: Name, email, status, address, phone, currency
- **Registration Details**: Date of registration, calculated duration
- **Business Profile**: Country, timezone, language, tax ID, business hours
- **Settings**: Payment settings, notification preferences, integrations

### 2. Registration Duration Calculation

Automatically calculates and displays how long each business has been registered:

- **Days**: "15 days registered"
- **Months**: "1 month 10 days registered"
- **Years**: "2 years 3 months 15 days registered"

### 3. Related Data Aggregation

For each business, the endpoint provides:

- **Programs**: All loyalty programs created by the business
- **Customers**: All customers enrolled in the business's programs
- **Promotions**: All promotional codes and offers created
- **Last Login**: Most recent login activity with IP and device info

### 4. Historical Timeline

Chronologically organized timeline of all business activities:

- Business registration
- Program creation
- Customer enrollments
- Promotion launches
- Login activity (last 10 logins)

## Response Format

```json
{
  "success": true,
  "totalBusinesses": 5,
  "businesses": [
    {
      "generalInfo": {
        "id": 1,
        "name": "Sample Business",
        "email": "business@example.com",
        "status": "active",
        "address": "123 Business St, City, State",
        "phone": "+1234567890",
        "currency": "USD",
        "country": "US",
        "timezone": "UTC",
        "language": "en",
        "taxId": "TAX123456",
        "businessHours": { /* JSON object */ },
        "paymentSettings": { /* JSON object */ },
        "notificationSettings": { /* JSON object */ },
        "integrations": { /* JSON object */ },
        "profileUpdatedAt": "2024-01-15T10:30:00Z",
        "source": "user_business"
      },
      "registrationDuration": {
        "registrationDate": "2024-01-01T00:00:00Z",
        "duration": "15 days registered",
        "daysRegistered": 15
      },
      "programs": {
        "count": 2,
        "items": [
          {
            "id": 1,
            "name": "Loyalty Program",
            "description": "Earn points for purchases",
            "type": "POINTS",
            "category": "retail",
            "status": "ACTIVE",
            "created_at": "2024-01-02T00:00:00Z"
          }
        ]
      },
      "customers": {
        "count": 25,
        "items": [
          {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "tier": "Gold",
            "loyalty_points": 150,
            "total_spent": 500.00,
            "visits": 12,
            "joined_at": "2024-01-05T00:00:00Z"
          }
        ]
      },
      "promotions": {
        "count": 3,
        "items": [
          {
            "id": 1,
            "code": "WELCOME10",
            "type": "DISCOUNT",
            "value": 10.00,
            "currency": "USD",
            "name": "Welcome Discount",
            "status": "ACTIVE"
          }
        ]
      },
      "lastLogin": {
        "time": "2024-01-15T09:00:00Z",
        "ipAddress": "192.168.1.100",
        "device": "Chrome/120.0.0.0"
      },
      "timeline": [
        {
          "type": "business_registration",
          "title": "Business Account Created",
          "description": "Sample Business registered on the platform",
          "date": "2024-01-01T00:00:00Z",
          "category": "account"
        },
        {
          "type": "program_created",
          "title": "Loyalty Program Created",
          "description": "Created program: Loyalty Program",
          "date": "2024-01-02T00:00:00Z",
          "category": "programs"
        }
      ]
    }
  ]
}
```

## Database Requirements

The endpoint requires the following tables to exist:

- `users` - Business user accounts
- `business_profile` - Extended business information
- `businesses` - Legacy business records
- `business_daily_logins` - Login tracking
- `loyalty_programs` - Business loyalty programs
- `customers` - Customer information
- `program_enrollments` - Customer program enrollments
- `promo_codes` - Business promotions

## Setup Instructions

1. **Run the schema script**:
   ```bash
   psql -d your_database -f db/admin_businesses_schema.sql
   ```

2. **Ensure admin user exists** with role = 'admin'

3. **Test the endpoint**:
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
        http://localhost:3000/api/admin/businesses
   ```

## Security Considerations

- **Admin-only access**: Endpoint requires admin role
- **Data filtering**: Sensitive information is filtered based on user permissions
- **Rate limiting**: Subject to API rate limiting
- **Audit logging**: All access is logged for security monitoring

## Error Handling

The endpoint includes comprehensive error handling:

- **Authentication errors**: 401 Unauthorized
- **Authorization errors**: 403 Forbidden
- **Database errors**: 500 Internal Server Error
- **Secure error responses**: Error details are sanitized in production

## Performance Notes

- **Efficient queries**: Uses optimized SQL with proper indexes
- **Parallel processing**: Business data is fetched concurrently
- **Caching ready**: Response structure supports future caching implementation
- **Pagination ready**: Can be extended with pagination for large datasets

## Future Enhancements

- **Pagination support** for large business lists
- **Filtering options** by status, date range, location
- **Export functionality** (CSV, Excel)
- **Real-time updates** via WebSocket
- **Advanced analytics** and reporting features