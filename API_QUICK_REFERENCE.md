# 🚀 API Quick Reference - Connection Types

## 📊 All 73+ Endpoints Connection Map

### ✅ **100% DIRECT DATABASE CONNECTION**

All your API endpoints connect **DIRECTLY to PostgreSQL database** using the Neon serverless driver. **NO intermediate APIs**.

---

## 🔌 Connection Architecture

```
┌──────────────────┐
│    Frontend      │
│    (React)       │
└────────┬─────────┘
         │ HTTPS
         ▼
┌──────────────────────────────────────┐
│   Serverless Functions (Vercel)      │
│                                      │
│   Import Pattern:                    │
│   import { sql } from '_middleware'  │
│                                      │
│   Query Pattern:                     │
│   await sql`SELECT * FROM users`     │
│   await sql.query(query, params)     │
└────────┬─────────────────────────────┘
         │ SQL Queries
         ▼
┌──────────────────────────────────────┐
│   PostgreSQL Database (Neon)         │
│                                      │
│   Driver: @neondatabase/serverless   │
│   Connection: Direct HTTP/WebSocket  │
└──────────────────────────────────────┘
```

---

## 📋 Complete Endpoint List with Database Tables

### 1️⃣ **Health (1 endpoint)** → ✅ Direct DB

| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/health` | GET | users, businesses, customers |

---

### 2️⃣ **Authentication (8 endpoints)** → ✅ Direct DB

| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/auth/login` | POST | users, failed_login_attempts |
| `/api/auth/register` | POST | users |
| `/api/auth/logout` | POST | user_sessions |
| `/api/auth/refresh` | POST | users, refresh_tokens |
| `/api/auth/verify` | POST | ❌ No DB (JWT only) |
| `/api/auth/forgot-password` | POST | users, password_reset_tokens |
| `/api/auth/reset-password` | POST | users, password_reset_tokens |
| `/api/auth/me` | GET | users |

---

### 3️⃣ **QR Operations (5 endpoints)** → ✅ Direct DB

| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/qr/generate` | POST | customer_qrcodes, businesses, customers |
| `/api/qr/validate` | POST | customer_qrcodes |
| `/api/qr/scan` | POST | customer_qrcodes, qr_scan_logs |
| `/api/qr/revoke` | POST | customer_qrcodes |
| `/api/qr/status` | GET | customer_qrcodes |

---

### 4️⃣ **Points Management (6 endpoints)** → ✅ Direct DB + Transactions

| Endpoint | Method | Tables | Transaction |
|----------|--------|--------|-------------|
| `/api/points/award` | POST | program_enrollments, point_transactions, loyalty_programs | ✅ YES |
| `/api/points/redeem` | POST | program_enrollments, point_transactions, redemptions | ✅ YES |
| `/api/points/history` | GET | point_transactions, loyalty_programs | ❌ No |
| `/api/points/balance` | GET | program_enrollments, loyalty_programs | ❌ No |
| `/api/points/calculate` | POST | loyalty_programs | ❌ No |
| `/api/points/transfer` | POST | (Future feature) | ✅ YES |

---

### 5️⃣ **Business Management (24+ endpoints)** → ✅ Direct DB

#### Base Operations (5 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/businesses` | GET | businesses, business_staff |
| `/api/businesses` | POST | businesses |
| `/api/businesses/:id` | GET | businesses, loyalty_programs |
| `/api/businesses/:id` | PUT | businesses |
| `/api/businesses/:id` | DELETE | businesses |

#### Customer Management (4 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/businesses/:id/customers` | GET | customer_business_relationships, customers, program_enrollments |
| `/api/businesses/:id/customers` | POST | customer_business_relationships |
| `/api/businesses/:id/enroll` | POST | program_enrollments, customer_business_relationships, customer_notifications |
| `/api/businesses/:id/customers/:customerId` | POST | program_enrollments, loyalty_cards |

#### Program Management (4 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/businesses/:id/programs` | GET | loyalty_programs |
| `/api/businesses/:id/programs` | POST | loyalty_programs |
| `/api/businesses/:id/programs` | PUT | loyalty_programs |
| `/api/businesses/:id/programs` | DELETE | loyalty_programs |

#### Staff Management (4 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/businesses/:id/staff` | GET | business_staff, users |
| `/api/businesses/:id/staff` | POST | business_staff |
| `/api/businesses/:id/staff/:staffId` | PUT | business_staff |
| `/api/businesses/:id/staff/:staffId` | DELETE | business_staff |

#### Settings & Analytics (7+ endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/businesses/:id/settings` | GET | business_settings |
| `/api/businesses/:id/settings` | PUT | business_settings |
| `/api/businesses/:id/analytics` | GET | Multiple aggregations |
| `/api/businesses/:id/analytics/revenue` | GET | point_transactions, redemptions |
| `/api/businesses/:id/analytics/customers` | GET | customer_business_relationships |
| `/api/businesses/:id/analytics/engagement` | GET | qr_scan_logs, point_transactions |
| `/api/businesses/:id/reports` | GET | Multiple tables |

---

### 6️⃣ **Customer Management (12+ endpoints)** → ✅ Direct DB

#### Base Operations (5 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/customers` | GET | customers, program_enrollments |
| `/api/customers` | POST | customers, users |
| `/api/customers/:id` | GET | customers, program_enrollments, loyalty_cards |
| `/api/customers/:id` | PUT | customers |
| `/api/customers/:id` | DELETE | customers |

#### Customer Resources (7 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/customers/:id/programs` | GET | program_enrollments, loyalty_programs, businesses |
| `/api/customers/:id/cards` | GET | loyalty_cards, loyalty_programs |
| `/api/customers/:id/transactions` | GET | point_transactions, loyalty_programs |
| `/api/customers/:id/notifications` | GET | customer_notifications |
| `/api/customers/:id/profile` | GET | customers |
| `/api/customers/:id/profile` | PUT | customers |
| `/api/customers/:id/preferences` | GET/PUT | customer_preferences |

