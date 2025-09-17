# Notification Translation System

## Overview

The notification translation system automatically translates customer notification messages based on the user's language preference from their settings. This ensures that all notifications are displayed in the user's chosen language (Arabic, Spanish, French, or English).

## How It Works

### 1. Translation Service (`NotificationTranslationService`)

The `NotificationTranslationService` is responsible for:
- Getting the user's language preference from their settings
- Translating notification titles and messages based on content patterns
- Extracting parameters from messages for proper interpolation
- Falling back to English if translation fails

### 2. Language Detection

The system automatically detects the user's language by:
- Checking customer settings via `CustomerSettingsService.getSettings()`
- Checking business settings via `BusinessSettingsService.getSettings()`
- Defaulting to English if no language preference is found

### 3. Translation Process

When a notification is created:
1. The system checks if translation is enabled (default: true)
2. Gets the user's language preference
3. Loads the appropriate translation resources
4. Matches the notification content against known patterns
5. Applies the translation with proper parameter interpolation
6. Stores the translated message in the database

## Supported Notification Types

### Enrollment Notifications
- **Program Enrollment Request**: "Program Enrollment Request" → "طلب انضمام للبرنامج" (Arabic)
- **Program Joined**: "Program Joined" → "تم الانضمام للبرنامج" (Arabic)
- **Program Declined**: "Program Declined" → "تم رفض البرنامج" (Arabic)

### Reward Notifications
- **Reward Redeemed Successfully**: "🎉 Reward Redeemed Successfully!" → "🎉 تم استبدال المكافأة بنجاح!" (Arabic)
- **Your Reward Is Ready**: "Your Free Coffee is ready! Show this code to redeem: 123456" → "مكافأتك Free Coffee جاهزة! اعرض هذا الرمز للاستبدال: 123456" (Arabic)

### Loyalty Card Notifications
- **Loyalty Card Created**: "Loyalty Card Created" → "تم إنشاء بطاقة الولاء" (Arabic)
- **Your Loyalty Card Is Ready**: "Your loyalty card for Premium Program at Coffee Shop is ready" → "بطاقة الولاء الخاصة بك لبرنامج Premium Program في Coffee Shop جاهزة" (Arabic)

## Implementation Details

### Service Integration

All notification services now support translation:

```typescript
// CustomerNotificationService
await CustomerNotificationService.createNotification({
  // ... other properties
  translate: true // Enable translation (default: true)
});

// LoyaltyCardService
await CustomerNotificationService.createNotification({
  // ... other properties
  translate: true
});

// LoyaltyProgramService
await CustomerNotificationService.createNotification({
  // ... other properties
  translate: true
});
```

### Translation Keys

The system uses the following translation keys in `src/i18n/index.ts`:

```typescript
// English
programEnrollmentRequest: 'Program Enrollment Request',
rewardRedeemedSuccessfully: '🎉 Reward Redeemed Successfully!',
loyaltyCardCreated: 'Loyalty Card Created',
// ... more keys

// Arabic
programEnrollmentRequest: 'طلب انضمام للبرنامج',
rewardRedeemedSuccessfully: '🎉 تم استبدال المكافأة بنجاح!',
loyaltyCardCreated: 'تم إنشاء بطاقة الولاء',
// ... more keys
```

### Pattern Matching

The translation service uses pattern matching to identify notification types:

```typescript
// Example pattern matching
if (title.includes('Program Enrollment Request')) {
  return t('programEnrollmentRequest');
}

if (message.includes('is ready! Show this code to redeem:')) {
  return t('yourRewardIsReady', {
    rewardName: params.rewardName || t('aReward'),
    trackingCode: params.trackingCode
  });
}
```

## Language Support

### Currently Supported Languages
- **English (en)**: Default language
- **Arabic (ar)**: Right-to-left text support
- **Spanish (es)**: Latin American Spanish
- **French (fr)**: European French

### Adding New Languages

To add support for a new language:

1. Add the language to the i18n resources in `src/i18n/index.ts`
2. Add the notification translation keys for the new language
3. The system will automatically detect and use the new language

## Error Handling

The system includes robust error handling:

- **Translation Failure**: Falls back to original English text
- **Missing Language**: Defaults to English
- **Missing Translation Keys**: Uses the original text
- **Database Errors**: Logs error and continues with original text

## Performance Considerations

- **Caching**: User language preferences are cached to avoid repeated database calls
- **Async Processing**: Translation happens asynchronously to avoid blocking notification creation
- **Fallback Strategy**: Quick fallback to English ensures notifications are always delivered

## Testing

To test the notification translation system:

```bash
# Run the test script
node test-notification-translations.js
```

This will test all notification types in all supported languages.

## Future Enhancements

- **Real-time Language Switching**: Update notifications when user changes language
- **Custom Business Messages**: Allow businesses to customize notification messages
- **A/B Testing**: Test different notification message formats
- **Analytics**: Track which languages are most used for notifications

## Troubleshooting

### Common Issues

1. **Notifications not translating**: Check if `translate: true` is set in the notification call
2. **Wrong language**: Verify user language settings in customer/business settings
3. **Missing translations**: Check if translation keys exist in `src/i18n/index.ts`
4. **Parameter interpolation**: Ensure data object contains required parameters

### Debug Mode

Enable debug logging to see translation process:

```typescript
// In NotificationTranslationService
console.log('Translating notification:', { title, message, language });
console.log('Translated result:', { title: translatedTitle, message: translatedMessage });
```

## Conclusion

The notification translation system provides a seamless multilingual experience for customers, ensuring that all notifications are displayed in their preferred language while maintaining system reliability and performance.