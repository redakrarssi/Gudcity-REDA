# 🗺️ Visual API Endpoint Map

## 📊 Quick Statistics

```
┌─────────────────────────────────────────────────┐
│          GudCity API Endpoint Summary           │
├─────────────────────────────────────────────────┤
│  Total Serverless Functions:        6          │
│  Total API Endpoints:               73+         │
│  Authentication Required:           Most        │
│  Database:                          PostgreSQL  │
│  Runtime:                           Node.js     │
└─────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      FRONTEND APPLICATION                       │
│                    (React + TypeScript + Vite)                  │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTPS Requests
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    SERVERLESS FUNCTIONS (6)                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Health     │  │     Auth     │  │   Business   │        │
│  │  (1 EP)      │  │  (8 EPs)     │  │  (24+ EPs)   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Customer   │  │    Points    │  │   QR Codes   │        │
│  │  (12+ EPs)   │  │  (6 EPs)     │  │  (5 EPs)     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐                                              │
│  │Notifications │                                              │
│  │  (13+ EPs)   │                                              │
│  └──────────────┘                                              │
│                                                                 │
└────────────────────────┬───────────────────────────────────────┘
                         │ SQL Queries
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                     NEON POSTGRESQL DATABASE                    │
│                         (Serverless)                            │
└────────────────────────────────────────────────────────────────┘
```

---

## 📂 File Structure Map

```
/workspace/api/
│
├── 📄 health.ts ──────────────────────► (1 endpoint)
│   └── GET /api/health
│
├── 📁 auth/
│   └── 📄 [action].ts ────────────────► (8 endpoints)
│       ├── POST /api/auth/login
│       ├── POST /api/auth/register
│       ├── POST /api/auth/logout
│       ├── POST /api/auth/refresh
│       ├── POST /api/auth/verify
│       ├── POST /api/auth/forgot-password
│       ├── POST /api/auth/reset-password
│       └── GET  /api/auth/me
│
├── 📁 qr/
│   └── 📄 [action].ts ────────────────► (5 endpoints)
│       ├── POST /api/qr/generate
│       ├── POST /api/qr/validate
│       ├── POST /api/qr/scan
│       ├── POST /api/qr/revoke
│       └── GET  /api/qr/status
│
├── 📁 points/
│   └── 📄 [action].ts ────────────────► (6 endpoints)
│       ├── POST /api/points/award
│       ├── POST /api/points/redeem
│       ├── GET  /api/points/history
│       ├── GET  /api/points/balance
│       ├── POST /api/points/calculate
│       └── POST /api/points/transfer
│
├── 📁 businesses/
│   └── 📄 [...slug].ts ───────────────► (24+ endpoints)
│       ├── GET    /api/businesses
│       ├── POST   /api/businesses
│       ├── GET    /api/businesses/:id
│       ├── PUT    /api/businesses/:id
│       ├── DELETE /api/businesses/:id
│       ├── GET    /api/businesses/:id/customers
│       ├── POST   /api/businesses/:id/customers
│       ├── GET    /api/businesses/:id/programs
│       ├── POST   /api/businesses/:id/programs
│       ├── GET    /api/businesses/:id/staff
│       ├── POST   /api/businesses/:id/staff
│       ├── DELETE /api/businesses/:id/staff/:staffId
│       ├── GET    /api/businesses/:id/settings
│       ├── PUT    /api/businesses/:id/settings
│       ├── GET    /api/businesses/:id/analytics
│       └── ... (more analytics & operations)
│
├── 📁 customers/
│   └── 📄 [...slug].ts ───────────────► (12+ endpoints)
│       ├── GET    /api/customers
│       ├── POST   /api/customers
│       ├── GET    /api/customers/:id
│       ├── PUT    /api/customers/:id
│       ├── DELETE /api/customers/:id
│       ├── GET    /api/customers/:id/programs
│       ├── GET    /api/customers/:id/cards
│       ├── GET    /api/customers/:id/transactions
│       ├── GET    /api/customers/:id/notifications
│       └── ... (more customer operations)
│
├── 📁 notifications/
│   └── 📄 [...route].ts ──────────────► (13+ endpoints)
│       ├── GET    /api/notifications
│       ├── POST   /api/notifications
│       ├── POST   /api/notifications/mark-all-read
│       ├── GET    /api/notifications/preferences
│       ├── POST   /api/notifications/send-bulk
│       ├── GET    /api/notifications/stats
│       ├── POST   /api/notifications/:id/read
│       ├── POST   /api/notifications/:id/action
│       ├── DELETE /api/notifications/:id/delete
│       └── ... (more notification operations)
│
└── 📁 _lib/ & _middleware/ ───────────► (Support functions)
    ├── auth.ts         (JWT verification)
    ├── cors.ts         (CORS handling)
    ├── db.ts           (Database client)
    ├── error-handler.ts (Error management)
    ├── rate-limit.ts   (Rate limiting)
    ├── response.ts     (Response helpers)
    └── validation.ts   (Input validation)
```

---

## 🎯 Endpoint Distribution by Function

