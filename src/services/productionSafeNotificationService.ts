// PRODUCTION-SAFE Business Notification Service
// Uses API endpoints in production and falls back to direct DB service in development

import { ProductionSafeService } from '../utils/productionApiClient';
import { NotificationService } from './notificationService';

const isProduction = !import.meta.env.DEV && import.meta.env.MODE !== 'development';

export const ProductionSafeNotificationService = {
  async getBusinessRedemptionNotifications(businessId: string) {
    if (isProduction) {
      console.log('🔒 Production mode: Getting business notifications via API');
      const res = await fetch(`/api/business/${businessId}/redemption-notifications`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Failed to load business notifications: ${res.status}`);
      const data = await res.json();
      return data;
    }

    console.log('🔓 Development mode: Getting business notifications via direct DB');
    return await (NotificationService as any).getBusinessRedemptionNotifications?.(businessId);
  },
};