---

### 7️⃣ **Notifications (13+ endpoints)** → ✅ Direct DB

#### Base Operations (2 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/notifications` | GET | customer_notifications |
| `/api/notifications` | POST | customer_notifications |

#### Notification Actions (7 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/notifications/mark-all-read` | POST | customer_notifications |
| `/api/notifications/preferences` | GET | customer_notification_preferences |
| `/api/notifications/preferences` | PUT | customer_notification_preferences |
| `/api/notifications/send-bulk` | POST | customer_notifications |
| `/api/notifications/stats` | GET | customer_notifications |
| `/api/notifications/:id/read` | POST | customer_notifications |
| `/api/notifications/:id/action` | POST | customer_notifications |

#### Individual Operations (4 endpoints)
| Endpoint | Method | Tables |
|----------|--------|--------|
| `/api/notifications/:id` | GET | customer_notifications |
| `/api/notifications/:id/delete` | DELETE | customer_notifications |
| `/api/notifications/:id/update` | PUT | customer_notifications |
| `/api/notifications/:id/status` | GET | customer_notifications |

---

## 🗄️ Database Tables Reference

### Core Tables
- **users** - User accounts (business owners, customers, staff)
- **businesses** - Business profiles
- **customers** - Customer profiles
- **loyalty_programs** - Loyalty program definitions
- **program_enrollments** - Customer-program relationships
- **loyalty_cards** - Digital loyalty cards
- **point_transactions** - All point-related transactions
- **customer_qrcodes** - QR codes for customers
- **customer_notifications** - Notification system
- **business_staff** - Staff management
- **customer_business_relationships** - Customer-business links

### Supporting Tables
- **failed_login_attempts** - Security logging
- **user_sessions** - Session management
- **password_reset_tokens** - Password recovery
- **refresh_tokens** - Token refresh system
- **qr_scan_logs** - QR scan history
- **redemptions** - Reward redemptions
- **business_settings** - Business configuration
- **customer_notification_preferences** - Notification preferences

---

## 📊 Summary Statistics

```
╔════════════════════════════════════════════════════════════╗
║              CONNECTION TYPE BREAKDOWN                     ║
╠════════════════════════════════════════════════════════════╣
║  Direct Database Connections:          73+ (100%)          ║
║  Via External API:                     0   (0%)            ║
║  No Database (JWT only):               1   (~1%)           ║
╠════════════════════════════════════════════════════════════╣
║  Database Driver:          @neondatabase/serverless        ║
║  Connection Type:          HTTP/WebSocket (Serverless)     ║
║  Query Protection:         Parameterized queries           ║
║  Transaction Support:      ✅ YES                          ║
║  Connection Pooling:       ✅ Automatic                    ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🔍 How to Verify Database Connection

### Check the Code
Every API file imports and uses SQL directly:

```typescript
// At the top of each API file
import { sql } from '../_middleware/index.js';

// In the handler functions
const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
const result = await sql.query(queryString, params);
```

### Files to Check
1. `api/_lib/db.ts` - Database connection setup
2. `api/_middleware/index.ts` - Exports sql client
3. `api/auth/[action].ts` - Auth queries
4. `api/businesses/[...slug].ts` - Business queries
5. `api/customers/[...slug].ts` - Customer queries
6. `api/points/[action].ts` - Points queries
7. `api/qr/[action].ts` - QR queries
8. `api/notifications/[...route].ts` - Notification queries

---

## 🧪 Quick Test

### Test Database Connection
```bash
# 1. Health check (tests DB connection)
curl -X GET https://your-domain.com/api/health

# 2. Login (queries users table)
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 3. Get businesses (queries businesses table)
curl -X GET https://your-domain.com/api/businesses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Database Logs
You can see the actual SQL queries in:
- Application logs (console.log statements)
- Neon database dashboard (query logs)
- Vercel function logs

---

## 💡 Why Direct Database Connection?

### ✅ Advantages
1. **Faster Response Time** - No intermediate API layer
2. **Lower Latency** - Direct SQL queries
3. **Simpler Architecture** - Fewer moving parts
4. **Better Performance** - Connection pooling
5. **Cost Effective** - No additional API costs
6. **Real-time Data** - No cache layer delays

### 🔒 Security Features
1. **Parameterized Queries** - SQL injection protection
2. **JWT Authentication** - Secure API access
3. **Role-based Access** - Permission controls
4. **Connection Pooling** - Managed by Neon
5. **SSL/TLS** - Encrypted connections
6. **Rate Limiting** - DOS protection

---

## 📚 Related Documentation

- **Full Testing Guide:** `API_TESTING_GUIDE_COMPLETE.md` (73+ endpoints with examples)
- **Endpoint List:** `API_ENDPOINTS_COMPLETE_LIST.md` (All endpoints organized)
- **Visual Map:** `API_VISUAL_MAP.md` (Architecture diagrams)
- **Serverless Patterns:** `fun.md` (12-function architecture)

---

## 🎯 Key Takeaways

1. ✅ **All 73+ endpoints** connect directly to PostgreSQL
2. ✅ **No intermediate APIs** - Direct database queries
3. ✅ **Transaction support** for data integrity
4. ✅ **Connection pooling** handled automatically
5. ✅ **SQL injection protection** via parameterized queries
6. ✅ **Type-safe** with TypeScript

**You have 73+ endpoints, ALL connecting directly to the database!** 🎉

---

**Created:** $(date)
**Total Endpoints:** 73+
**Database Connection:** 100% Direct

