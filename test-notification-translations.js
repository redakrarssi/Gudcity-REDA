// Test script to verify notification translations work correctly
// This script tests the notification translation service

const { NotificationTranslationService } = require('./src/services/notificationTranslationService');

async function testNotificationTranslations() {
  console.log('🧪 Testing Notification Translation Service...\n');

  // Test data
  const testNotifications = [
    {
      title: 'Program Enrollment Request',
      message: 'Tech Store would like to enroll you in their Points loyalty program. Would you like to join?',
      data: { programName: 'Points', businessName: 'Tech Store' }
    },
    {
      title: '🎉 Reward Redeemed Successfully!',
      message: 'Your Free Coffee is ready! Show this code to redeem: 123456',
      data: { rewardName: 'Free Coffee', trackingCode: '123456' }
    },
    {
      title: 'Loyalty Card Created',
      message: 'Your loyalty card for Premium Program at Coffee Shop is ready',
      data: { programName: 'Premium Program', businessName: 'Coffee Shop' }
    }
  ];

  const languages = ['en', 'ar', 'es', 'fr'];
  const userId = 'test-user-123';

  for (const notification of testNotifications) {
    console.log(`📱 Testing: "${notification.title}"`);
    console.log(`   Original: "${notification.message}"`);
    
    for (const lang of languages) {
      try {
        // Mock the getUserLanguage method to return the test language
        const originalGetUserLanguage = NotificationTranslationService.getUserLanguage;
        NotificationTranslationService.getUserLanguage = async () => lang;
        
        const translated = await NotificationTranslationService.translateNotification(
          notification.title,
          notification.message,
          userId,
          'customer',
          notification.data
        );
        
        console.log(`   ${lang.toUpperCase()}: "${translated.title}"`);
        console.log(`   ${lang.toUpperCase()}: "${translated.message}"`);
        
        // Restore original method
        NotificationTranslationService.getUserLanguage = originalGetUserLanguage;
      } catch (error) {
        console.error(`   ❌ Error translating to ${lang}:`, error.message);
      }
    }
    
    console.log('   ' + '─'.repeat(50));
  }

  console.log('\n✅ Notification translation test completed!');
}

// Run the test
testNotificationTranslations().catch(console.error);