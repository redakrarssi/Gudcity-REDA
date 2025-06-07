import { API_BASE_URL } from '../env';

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

class FeedbackService {
  async submitFeedback(feedbackData: FeedbackData): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        throw new Error(`Error submitting feedback: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }

  async getBusinessFeedback(businessId: string | number, period: 'week' | 'month' | 'year' = 'month'): Promise<FeedbackStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback/business/${businessId}?period=${period}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching business feedback: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch business feedback:', error);
      throw error;
    }
  }

  async getCustomerFeedbackHistory(customerId: string | number): Promise<FeedbackData[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback/customer/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching customer feedback history: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch customer feedback history:', error);
      throw error;
    }
  }

  async respondToFeedback(feedbackId: string | number, response: string): Promise<{ success: boolean }> {
    try {
      const responseObj = await fetch(`${API_BASE_URL}/api/feedback/${feedbackId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ response })
      });

      if (!responseObj.ok) {
        throw new Error(`Error responding to feedback: ${responseObj.statusText}`);
      }

      return await responseObj.json();
    } catch (error) {
      console.error('Failed to respond to feedback:', error);
      throw error;
    }
  }
}

export const feedbackService = new FeedbackService(); 