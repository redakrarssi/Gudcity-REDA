# Notification Deduplication Fix

## Problem
When points were awarded to a customer, multiple notifications appeared in the customer dashboard with a "99+" badge count. This happened because:

1. Multiple services were independently creating notifications when points were awarded
2. Each points transaction triggered a separate notification, regardless of how close together they were in time
3. Notification messages had inconsistent formatting

## Solution

### 1. Notification Deduplication
- Added deduplication logic in `CustomerNotificationService.createNotification()` to check for existing recent notifications from the same business/program
- Added `getRecentPointsNotifications()` method to find notifications from the same business/program within a time window (60 seconds)
- If a recent notification exists, we skip creating a duplicate and return the existing one

### 2. Standardized Notification Messages
- Updated notification message format to consistently use: "You've received X points from [Business Name] in the program [Program Name]"
- Applied this format across all points-awarding code paths:
  - NotificationHandler.ts
  - LoyaltyCardService.ts
  - AwardPointsHandler.ts
  - DirectPointsAward.ts
  - QrCodeService.ts

### 3. Card Data Updates
- Ensured that even when notifications are deduplicated, card data is properly updated
- Added proper creation of sync events to ensure card UI is refreshed

### 4. Testing
- Created a test in `test-api-award-points.mjs` to verify:
  - Points are correctly added to the customer's card
  - Notification messages follow the standardized format
  - When using service layer APIs, notification deduplication works properly

## Technical Implementation Details

### Key Changes
1. In `src/services/customerNotificationService.ts`:
   - Added deduplication check in `createNotification`
   - Added `getRecentPointsNotifications` method to find recent notifications

2. In `src/utils/notificationHandler.ts`:
   - Added additional check for recent notifications
   - Updated message format to be consistent

3. Updated message format across multiple files:
   - `src/services/loyaltyCardService.ts`
   - `src/api/awardPointsHandler.ts`
   - `src/utils/directPointsAward.ts`
   - `src/services/qrCodeService.ts`
   - `server-award-points-fix.js`
   - `fix-qr-scanner-points-final.mjs`

This fix ensures that customers receive a single consolidated notification for points awarded from the same business and program within a short time window, while still correctly updating their points balance. 