# Clear All Notifications Feature Implementation

This document explains the implementation of the "Clear All" button for notifications in the customer notification bar.

## Overview

The feature allows customers to delete all their notifications at once, clearing the notification center with a single click. This improves user experience by providing a quick way to clean up the notification list without having to delete notifications one by one.

## Implementation Details

### 1. Backend Service

Added a new function in `src/services/customerNotificationDelete.ts`:

```typescript
export async function deleteAllNotifications(customerId: string): Promise<number> {
  try {
    if (!customerId) {
      return 0;
    }
    
    const result = await sql`
      DELETE FROM customer_notifications
      WHERE customer_id = ${parseInt(customerId)}
      RETURNING id
    `;

    return result.length;
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return 0;
  }
}
```

This function deletes all notifications for a given customer and returns the number of notifications deleted.

### 2. Context Integration

Updated the `NotificationContext.tsx` to include the new functionality:

1. Added `deleteAllNotifications` to the context interface
2. Implemented `clearAllNotifications` function that:
   - Calls the service function to delete notifications from the database
   - Updates local state to clear notifications array
   - Resets the unread counter
   - Invalidates relevant queries to ensure UI consistency

```typescript
const clearAllNotifications = async (): Promise<void> => {
  if (!user?.id) return;
  
  try {
    await deleteAllNotifications(user.id.toString());
    setNotifications([]);
    setUnreadCount(0);
    queryClient.invalidateQueries({ 
      queryKey: ['customerNotifications', user.id.toString()]
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
  }
};
```

### 3. UI Implementation

Added a "Clear All" button to the GlobalNotificationCenter component:

- Positioned at the top of the notifications tab
- Includes loading state during deletion
- Disables the button while deletion is in progress
- Uses the Trash2 icon for intuitive understanding
- Provides visual feedback with hover states

```jsx
<div className="flex justify-end mb-4">
  <button
    onClick={handleClearAll}
    disabled={isDeleting || notifications.length === 0}
    className={`flex items-center py-1 px-3 text-sm rounded-md
      ${isDeleting
        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
      }`}
  >
    {isDeleting ? (
      <>
        <Loader className="w-3 h-3 mr-2 animate-spin" />
        Clearing...
      </>
    ) : (
      <>
        <Trash2 className="w-3 h-3 mr-2" />
        Clear All
      </>
    )}
  </button>
</div>
```

## User Experience

The feature improves user experience by:

1. Providing a single-click solution to clear notification clutter
2. Giving visual feedback during the deletion process
3. Maintaining a clean and organized notification center
4. Saving time compared to deleting notifications individually

This implementation follows the project's established patterns for notification handling and UI design. 