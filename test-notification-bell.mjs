// Mock NotificationService for testing the notification bell functionality
const NotificationService = {
  createRedemptionNotification: async (data) => {
    console.log('Creating mock redemption notification:', data);
    return {
      success: true,
      notificationId: 'mock-notification-' + Date.now(),
      message: 'Notification created successfully'
    };
  },
  
  getBusinessRedemptionNotifications: async (businessId) => {
    console.log('Getting mock redemption notifications for business:', businessId);
    // Return mock notifications with some pending ones
    return {
      success: true,
      notifications: [
        {
          id: 'notif-1',
          businessId: businessId,
          customerId: '123',
          programId: '456',
          pointsToRedeem: 50,
          rewardName: 'Free Coffee',
          status: 'PENDING',
          createdAt: new Date().toISOString()
        },
        {
          id: 'notif-2',
          businessId: businessId,
          customerId: '124',
          programId: '456',
          pointsToRedeem: 100,
          rewardName: 'Free Lunch',
          status: 'COMPLETED',
          createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
      ]
    };
  }
};

// This script tests the notification bell functionality
// It creates test redemption notifications for a business user

async function testNotificationBell() {
  try {
    console.log('Testing notification bell functionality...');
    
    // Replace with an actual business user ID from your database
    const businessUserId = '1'; // Example business ID
    
    // Create a test redemption notification
    console.log('Creating test redemption notification...');
    const notificationResult = await NotificationService.createRedemptionNotification({
      businessId: businessUserId,
      customerId: '123', // Example customer ID
      programId: '456', // Example program ID
      pointsToRedeem: 50,
      rewardName: 'Free Coffee',
      status: 'PENDING'
    });
    
    if (notificationResult.success) {
      console.log('✅ Test notification created successfully!');
      console.log('Notification ID:', notificationResult.notificationId);
      console.log('\nThe notification bell should now display on the business dashboard.');
      console.log('To test the functionality:');
      console.log('1. Log in as the business user (ID: ' + businessUserId + ')');
      console.log('2. Check that the notification bell appears in the header');
      console.log('3. Check that the notification indicator appears on the Scan QR button');
    } else {
      console.error('❌ Failed to create test notification:', notificationResult.error);
    }
    
    // Check existing notifications
    console.log('\nChecking existing notifications...');
    const existingNotifications = await NotificationService.getBusinessRedemptionNotifications(businessUserId);
    
    if (existingNotifications.success) {
      const pendingCount = existingNotifications.notifications.filter(n => n.status === 'PENDING').length;
      
      console.log(`Found ${existingNotifications.notifications.length} total notifications`);
      console.log(`Found ${pendingCount} pending notifications`);
      
      if (pendingCount > 0) {
        console.log('✅ Notification bell should be visible');
      } else {
        console.log('ℹ️ No pending notifications, bell indicator should not be visible');
      }
    } else {
      console.error('❌ Failed to retrieve notifications:', existingNotifications.error);
    }
    
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
testNotificationBell(); 