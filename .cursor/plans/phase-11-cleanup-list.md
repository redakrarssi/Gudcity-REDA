# Phase 11: Files to Delete for Serverless Consolidation

## Critical Discovery
Vercel deploys EVERY `.ts` file in `api/` directory as a separate serverless function by default. The catch-all handlers exist but individual files take routing precedence, causing function count to exceed the limit.

## Files to Delete

These files are redundant because their functionality is already handled by catch-all routes:

### Customer Routes (→ api/[[...segments]].ts)
- [ ] api/customers/[customerId]/index.ts
- [ ] api/customers/[customerId]/programs.ts
- [ ] api/customers/business/[businessId].ts
- [ ] api/customers/enroll.ts

### Loyalty Routes (→ api/[[...segments]].ts)
- [ ] api/loyalty/cards/[cardId].ts
- [ ] api/loyalty/cards/customer/[customerId].ts
- [ ] api/loyalty/cards/activities.ts
- [ ] api/loyalty/programs/[programId].ts
- [ ] api/loyalty/programs/list.ts
- [ ] api/loyalty/programs/create.ts

### Notification Routes (→ api/[[...segments]].ts)
- [ ] api/notifications/list.ts
- [ ] api/notifications/[id]/read.ts
- [ ] api/notifications/[id]/delete.ts
- [ ] api/notifications/unread-count.ts
- [ ] api/notifications/customer/[customerId].ts
- [ ] api/notifications/enrollment/request.ts
- [ ] api/notifications/enrollment/respond.ts

### QR Code Routes (→ api/[[...segments]].ts)
- [ ] api/qr/generate.ts
- [ ] api/qr/validate.ts
- [ ] api/qr/process.ts
- [ ] api/qr/integrity.ts

### Transaction Routes (→ api/[[...segments]].ts)
- [ ] api/transactions/award-points.ts
- [ ] api/transactions/customer/[customerId].ts
- [ ] api/transactions/list.ts
- [ ] api/transactions/redeem.ts

### Dashboard Routes (→ api/[[...segments]].ts)
- [ ] api/dashboard/stats.ts

### Settings Routes (→ api/[[...segments]].ts)
- [ ] api/settings/business/[businessId].ts
- [ ] api/settings/user/[userId].ts

### User Routes (→ api/[[...segments]].ts)
- [ ] api/users/list.ts
- [ ] api/users/search.ts

### Business Routes (→ api/business/[businessId]/[[...segments]].ts)
- [ ] api/business/[businessId]/index.ts
- [ ] api/business/[businessId]/analytics.ts
- [ ] api/business/[businessId]/settings.ts

### Analytics Routes (→ api/analytics/[[...segments]].ts)
- [ ] api/analytics/business/[businessId].ts
- [ ] api/analytics/customer/[customerId].ts

### Security & Other Routes
- [ ] api/security/audit.ts (→ api/[[...segments]].ts)
- [ ] api/security/audit/log.ts
- [ ] api/security/audit/events.ts
- [ ] api/feedback/submit.ts (can be added to catch-all)
- [ ] api/feedback/stats.ts (can be added to catch-all)
- [ ] api/health/check.ts (can be added to catch-all)
- [ ] api/health/ping.ts (can be added to catch-all)
- [ ] api/realtime/subscribe.ts (may need to keep if WebSocket/SSE specific)

### Auth Routes (KEEP - These are in vercel.json)
- ✅ KEEP: api/auth/login.ts
- ✅ KEEP: api/auth/register.ts
- ✅ KEEP: api/auth/generate-tokens.ts
- [ ] DELETE: api/auth/change-password.ts (→ catch-all)
- [ ] DELETE: api/auth/logout.ts (→ catch-all)
- [ ] DELETE: api/auth/refresh.ts (→ catch-all)

### Keep These Files (Core Functions)
1. api/auth/login.ts
2. api/auth/register.ts
3. api/auth/generate-tokens.ts
4. api/db/initialize.ts
5. api/users/by-email.ts
6. api/users/[id].ts
7. api/admin/dashboard-stats.ts
8. api/business/[businessId]/[[...segments]].ts
9. api/[[...segments]].ts
10. api/analytics/[[...segments]].ts

**Total Functions After Cleanup: 10 (within 12 limit with 20% headroom)**

## Verification Before Deletion

Before deleting files, verify:
1. Catch-all handler has equivalent route (✅ Already verified in phase-11-serverless-optimization.md)
2. No direct imports of deleted files in client code
3. All service functions are in api/_services/ (not deleted)
4. Middleware in api/_middleware/ intact (not deleted)
5. Auth library in api/_lib/ intact (not deleted)

## Rollback Plan

If issues arise after cleanup:
1. Git revert the deletion commit
2. Or restore from: `.cursor/plans/phase-11-backup/` (create backup before deletion)
3. Or gradually restore specific endpoints that are needed

