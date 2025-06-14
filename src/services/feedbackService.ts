import { API_BASE_URL } from '../env';
import api from '../api/api';

export interface FeedbackData {
  customerId?: string | number;
  businessId?: string | number;
  transactionId?: string | number;
  transactionType: 'reward' | 'redemption' | 'enrollment' | 'visit';
  rating: number;
  comment?: string;
  timestamp: string;
}

export interface FeedbackStats {
  averageRating: number;
  totalFeedback: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentFeedback: FeedbackData[];
}

export class FeedbackService {
  async submitFeedback(data: {
    rating: number;
    comment?: string;
    category?: string;
    userId?: string | number;
    page?: string;
    timestamp?: string;
  }): Promise<boolean> {
    try {
      // Add timestamp if not provided
      const timestamp = data.timestamp || new Date().toISOString();
      
      const response = await api.post('/feedback', {
        ...data,
        timestamp
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  }
  
  /**
   * Submit error report
   */
  async reportError(data: {
    error: string;
    context?: any;
    userId?: string | number;
    page?: string;
    timestamp?: string;
  }): Promise<boolean> {
    try {
      // Add timestamp if not provided
      const timestamp = data.timestamp || new Date().toISOString();
      
      const response = await api.post('/errors/report', {
        ...data,
        timestamp
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Error submitting error report:', error);
      return false;
    }
  }
  
  /**
   * Log QR code scan for analytics
   * This method is called from QRScanner component
   */
  async logScan(data: {
    timestamp: string;
    type: string;
    business_id: string;
    customer_id: string;
    card_number?: string;
    points_awarded?: number;
    status: string;
    scan_duration_ms?: number;
    program_id?: string;
    device_info?: string;
    error?: string;
  }): Promise<boolean> {
    try {
      const response = await api.post('/analytics/scan', data);
      return response.status === 200;
    } catch (error) {
      console.error('Error logging scan:', error);
      return false;
    }
  }

  async getBusinessFeedback(businessId: string | number, period: 'week' | 'month' | 'year' = 'month'): Promise<FeedbackStats> {
    try {
      const response = await api.get(`/feedback/business/${businessId}?period=${period}`);
      
      if (response.status !== 200) {
        throw new Error(response.error || `Error fetching business feedback: ${response.status}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch business feedback:', error);
      throw error;
    }
  }

  async getCustomerFeedbackHistory(customerId: string | number): Promise<FeedbackData[]> {
    try {
      const response = await api.get(`/feedback/customer/${customerId}`);
      
      if (response.status !== 200) {
        throw new Error(response.error || `Error fetching customer feedback history: ${response.status}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch customer feedback history:', error);
      throw error;
    }
  }

  async respondToFeedback(feedbackId: string | number, responseText: string): Promise<{ success: boolean }> {
    try {
      const response = await api.post(`/feedback/${feedbackId}/respond`, { response: responseText });
      
      if (response.status !== 200) {
        throw new Error(response.error || `Error responding to feedback: ${response.status}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to respond to feedback:', error);
      throw error;
    }
  }
}

export const feedbackService = new FeedbackService(); 