```
Function 1: Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
█ (1 endpoint - 1.4%)

Function 2: Authentication  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
████████ (8 endpoints - 11.0%)

Function 3: QR Operations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
█████ (5 endpoints - 6.8%)

Function 4: Points Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
██████ (6 endpoints - 8.2%)

Function 5: Business Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
████████████████████████ (24+ endpoints - 32.9%)

Function 6: Customer Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
████████████ (12+ endpoints - 16.4%)

Function 7: Notifications
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
█████████████ (13+ endpoints - 17.8%)
```

---

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                      │
└─────────────────────────────────────────────────────────────┘

1. User Login
   ↓
   POST /api/auth/login
   ↓
   ┌─────────────────────────┐
   │  JWT Token Generated    │
   │  - Access Token (1h)    │
   │  - Refresh Token (7d)   │
   └─────────────────────────┘
   ↓
2. Make API Request
   ↓
   Headers: Authorization: Bearer <token>
   ↓
   ┌─────────────────────────┐
   │  Middleware Validation  │
   │  1. Token verification  │
   │  2. Role checking       │
   │  3. Rate limiting       │
   └─────────────────────────┘
   ↓
3. Access Protected Resources
   ↓
   [Business/Customer/Points APIs]
```

---

## 📊 HTTP Methods Distribution

```
GET Requests (Read Operations)
════════════════════════════════════════
- List resources
- Get single resource
- Analytics & reports
- History & transactions
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (~38%)

POST Requests (Create Operations)
════════════════════════════════════════
- Create resources
- Award points
- Send notifications
- Perform actions
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (~27%)

PUT Requests (Update Operations)
════════════════════════════════════════
- Update resources
- Modify settings
- Update preferences
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (~21%)

DELETE Requests (Delete Operations)
════════════════════════════════════════
- Remove resources
- Delete relationships
▓▓▓▓▓▓▓▓▓▓ (~14%)
```

---

## 🎨 Endpoint Categories

### 1️⃣ Core Business Operations (40%)
```
• Business CRUD
• Customer management
• Staff management
• Program management
• Settings & configuration
```

### 2️⃣ Loyalty & Rewards (25%)
```
• Points awarding
• Point redemption
• Transaction history
• QR code operations
• Card management
```

### 3️⃣ Customer Experience (20%)
```
• Customer profiles
• Notifications
• Preferences
• Activity tracking
```

### 4️⃣ Analytics & Reporting (10%)
```
• Business analytics
• Revenue reports
• Engagement metrics
• System statistics
```

### 5️⃣ System & Security (5%)
```
• Authentication
• Health checks
• Rate limiting
• Error handling
```

---

## 🚀 Request Flow Example

```
┌─────────────────────────────────────────────────────────────┐
│         Example: Award Points to Customer                    │
└─────────────────────────────────────────────────────────────┘

1. Business scans customer QR code
   ↓
   POST /api/qr/scan
   Body: { qrData, businessId }
   ↓
2. Validate QR and get customer info
   ↓
   [Middleware: Auth + Validation]
   ↓
3. Award points
   ↓
   POST /api/points/award
   Body: { customerId, programId, points, description }
   ↓
   [Database Transaction]
   ├─ Update program_enrollments
   ├─ Insert point_transactions
   └─ Create notification
   ↓
4. Notify customer
   ↓
   POST /api/notifications
   Body: { customerId, type: "POINTS_ADDED", data }
   ↓
5. Return success response
   ↓
   {
     success: true,
     data: { newBalance, pointsAwarded, transactionId }
   }
```

---

## 💡 Key Features

### ✅ Dynamic Routing
- Single function handles multiple related endpoints
- Catch-all parameters for flexible routing
- RESTful URL structure

### ✅ Security
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting on sensitive operations
- Input validation and sanitization
- CORS configuration

### ✅ Database Operations
- Serverless PostgreSQL (Neon)
- Connection pooling
- Transaction support
- Parameterized queries (SQL injection prevention)

### ✅ Error Handling
- Structured error responses
- Development vs production error details
- Error logging with timestamps
- HTTP status codes

### ✅ Response Format
```json
{
  "success": true/false,
  "data": { ... },
  "error": { 
    "message": "...",
    "code": "...",
    "details": { ... }
  },
  "meta": {
    "timestamp": "...",
    "pagination": { ... }
  }
}
```

---

## 📈 Scalability Pattern

Following the **Serverless 12-Function Architecture**:

```
Traditional Approach:
90 endpoints = 90 serverless functions ❌
- High cold start times
- Complex management
- Higher costs

Optimized Approach:
90 endpoints = 6 serverless functions ✅
- Fewer cold starts
- Grouped related operations
- Cost-effective
- Better resource utilization
```

---

## 🔗 Related Documentation

- Full endpoint list: `API_ENDPOINTS_COMPLETE_LIST.md`
- Serverless patterns: `fun.md`
- Security guidelines: `reda.md`
- Database setup: `DB_SETUP.md`

---

**Generated:** $(date)
**API Version:** 1.0.0

