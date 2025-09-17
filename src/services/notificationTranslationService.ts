import { TFunction } from 'react-i18next';
import { CustomerSettingsService } from './customerSettingsService';
import { BusinessSettingsService } from './businessSettingsService';

/**
 * Service for translating notification messages based on user language settings
 */
export class NotificationTranslationService {
  
  /**
   * Get the user's language preference from settings
   * @param userId The user ID
   * @param userType The user type ('customer' or 'business')
   * @returns The user's language preference or 'en' as default
   */
  static async getUserLanguage(userId: string, userType: 'customer' | 'business'): Promise<string> {
    try {
      if (userType === 'customer') {
        const settings = await CustomerSettingsService.getSettings(userId);
        return settings?.language || 'en';
      } else {
        const settings = await BusinessSettingsService.getSettings(userId);
        return settings?.language || 'en';
      }
    } catch (error) {
      console.error('Error getting user language:', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Translate notification message based on user language
   * @param title The notification title
   * @param message The notification message
   * @param userId The user ID
   * @param userType The user type ('customer' or 'business')
   * @param data Additional data for interpolation
   * @returns Translated title and message
   */
  static async translateNotification(
    title: string,
    message: string,
    userId: string,
    userType: 'customer' | 'business',
    data?: Record<string, any>
  ): Promise<{ title: string; message: string }> {
    try {
      // Get user language
      const language = await this.getUserLanguage(userId, userType);
      
      // If English, return original
      if (language === 'en') {
        return { title, message };
      }

      // Import i18n resources based on language
      const { resources } = await import('../i18n');
      const translations = resources[language]?.translation;
      
      if (!translations) {
        console.warn(`No translations found for language: ${language}`);
        return { title, message };
      }

      // Create a simple translation function
      const t = (key: string, params?: Record<string, any>): string => {
        let translation = translations[key] || key;
        
        // Replace parameters
        if (params) {
          Object.keys(params).forEach(param => {
            translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), params[param] || '');
          });
        }
        
        return translation;
      };

      // Translate based on content patterns
      const translatedTitle = this.translateTitle(title, t, data);
      const translatedMessage = this.translateMessage(message, t, data);

      return {
        title: translatedTitle,
        message: translatedMessage
      };
    } catch (error) {
      console.error('Error translating notification:', error);
      return { title, message };
    }
  }

  /**
   * Translate notification title based on content patterns
   */
  private static translateTitle(
    title: string,
    t: TFunction,
    data?: Record<string, any>
  ): string {
    // Program enrollment request
    if (title.includes('Program Enrollment Request')) {
      return t('programEnrollmentRequest');
    }

    // Points deduction request
    if (title.includes('Points Deduction Request')) {
      return t('pointsDeductionRequest');
    }

    // Reward redeemed successfully
    if (title.includes('🎉 Reward Redeemed Successfully!')) {
      return t('rewardRedeemedSuccessfully');
    }

    // Loyalty card created
    if (title.includes('Loyalty Card Created')) {
      return t('loyaltyCardCreated');
    }

    // Program joined
    if (title.includes('Program Joined')) {
      return t('programJoined');
    }

    // Program declined
    if (title.includes('Program Declined')) {
      return t('programDeclined');
    }

    // Customer joined program
    if (title.includes('Customer Joined Program')) {
      return t('customerJoinedProgram');
    }

    // Enrollment declined
    if (title.includes('Enrollment Declined')) {
      return t('enrollmentDeclined');
    }

    // Points deduction approved
    if (title.includes('Points Deduction Approved')) {
      return t('pointsDeductionApproved');
    }

    // Points deduction declined
    if (title.includes('Points Deduction Declined')) {
      return t('pointsDeductionDeclined');
    }

    // Default: return original title
    return title;
  }

  /**
   * Translate notification message based on content patterns
   */
  private static translateMessage(
    message: string,
    t: TFunction,
    data?: Record<string, any>
  ): string {
    // Extract parameters from the original message for translation
    const params = this.extractParams(message, data);

    // Reward is ready with tracking code
    if (message.includes('is ready! Show this code to redeem:')) {
      return t('yourRewardIsReady', {
        rewardName: params.rewardName || t('aReward'),
        trackingCode: params.trackingCode
      });
    }

    // Loyalty card is ready
    if (message.includes('Your loyalty card for') && message.includes('is ready')) {
      return t('yourLoyaltyCardIsReady', {
        programName: params.programName,
        businessName: params.businessName
      });
    }

    // Loyalty card created successfully
    if (message.includes('Your loyalty card was created successfully')) {
      return t('loyaltyCardCreatedSuccessfully');
    }

    // You joined program
    if (message.includes("You've joined") && message.includes("program")) {
      return t('youJoinedProgram', {
        businessName: params.businessName,
        programName: params.programName
      });
    }

    // You declined program
    if (message.includes("You've declined to join") && message.includes("program")) {
      return t('youDeclinedProgram', {
        businessName: params.businessName,
        programName: params.programName
      });
    }

    // Customer joined your program
    if (message.includes('A customer has joined your') && message.includes('program')) {
      return t('customerJoinedYourProgram', {
        programName: params.programName
      });
    }

    // Customer declined enrollment
    if (message.includes('A customer has declined to join your') && message.includes('program')) {
      return t('customerDeclinedEnrollment', {
        programName: params.programName
      });
    }

    // You approved points deduction
    if (message.includes("You've approved the deduction of") && message.includes("points")) {
      return t('youApprovedPointsDeduction', {
        points: params.points
      });
    }

    // You declined points deduction
    if (message.includes("You've declined the deduction of") && message.includes("points")) {
      return t('youDeclinedPointsDeduction', {
        points: params.points
      });
    }

    // Customer approved points deduction
    if (message.includes('Customer approved deduction of') && message.includes('points')) {
      return t('customerApprovedPointsDeduction', {
        points: params.points
      });
    }

    // Customer declined points deduction
    if (message.includes('Customer declined deduction of') && message.includes('points')) {
      return t('customerDeclinedPointsDeduction', {
        points: params.points
      });
    }

    // Default: return original message
    return message;
  }

  /**
   * Extract parameters from notification content for translation
   */
  private static extractParams(
    message: string,
    data?: Record<string, any>
  ): Record<string, any> {
    const params: Record<string, any> = { ...data };

    // Extract points from message
    const pointsMatch = message.match(/(\d+)\s*points?/i);
    if (pointsMatch) {
      params.points = pointsMatch[1];
    }

    // Extract business name from message
    const businessMatch = message.match(/at\s+([^.!?]+)/i) || 
                         message.match(/by\s+([^.!?]+)/i) ||
                         message.match(/scanned\s+by\s+([^.!?]+)/i) ||
                         message.match(/'s\s+([^.!?]+)\s+program/i);
    if (businessMatch) {
      params.businessName = businessMatch[1].trim();
    }

    // Extract program name from message
    const programMatch = message.match(/program\s+"([^"]+)"/i) ||
                        message.match(/program\s+([^.!?]+)/i) ||
                        message.match(/for\s+([^.!?]+)\s+at/i);
    if (programMatch) {
      params.programName = programMatch[1].trim();
    }

    // Extract reward name from message
    const rewardMatch = message.match(/Your\s+([^.!?]+?)\s+is\s+ready/i);
    if (rewardMatch) {
      params.rewardName = rewardMatch[1].trim();
    }

    // Extract tracking code from message
    const trackingMatch = message.match(/redeem:\s+([A-Z0-9]+)/i);
    if (trackingMatch) {
      params.trackingCode = trackingMatch[1];
    }

    return params;
  }
}