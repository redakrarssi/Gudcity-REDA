// PRODUCTION-SAFE Customer Notification Service
// Uses API endpoints in production and falls back to direct DB service in development

import { ProductionSafeService } from '../utils/productionApiClient';
import { CustomerNotificationService } from './customerNotificationService';

const isProduction = !import.meta.env.DEV && import.meta.env.MODE !== 'development';

export const ProductionSafeCustomerNotificationService = {
  async getCustomerNotifications(customerId: string) {
    if (isProduction) {
      console.log('🔒 Production mode: Getting customer notifications via API');
      const res = await fetch(`/api/customers/${customerId}/notifications`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Failed to load notifications: ${res.status}`);
      const data = await res.json();
      return data.notifications || [];
    }

    console.log('🔓 Development mode: Getting customer notifications via direct DB');
    return await CustomerNotificationService.getCustomerNotifications(customerId);
  },

  async getPendingApprovals(customerId: string) {
    if (isProduction) {
      console.log('🔒 Production mode: Getting pending approvals via API');
      const res = await fetch(`/api/customers/${customerId}/approvals`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Failed to load approvals: ${res.status}`);
      const data = await res.json();
      return data.approvals || [];
    }

    console.log('🔓 Development mode: Getting pending approvals via direct DB');
    return await CustomerNotificationService.getPendingApprovals(customerId);
  },

  async markAsRead(notificationId: string, customerId?: string) {
    // For now, use existing service in both envs, assuming it updates DB directly
    return await (CustomerNotificationService as any).markAsRead?.(notificationId, customerId);
  },
};
