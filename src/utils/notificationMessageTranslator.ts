import { TFunction } from 'react-i18next';

/**
 * Utility to translate notification messages based on their content
 * This allows us to translate notification content without modifying service files
 */
export class NotificationMessageTranslator {
  /**
   * Translate notification title and message based on content patterns
   */
  static translateNotification(
    title: string,
    message: string,
    t: TFunction,
    data?: Record<string, any>
  ): { title: string; message: string } {
    // Extract parameters from the original message for translation
    const params = this.extractParams(title, message, data);
    
    // Translate based on content patterns
    const translatedTitle = this.translateTitle(title, t, params);
    const translatedMessage = this.translateMessage(message, t, params);
    
    return {
      title: translatedTitle,
      message: translatedMessage
    };
  }

  /**
   * Extract parameters from notification content for translation
   */
  private static extractParams(
    title: string,
    message: string,
    data?: Record<string, any>
  ): Record<string, any> {
    const params: Record<string, any> = { ...data };

    // Extract points from title or message
    const pointsMatch = (title + ' ' + message).match(/(\d+)\s*points?/i);
    if (pointsMatch) {
      params.points = pointsMatch[1];
    }

    // Extract business name from message
    const businessMatch = message.match(/at\s+([^.!?]+)/i) || 
                         message.match(/by\s+([^.!?]+)/i) ||
                         message.match(/scanned\s+by\s+([^.!?]+)/i);
    if (businessMatch) {
      params.businessName = businessMatch[1].trim();
    }

    // Extract program name from message
    const programMatch = message.match(/program\s+"([^"]+)"/i) ||
                        message.match(/program\s+([^.!?]+)/i);
    if (programMatch) {
      params.programName = programMatch[1].trim();
    }

    // Extract reward name from message
    const rewardMatch = message.match(/redeemed\s+([^.!?]+?)\s+for/i);
    if (rewardMatch) {
      params.rewardName = rewardMatch[1].trim();
    }

    // Extract error message
    const errorMatch = message.match(/\.\s*([^.!?]+)$/);
    if (errorMatch && message.includes('problem')) {
      params.errorMessage = errorMatch[1].trim();
    }

    return params;
  }

  /**
   * Translate notification title based on content patterns
   */
  private static translateTitle(
    title: string,
    t: TFunction,
    params: Record<string, any>
  ): string {
    // Points earned patterns
    if (title.includes('earned') && title.includes('points')) {
      return t('notifications.youEarnedPoints', { points: params.points });
    }

    // QR code scanned patterns
    if (title.includes('QR Code Scanned Successfully')) {
      return t('notifications.qrCodeScannedSuccessfully');
    }
    if (title.includes('QR Code Scan Failed')) {
      return t('notifications.qrCodeScanFailed');
    }
    if (title.includes('QR Code Scanned')) {
      return t('notifications.qrCodeScanned');
    }

    // Program discontinued
    if (title.includes('Program Discontinued')) {
      return t('notifications.programDiscontinued');
    }

    // Reward redeemed
    if (title.includes('redeemed a reward')) {
      return t('notifications.youRedeemedReward');
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
    params: Record<string, any>
  ): string {
    // Points earned at business patterns
    if (message.includes("You've earned") && message.includes("points at") && message.includes("program")) {
      return t('notifications.youEarnedPointsAt', {
        points: params.points,
        businessName: params.businessName,
        programName: params.programName
      });
    }

    // Points earned at business (simple)
    if (message.includes("You earned") && message.includes("points at") && !message.includes("program")) {
      return t('notifications.youEarnedPointsAtBusiness', {
        points: params.points,
        businessName: params.businessName
      });
    }

    // QR code scanned by business
    if (message.includes("Your QR code was scanned by")) {
      return t('notifications.qrCodeScannedBy', {
        businessName: params.businessName
      });
    }

    // QR code successfully scanned
    if (message.includes("Your QR code was successfully scanned at")) {
      return t('notifications.qrCodeSuccessfullyScanned', {
        businessName: params.businessName
      });
    }

    // QR code scan problem
    if (message.includes("There was a problem scanning your QR code")) {
      return t('notifications.qrCodeScanProblem', {
        businessName: params.businessName,
        errorMessage: params.errorMessage || ''
      });
    }

    // Program discontinued
    if (message.includes("loyalty program") && message.includes("discontinued")) {
      return t('notifications.programDiscontinuedMessage', {
        programName: params.programName,
        businessName: params.businessName
      });
    }

    // Reward redeemed
    if (message.includes("You've redeemed") && message.includes("for") && message.includes("points")) {
      return t('notifications.youRedeemedRewardFor', {
        rewardName: params.rewardName || t('notifications.aReward'),
        points: params.points,
        businessName: params.businessName
      });
    }

    // New enrollment
    if (message.includes("New enrollment in")) {
      return t('notifications.newEnrollmentIn', {
        programName: params.programName
      });
    }

    // Default: return original message
    return message;
  }
}