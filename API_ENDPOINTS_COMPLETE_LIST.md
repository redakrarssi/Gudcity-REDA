# 🚀 Complete API Endpoints Documentation

## Overview
**Total Serverless Functions: 6**
**Total API Endpoints: 73+**

---

## 📋 Function 1: Health Check
**File:** `api/health.ts`
**Total Endpoints:** 1

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check |

---

## 🔐 Function 2: Authentication
**File:** `api/auth/[action].ts`
**Total Endpoints:** 8

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/logout` | User logout |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/verify` | Verify token validity |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/me` | Get current user info |

---

## 📱 Function 3: QR Code Operations
**File:** `api/qr/[action].ts`
**Total Endpoints:** 5

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/qr/generate` | Generate QR code for customer |
| POST | `/api/qr/validate` | Validate QR code |
| POST | `/api/qr/scan` | Scan and process QR code |
| POST | `/api/qr/revoke` | Revoke QR code |
| GET | `/api/qr/status` | Get QR code status |

---

## ⭐ Function 4: Points Management
**File:** `api/points/[action].ts`
**Total Endpoints:** 6

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/points/award` | Award points to customer |
| POST | `/api/points/redeem` | Redeem points for reward |
| GET | `/api/points/history` | Get points transaction history |
| GET | `/api/points/balance` | Get customer points balance |
| POST | `/api/points/calculate` | Calculate points for amount |
| POST | `/api/points/transfer` | Transfer points (future) |

---

## 🏢 Function 5: Business Management
**File:** `api/businesses/[...slug].ts`
**Total Endpoints:** 24+

### Base Business Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses` | List all businesses |
| POST | `/api/businesses` | Create new business |
| GET | `/api/businesses/:id` | Get business by ID |
| PUT | `/api/businesses/:id` | Update business |
| DELETE | `/api/businesses/:id` | Delete business |

### Customer Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses/:id/customers` | Get business customers |
| POST | `/api/businesses/:id/customers` | Add customer to business |
| POST | `/api/businesses/:id/enroll` | Enroll customer in program |
| POST | `/api/businesses/:id/customers/:customerId` | Enroll specific customer |

### Program Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses/:id/programs` | Get business programs |
| POST | `/api/businesses/:id/programs` | Create new program |
| PUT | `/api/businesses/:id/programs` | Update program |
| DELETE | `/api/businesses/:id/programs` | Delete program |

### Staff Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses/:id/staff` | Get business staff |
| POST | `/api/businesses/:id/staff` | Add staff member |
| PUT | `/api/businesses/:id/staff/:staffId` | Update staff member |
| DELETE | `/api/businesses/:id/staff/:staffId` | Remove staff member |

### Settings & Configuration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses/:id/settings` | Get business settings |
| PUT | `/api/businesses/:id/settings` | Update business settings |

### Analytics & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses/:id/analytics` | Get business analytics |
| GET | `/api/businesses/:id/analytics/revenue` | Get revenue analytics |
| GET | `/api/businesses/:id/analytics/customers` | Get customer analytics |
| GET | `/api/businesses/:id/analytics/engagement` | Get engagement metrics |

---

## 👥 Function 6: Customer Management
**File:** `api/customers/[...slug].ts`
**Total Endpoints:** 12+

### Base Customer Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers |
| POST | `/api/customers` | Create new customer |
| GET | `/api/customers/:id` | Get customer by ID |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |

### Customer Resources
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers/:id/programs` | Get customer programs |
| GET | `/api/customers/:id/cards` | Get customer loyalty cards |
| GET | `/api/customers/:id/transactions` | Get customer transactions |
| GET | `/api/customers/:id/notifications` | Get customer notifications |

### Customer Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers/:id/profile` | Get customer profile |
| PUT | `/api/customers/:id/profile` | Update customer profile |
| GET | `/api/customers/:id/preferences` | Get customer preferences |

---

## 🔔 Function 7: Notifications
**File:** `api/notifications/[...route].ts`
**Total Endpoints:** 13+

### Base Notification Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| POST | `/api/notifications` | Create notification |

### Notification Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/mark-all-read` | Mark all as read |
| GET | `/api/notifications/preferences` | Get notification preferences |
| PUT | `/api/notifications/preferences` | Update preferences |
| POST | `/api/notifications/send-bulk` | Send bulk notifications |
| GET | `/api/notifications/stats` | Get notification statistics |

### Individual Notification Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/:id` | Get notification by ID |
| POST | `/api/notifications/:id/read` | Mark notification as read |
| POST | `/api/notifications/:id/action` | Perform notification action |
| DELETE | `/api/notifications/:id/delete` | Delete notification |
| PUT | `/api/notifications/:id/update` | Update notification |

---

## 📊 Endpoint Summary by Category

### Authentication & Security (9 endpoints)
- Login, Register, Logout, Token Management
- Password Reset & Recovery

### Business Operations (24+ endpoints)
- CRUD operations
- Customer management
- Staff management
- Program management
- Settings & Analytics

### Customer Operations (12+ endpoints)
- CRUD operations
- Profile management
- Resource access (cards, transactions, programs)

### Points & Rewards (6 endpoints)
- Award, Redeem, History, Balance
- Point calculations

### QR Code System (5 endpoints)
- Generate, Validate, Scan, Revoke, Status

### Notifications (13+ endpoints)
- Send, Read, Delete, Preferences
- Bulk operations & Statistics

### System Health (1 endpoint)
- Health check & monitoring

---

## 🎯 Total Count
- **Serverless Functions:** 6 main function files
- **API Endpoints:** 73+ unique endpoints
- **HTTP Methods:** GET, POST, PUT, DELETE
- **Authentication:** JWT-based with role permissions
- **Database:** PostgreSQL via Neon serverless

---

## 📝 Notes

1. **Dynamic Routes:** 
   - `[action]` = Single dynamic parameter
   - `[...slug]` = Multiple dynamic parameters (catch-all)
   - `[...route]` = Route array handling

2. **Authentication:**
   - Most endpoints require JWT authentication
   - Role-based access control (RBAC)
   - Business-scoped data access

3. **Pagination:**
   - List endpoints support pagination
   - Configurable page size and offset
   - Total count returned with results

4. **Filtering:**
   - Search capabilities on list endpoints
   - Filter by business, customer, date range
   - Status and type filtering

5. **Security:**
   - CORS enabled
   - Rate limiting on sensitive endpoints
   - Input validation and sanitization
   - SQL injection protection

---

## 🔄 API Architecture Pattern

Following the **"12 Functions for 90+ Endpoints"** pattern from `fun.md`:

```
Single Serverless Function = Multiple Related Endpoints

Example: api/businesses/[...slug].ts handles:
- /api/businesses (list/create)
- /api/businesses/:id (get/update/delete)
- /api/businesses/:id/customers (list/add)
- /api/businesses/:id/staff (list/add/remove)
- /api/businesses/:id/analytics (various analytics)
... and more!
```

This architecture provides:
- ✅ Fewer cold starts
- ✅ Better resource utilization
- ✅ Easier maintenance
- ✅ Cost-effective scaling
- ✅ Grouped related operations

---

**Last Updated:** $(date)
**Version:** 1.0.0

